import { supabase } from '../../../lib/supabase';
import { executeQuery } from '../../../lib/apiClient';
import { logger } from '../../../lib/logger';
import { AppCache } from '../../../lib/cache';
import { ActivityEventEmitter } from './ActivityEventEmitter';

const MILESTONES = [1000, 3000, 5000, 8000, 10000];

export class MilestonesEngine {
  private static isInitialized = false;
  private static unsubscribe: (() => void) | null = null;

  /**
   * Initialize subscriber listening to step count updates.
   */
  static initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.unsubscribe = ActivityEventEmitter.subscribe('ActivityUpdated', async (payload: { userId: string; date: string; steps: number }) => {
      await this.evaluateMilestones(payload.userId, payload.date, payload.steps);
    });
  }

  /**
   * Stop subscription.
   */
  static shutdown(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.isInitialized = false;
  }

  /**
   * Evaluate step progress against targets and log achievements.
   */
  private static async evaluateMilestones(userId: string, date: string, steps: number): Promise<void> {
    try {
      const cacheKey = `milestones_${userId}_${date}`;
      const loggedMilestones = (await AppCache.get<number[]>(cacheKey)) || [];

      // Find all milestones reached that haven't been logged today yet
      const pendingMilestones = MILESTONES.filter(m => steps >= m && !loggedMilestones.includes(m));
      if (pendingMilestones.length === 0) return;

      // Log the highest milestone reached in this batch
      const highestNewMilestone = Math.max(...pendingMilestones);
      logger.log(`[MilestonesEngine] User ${userId} achieved milestone: ${highestNewMilestone} steps`);

      const { error } = await executeQuery(
        supabase.from('medical_audit_log').insert([{
          profile_id: userId,
          action: 'INSERT',
          table_name: 'activity_logs',
          record_id: '00000000-0000-0000-0000-000000000000',
          occurred_at: new Date().toISOString()
        }])
      );

      if (error) throw error;

      // Add to logged milestones cache
      const updatedMilestones = [...loggedMilestones, highestNewMilestone];
      await AppCache.set(cacheKey, updatedMilestones);

      // Trigger achievement notifications event
      ActivityEventEmitter.emit('MilestoneLogged', { userId, date, milestone: highestNewMilestone });
    } catch (err) {
      logger.error('[MilestonesEngine] failed evaluating milestones:', err);
    }
  }
}
