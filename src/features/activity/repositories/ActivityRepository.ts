import { supabase } from '../../../lib/supabase';
import { executeQuery } from '../../../lib/apiClient';
import { logger } from '../../../lib/logger';
import type { ActivityProgress, ActivityGoal } from '../../../types/digitalHealthRecord';

export class ActivityRepository {
  /**
   * Fetch user's current daily targets from user_activity_goals.
   * If none exists, falls back to default values.
   */
  static async fetchActivityGoal(userId: string): Promise<ActivityGoal> {
    try {
      const { data, error } = await executeQuery<any>(
        supabase.from('user_activity_goals')
          .select('daily_steps, daily_minutes, daily_calories')
          .eq('user_id', userId)
          .maybeSingle(),
        { isIdempotent: true }
      );

      if (error) throw error;
      if (data) {
        return {
          daily_steps: data.daily_steps,
          daily_minutes: data.daily_minutes,
          daily_calories: data.daily_calories
        };
      }
    } catch (e) {
      logger.error('[ActivityRepository] failed to fetch goal:', e);
    }
    
    // Default fallback values
    return {
      daily_steps: 10000,
      daily_minutes: 30,
      daily_calories: 300
    };
  }

  /**
   * Save user's targets in user_activity_goals.
   */
  static async saveActivityGoal(userId: string, goal: Partial<ActivityGoal>): Promise<void> {
    try {
      const { error } = await executeQuery(
        supabase.from('user_activity_goals')
          .upsert({
            user_id: userId,
            daily_steps: goal.daily_steps ?? 10000,
            daily_minutes: goal.daily_minutes ?? 30,
            daily_calories: goal.daily_calories ?? 300,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })
      );
      if (error) throw error;
    } catch (e) {
      logger.error('[ActivityRepository] failed to save goal:', e);
      throw e;
    }
  }

  /**
   * Fetch daily activity log from activity_logs.
   * Falls back to a clean zero-progress model if record doesn't exist.
   */
  static async fetchDailyActivity(userId: string, date: string): Promise<ActivityProgress> {
    try {
      const { data, error } = await executeQuery<any>(
        supabase.from('activity_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('date', date)
          .maybeSingle(),
        { isIdempotent: true }
      );

      if (error) throw error;
      if (data) {
        return {
          steps: data.steps,
          distance: Number(data.distance),
          active_minutes: data.active_minutes,
          calories: Number(data.calories),
          walking_minutes: data.walking_minutes,
          running_minutes: data.running_minutes,
          cycling_minutes: data.cycling_minutes,
          source: data.source as any
        };
      }
    } catch (e) {
      logger.error('[ActivityRepository] failed to fetch daily activity:', e);
    }

    return {
      steps: 0,
      distance: 0,
      active_minutes: 0,
      calories: 0,
      walking_minutes: 0,
      running_minutes: 0,
      cycling_minutes: 0,
      source: 'Pedometer'
    };
  }

  /**
   * Persist daily activity progress inside activity_logs table.
   * Goal parameters are snapshotted in the log to preserve historical goals.
   */
  static async saveDailyActivity(
    userId: string, 
    date: string, 
    data: Partial<ActivityProgress>,
    goalSteps = 10000,
    goalMinutes = 30
  ): Promise<void> {
    try {
      const { error } = await executeQuery(
        supabase.from('activity_logs')
          .upsert({
            user_id: userId,
            date,
            steps: data.steps ?? 0,
            distance: data.distance ?? 0,
            active_minutes: data.active_minutes ?? 0,
            calories: data.calories ?? 0,
            walking_minutes: data.walking_minutes ?? 0,
            running_minutes: data.running_minutes ?? 0,
            cycling_minutes: data.cycling_minutes ?? 0,
            goal_steps: goalSteps,
            goal_minutes: goalMinutes,
            source: data.source ?? 'Pedometer',
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,date' })
      );
      if (error) throw error;
    } catch (e) {
      logger.error('[ActivityRepository] failed to save daily activity:', e);
      throw e;
    }
  }

  /**
   * Query steps logs for the past 7 days.
   */
  static async getWeeklyActivity(userId: string, endDateStr: string): Promise<any[]> {
    try {
      const start = new Date(endDateStr);
      start.setDate(start.getDate() - 6);
      const startStr = start.toISOString().split('T')[0];

      const { data, error } = await executeQuery<any[]>(
        supabase.from('activity_logs')
          .select('date, steps, calories, active_minutes, goal_steps')
          .eq('user_id', userId)
          .gte('date', startStr)
          .lte('date', endDateStr)
          .order('date', { ascending: true }),
        { isIdempotent: true }
      );
      if (error) throw error;
      return data || [];
    } catch (e) {
      logger.error('[ActivityRepository] failed to get weekly activity:', e);
      return [];
    }
  }

  /**
   * Query steps logs for the past 30 days.
   */
  static async getMonthlyActivity(userId: string, endDateStr: string): Promise<any[]> {
    try {
      const start = new Date(endDateStr);
      start.setDate(start.getDate() - 29);
      const startStr = start.toISOString().split('T')[0];

      const { data, error } = await executeQuery<any[]>(
        supabase.from('activity_logs')
          .select('date, steps, calories, active_minutes, goal_steps')
          .eq('user_id', userId)
          .gte('date', startStr)
          .lte('date', endDateStr)
          .order('date', { ascending: true }),
        { isIdempotent: true }
      );
      if (error) throw error;
      return data || [];
    } catch (e) {
      logger.error('[ActivityRepository] failed to get monthly activity:', e);
      return [];
    }
  }

  /**
   * Compute user's average steps over a given number of days.
   */
  static async getAverageSteps(userId: string, daysLimit = 30): Promise<number> {
    try {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - (daysLimit - 1));
      
      const startStr = start.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];

      const { data, error } = await executeQuery<any[]>(
        supabase.from('activity_logs')
          .select('steps')
          .eq('user_id', userId)
          .gte('date', startStr)
          .lte('date', todayStr),
        { isIdempotent: true }
      );

      if (error) throw error;
      if (data && data.length > 0) {
        const total = data.reduce((sum, row) => sum + (row.steps || 0), 0);
        return Math.round(total / data.length);
      }
    } catch (e) {
      logger.error('[ActivityRepository] failed to calculate average steps:', e);
    }
    return 0;
  }
}
