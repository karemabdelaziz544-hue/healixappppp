import { AppCache } from '../../../lib/cache';
import { logger } from '../../../lib/logger';
import type { DigitalHealthRecord } from '../../../types/digitalHealthRecord';

export interface TriggerState {
  completedMealsCount: number;
  waterPercent: number; // e.g. 0, 50, 100
  isWorkoutCompleted: boolean;
  inbodyDate: string | null;
  planId: string | null;
  timeSlot: 'morning' | 'afternoon' | 'evening';
}

export class HealixAITriggerManager {
  private static MAX_DAILY_CALLS = 3;

  /**
   * Computes the current time slot based on local hour.
   */
  public static getTimeSlot(): 'morning' | 'afternoon' | 'evening' {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    return 'evening';
  }

  /**
   * Extracts the meaningful trigger state snapshot from a DigitalHealthRecord.
   */
  public static getSnapshot(dhr: DigitalHealthRecord): TriggerState {
    const todayMeals = dhr.meals.todayMeals || [];
    const completedMealsCount = todayMeals.filter(m => m.is_completed).length;

    const consumedLiters = dhr.water.consumedLiters || 0;
    const targetLiters = dhr.water.targetLiters || 2.5;
    const waterRatio = targetLiters > 0 ? consumedLiters / targetLiters : 0;
    let waterPercent = 0;
    if (waterRatio >= 1.0) waterPercent = 100;
    else if (waterRatio >= 0.5) waterPercent = 50;

    const todayWorkouts = dhr.workouts?.todayWorkouts || [];
    const isWorkoutCompleted = todayWorkouts.length > 0 && todayWorkouts.every(w => w.is_completed);

    const inbodyDate = dhr.inbody?.record_date || null;
    const planId = dhr.meals.activePlan?.id || null;

    return {
      completedMealsCount,
      waterPercent,
      isWorkoutCompleted,
      inbodyDate,
      planId,
      timeSlot: this.getTimeSlot(),
    };
  }

  /**
   * Generates a deterministic hash string for a trigger state.
   */
  public static generateStateHash(userId: string, state: TriggerState): string {
    return `U_${userId}_M${state.completedMealsCount}_W${state.waterPercent}_WK${state.isWorkoutCompleted ? 1 : 0}_IB${state.inbodyDate || 'none'}_PL${state.planId || 'none'}_TS${state.timeSlot}`;
  }

  /**
   * Evaluates if a meaningful change occurred compared to saved state, or if initial daily login.
   */
  public static async shouldTriggerAICall(
    userId: string,
    todayStr: string,
    dhr: DigitalHealthRecord,
    force = false
  ): Promise<{ shouldCall: boolean; reason: string }> {
    if (force) {
      return { shouldCall: true, reason: 'forced' };
    }

    const stateKey = `healix_ai_trigger_${userId}_${todayStr}`;
    const currentState = this.getSnapshot(dhr);
    const currentHash = this.generateStateHash(userId, currentState);

    const previousHash = await AppCache.get<string>(stateKey);

    if (!previousHash) {
      return { shouldCall: true, reason: 'initial_daily_login' };
    }

    if (currentHash !== previousHash) {
      logger.log(`[HealixAITriggerManager] Meaningful change detected for user ${userId}. Prev: ${previousHash} -> New: ${currentHash}`);
      return { shouldCall: true, reason: 'meaningful_event_change' };
    }

    return { shouldCall: false, reason: 'no_meaningful_change' };
  }

  /**
   * Records an AI call generation event and updates persistent cache.
   */
  public static async recordAICall(
    userId: string,
    todayStr: string,
    dhr: DigitalHealthRecord,
    newTip: string
  ): Promise<void> {
    const stateKey = `healix_ai_trigger_${userId}_${todayStr}`;
    const countKey = `healix_ai_quota_${userId}_${todayStr}`;
    const cacheKey = `healix_ai_dashboard_${userId}_${todayStr}`;
    const historyKey = `healix_ai_history_${userId}`;

    const currentState = this.getSnapshot(dhr);
    const currentHash = this.generateStateHash(userId, currentState);

    const callCount = (await AppCache.get<number>(countKey)) || 0;

    await AppCache.set(stateKey, currentHash);
    await AppCache.set(countKey, callCount + 1);
    await AppCache.set(cacheKey, newTip);

    // Save into last 3 tips history for anti-repetition check
    const history = (await AppCache.get<string[]>(historyKey)) || [];
    const updatedHistory = [newTip, ...history].slice(0, 3);
    await AppCache.set(historyKey, updatedHistory);
  }

  /**
   * Calculates similarity index between two text strings to prevent exact repetition.
   */
  public static isDuplicateResponse(newTip: string, history: string[]): boolean {
    if (!newTip || history.length === 0) return false;

    const normalize = (str: string) => str.replace(/[^\u0621-\u064A0-9\s]/g, '').trim();
    const cleanNew = normalize(newTip);

    for (const pastTip of history) {
      const cleanPast = normalize(pastTip);
      if (cleanNew === cleanPast) return true;

      // Jaccard word set overlap
      const setA = new Set(cleanNew.split(/\s+/));
      const setB = new Set(cleanPast.split(/\s+/));
      const intersection = new Set([...setA].filter(x => setB.has(x)));
      const union = new Set([...setA, ...setB]);
      const similarity = union.size > 0 ? intersection.size / union.size : 0;

      if (similarity >= 0.8) {
        return true;
      }
    }
    return false;
  }
}
