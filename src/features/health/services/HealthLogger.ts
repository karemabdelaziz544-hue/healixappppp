import { OfflineQueue } from '../../../lib/offlineQueue';
import { AppCache } from '../../../lib/cache';
import { logger } from '../../../lib/logger';

export type HealthMetricType = 'water' | 'sleep' | 'weight' | 'blood_pressure' | 'blood_glucose';

export class HealthLogger {
  /**
   * Log a health metric value optimistically and enqueue for server synchronization.
   */
  static async log(
    userId: string,
    metric: HealthMetricType,
    value: any,
    options?: { target?: number }
  ): Promise<any> {
    const recordedAt = new Date().toISOString();
    logger.log(`[HealthLogger] Logging metric ${metric} = ${value} for user ${userId}`);

    // 1. Update local cache optimistically
    if (metric === 'water') {
      const target = options?.target ?? 8;
      const cached = await AppCache.get<{ consumed: number; target: number }>(`water_${userId}`);
      const newAmount = (cached?.consumed ?? 0) + Number(value);
      await AppCache.set(`water_${userId}`, { consumed: newAmount, target });
    } else if (metric === 'sleep') {
      // Sleep cache format
      await AppCache.set(`sleep_${userId}`, { hours: value.hours, quality: value.quality, targetHours: value.targetHours || 8 });
    } else if (metric === 'weight') {
      await AppCache.set(`weight_${userId}`, { weight: value, recordedAt });
    }

    // 2. Queue background synchronization mutation
    try {
      await OfflineQueue.addMutation('health_log', userId, {
        metric,
        value,
        options,
        recordedAt
      });
    } catch (e) {
      logger.error('[HealthLogger] failed queueing health log mutation:', e);
    }

    return value;
  }

  /**
   * Revert or decrement the last health log metric.
   */
  static async undo(
    userId: string,
    metric: HealthMetricType,
    options?: { target?: number }
  ): Promise<any> {
    logger.log(`[HealthLogger] Undoing latest log for metric: ${metric} for user ${userId}`);

    // 1. Update local cache optimistically (revert values)
    if (metric === 'water') {
      const target = options?.target ?? 8;
      const cached = await AppCache.get<{ consumed: number; target: number }>(`water_${userId}`);
      const newAmount = Math.max((cached?.consumed ?? 0) - 1.0, 0); // Dec by default 1 cup (250ml)
      await AppCache.set(`water_${userId}`, { consumed: newAmount, target });
    }

    // 2. Queue background synchronization mutation
    try {
      await OfflineQueue.addMutation('health_undo', userId, {
        metric,
        options
      });
    } catch (e) {
      logger.error('[HealthLogger] failed queueing health undo mutation:', e);
    }
  }
}
