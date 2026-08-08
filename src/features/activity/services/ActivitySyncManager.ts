import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityService } from './ActivityService';
import { ActivityRepository } from '../repositories/ActivityRepository';
import { ActivityEventEmitter } from './ActivityEventEmitter';
import { AppCache } from '../../../lib/cache';
import { logger } from '../../../lib/logger';
import type { ActivityProgress } from '../../../types/digitalHealthRecord';

const SYNC_STEP_THRESHOLD = 50;
const SYNC_TIME_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export class ActivitySyncManager {
  private static userId: string | null = null;
  private static activeDate: string | null = null;
  
  private static localSteps = 0;
  private static lastSyncedSteps = 0;
  private static lastSyncedTime = 0;

  private static sensorSubscription: { remove: () => void } | null = null;
  private static appStateSubscription: any = null;

  /**
   * Start tracking activity and initialize batch synchronization.
   */
  static async start(userId: string, date: string): Promise<void> {
    if (this.userId === userId && this.activeDate === date) {
      await this.refreshSteps();
      return;
    }
    
    // Shutdown previous subscriptions if any
    this.stop();

    this.userId = userId;
    this.activeDate = date;
    this.lastSyncedTime = Date.now();

    // 1. Run one-time 30-day historical sync if not performed yet
    this.syncHistorical30DaysIfNeeded(userId);

    // 2. Fetch initial activity and goals from Supabase
    const dbActivity = await ActivityRepository.fetchDailyActivity(userId, date);
    this.localSteps = dbActivity.steps || 0;
    this.lastSyncedSteps = dbActivity.steps || 0;

    // 3. Refresh absolute step count for today (midnight to now)
    await this.refreshSteps();

    // Emit initial update
    ActivityEventEmitter.emit('ActivityUpdated', { userId, date, steps: this.localSteps });

    // 4. Listen to live sensor stream in the foreground
    const isSensorAvail = await ActivityService.isAvailable();
    if (isSensorAvail) {
      this.sensorSubscription = ActivityService.watchSteps(async () => {
        await this.refreshSteps();
      });
    }

    // 5. Subscribe to AppState changes (Sync when app closes / moves to background / becomes active)
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    
    logger.log(`[ActivitySyncManager] Started tracking steps using provider (${ActivityService.getActiveProviderName()}) for user: ${userId} (Steps: ${this.localSteps})`);
  }

  private static lastRefreshTime = 0;
  private static readonly REFRESH_THROTTLE_MS = 3000; // 3 seconds minimum throttle

  /**
   * Refreshes the absolute step count for today from active provider.
   */
  private static async refreshSteps(force = false): Promise<void> {
    if (!this.userId || !this.activeDate) return;

    const nowMs = Date.now();
    if (!force && nowMs - this.lastRefreshTime < this.REFRESH_THROTTLE_MS) {
      return;
    }
    this.lastRefreshTime = nowMs;

    try {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const now = new Date();

      const sensorSteps = await ActivityService.getStepsForPeriod(midnight, now);

      if (sensorSteps > 0 && sensorSteps !== this.localSteps) {
        this.localSteps = Math.max(this.localSteps, sensorSteps);
        ActivityEventEmitter.emit('ActivityUpdated', { userId: this.userId, date: this.activeDate, steps: this.localSteps });
        await this.evaluateSyncCriteria();
      }
    } catch (e) {
      logger.error('[ActivitySyncManager] Error refreshing steps:', e);
    }
  }

  /**
   * One-time 30-day historical synchronization on initial authorization.
   * Processes days in controlled batches of 5 to avoid API rate limits or race conditions.
   */
  private static async syncHistorical30DaysIfNeeded(userId: string): Promise<void> {
    try {
      const syncFlagKey = `healix.apple_health_historical_synced.${userId}`;
      const isAlreadySynced = await AsyncStorage.getItem(syncFlagKey);
      if (isAlreadySynced === 'true') return;

      const isAvail = await ActivityService.isAvailable();
      if (!isAvail) return;

      logger.log(`[ActivitySyncManager] Performing one-time 30-day historical sync for user: ${userId}`);

      const goals = await ActivityRepository.fetchActivityGoal(userId);
      const today = new Date();

      // Fetch all steps serially or in small batches to not overwhelm HealthKit, but accumulate for a single DB upsert
      const bulkRecords: Array<any> = [];

      for (let i = 1; i <= 30; i++) {
        try {
          const dayStart = new Date(today);
          dayStart.setDate(today.getDate() - i);
          dayStart.setHours(0, 0, 0, 0);

          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);

          const dayDateStr = dayStart.toISOString().split('T')[0];
          const steps = await ActivityService.getStepsForPeriod(dayStart, dayEnd);

          if (steps > 0) {
            const strideLengthMeters = 0.76;
            const caloriesPerStep = 0.04;
            const activeMinutes = Math.round(steps / 100);

            bulkRecords.push({
              user_id: userId,
              date: dayDateStr,
              steps,
              distance: Number(((steps * strideLengthMeters) / 1000).toFixed(2)),
              active_minutes: activeMinutes,
              calories: Number((steps * caloriesPerStep).toFixed(1)),
              walking_minutes: activeMinutes,
              running_minutes: 0,
              cycling_minutes: 0,
              goal_steps: goals.daily_steps,
              goal_minutes: goals.daily_minutes,
              source: ActivityService.getActiveProviderName() as string
            });
          }
        } catch (dayErr) {
          logger.warn(`[ActivitySyncManager] Day ${i} historical sync warning:`, dayErr);
        }
      }

      if (bulkRecords.length > 0) {
        await ActivityRepository.saveDailyActivityBatch(bulkRecords);
      }

      await AsyncStorage.setItem(syncFlagKey, 'true');
      logger.log(`[ActivitySyncManager] Successfully completed 30-day historical sync for user: ${userId}`);
    } catch (e) {
      logger.error('[ActivitySyncManager] Historical sync failed:', e);
    }
  }

  /**
   * Stop tracking and clean up subscribers.
   */
  static stop(): void {
    this.sensorSubscription?.remove();
    this.sensorSubscription = null;

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.userId = null;
    this.activeDate = null;
  }

  /**
   * Access current tracking steps count.
   */
  static getSteps(): number {
    return this.localSteps;
  }

  /**
   * Handle AppState changes (forces sync when moving out of focus or returning active).
   */
  private static handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'inactive' || nextAppState === 'background' || nextAppState === 'active') {
      logger.log('[ActivitySyncManager] App state changed, triggering step sync check...');
      await this.refreshSteps();
      await this.syncToRemoteDatabase(true);
    }
  };

  /**
   * Evaluate if threshold step increments or time elapsed trigger a sync.
   */
  private static async evaluateSyncCriteria(): Promise<void> {
    const stepDiff = Math.abs(this.localSteps - this.lastSyncedSteps);
    const timeDiff = Date.now() - this.lastSyncedTime;

    if (stepDiff >= SYNC_STEP_THRESHOLD || timeDiff >= SYNC_TIME_THRESHOLD_MS) {
      await this.syncToRemoteDatabase(false);
    }
  }

  /**
   * Write step counts and computed activity details to Supabase.
   */
  private static async syncToRemoteDatabase(force = false): Promise<void> {
    if (!this.userId || !this.activeDate) return;
    
    const stepsToSync = this.localSteps;
    if (!force && stepsToSync === this.lastSyncedSteps) return;

    try {
      const strideLengthMeters = 0.76;
      const caloriesPerStep = 0.04;
      const stepsPerMinute = 100;

      const distanceKm = Number(((stepsToSync * strideLengthMeters) / 1000).toFixed(2));
      const caloriesBurned = Number((stepsToSync * caloriesPerStep).toFixed(1));
      const activeMinutes = Math.round(stepsToSync / stepsPerMinute);

      const progress: Partial<ActivityProgress> = {
        steps: stepsToSync,
        distance: distanceKm,
        active_minutes: activeMinutes,
        calories: caloriesBurned,
        walking_minutes: activeMinutes,
        source: ActivityService.getActiveProviderName() as any
      };

      const goals = await ActivityRepository.fetchActivityGoal(this.userId);

      // Save local cache backup FIRST
      await AppCache.set(`activity_log_${this.userId}_${this.activeDate}`, progress);

      await ActivityRepository.saveDailyActivity(
        this.userId,
        this.activeDate,
        progress,
        goals.daily_steps,
        goals.daily_minutes
      );

      this.lastSyncedSteps = stepsToSync;
      this.lastSyncedTime = Date.now();

      logger.log(`[ActivitySyncManager] Synced ${stepsToSync} steps using provider (${ActivityService.getActiveProviderName()}) to Supabase`);
    } catch (err: any) {
      if (err?.code === 'NETWORK' || err?.code === 'FORBIDDEN') {
        logger.warn('[ActivitySyncManager] Background step sync warning (cached locally):', err?.message || err);
      } else {
        logger.error('[ActivitySyncManager] Sync failed:', err);
      }
    }
  }
}
