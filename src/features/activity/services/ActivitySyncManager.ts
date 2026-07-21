import { AppState, type AppStateStatus } from 'react-native';
import { ActivityService } from './ActivityService';
import { ActivityRepository } from '../repositories/ActivityRepository';
import { ActivityEventEmitter } from './ActivityEventEmitter';
import { AppCache } from '../../../lib/cache';
import { logger } from '../../../lib/logger';
import type { ActivityProgress } from '../../../types/digitalHealthRecord';

const SYNC_STEP_THRESHOLD = 100;
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
    if (this.userId === userId && this.activeDate === date) return;
    
    // Shutdown previous subscriptions if any
    this.stop();

    this.userId = userId;
    this.activeDate = date;
    this.lastSyncedTime = Date.now();

    // 1. Fetch initial activity and goals from Supabase
    const dbActivity = await ActivityRepository.fetchDailyActivity(userId, date);
    this.localSteps = dbActivity.steps;
    this.lastSyncedSteps = dbActivity.steps;

    // 2. Query steps from device sensors for today (midnight to now)
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const sensorSteps = await ActivityService.getStepsForPeriod(midnight, new Date());
    
    // Take the maximum of database log and sensor steps
    if (sensorSteps > this.localSteps) {
      this.localSteps = sensorSteps;
      await this.syncToRemoteDatabase(true); // Sync immediately
    }

    // Emit initial update
    ActivityEventEmitter.emit('ActivityUpdated', { userId, date, steps: this.localSteps });

    // 3. Listen to live pedometer stream in the foreground
    const isSensorAvail = await ActivityService.isAvailable();
    if (isSensorAvail) {
      let initialSensorReport: number | null = null;
      
      this.sensorSubscription = ActivityService.watchSteps((newSteps) => {
        if (initialSensorReport === null) {
          initialSensorReport = newSteps;
          return;
        }
        
        // Pedometer returns steps walked *since subscription started*
        const delta = newSteps - (initialSensorReport || 0);
        if (delta > 0) {
          const currentTotal = this.lastSyncedSteps + delta;
          if (currentTotal > this.localSteps) {
            this.localSteps = currentTotal;
            ActivityEventEmitter.emit('ActivityUpdated', { userId, date, steps: this.localSteps });
            this.evaluateSyncCriteria();
          }
        }
      });
    }

    // 4. Subscribe to AppState changes (Sync when app closes / moves to background)
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    
    logger.log(`[ActivitySyncManager] Started tracking steps for user: ${userId} (Initial Steps: ${this.localSteps})`);
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
   * Handle AppState changes (forces sync when moving out of focus).
   */
  private static handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'inactive' || nextAppState === 'background') {
      logger.log('[ActivitySyncManager] App going to background, forcing steps sync...');
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
      // Calculate dynamic parameters based on step counts
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
        source: 'Pedometer'
      };

      // Fetch targets to snapshot goals
      const goals = await ActivityRepository.fetchActivityGoal(this.userId);

      await ActivityRepository.saveDailyActivity(
        this.userId,
        this.activeDate,
        progress,
        goals.daily_steps,
        goals.daily_minutes
      );

      this.lastSyncedSteps = stepsToSync;
      this.lastSyncedTime = Date.now();
      
      // Save local cache backup
      await AppCache.set(`activity_log_${this.userId}_${this.activeDate}`, progress);

      logger.log(`[ActivitySyncManager] Synced ${stepsToSync} steps to Supabase`);
    } catch (err) {
      logger.error('[ActivitySyncManager] Sync failed:', err);
    }
  }
}
