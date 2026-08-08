import { logger } from './logger';

export type JobDriverType = 'memory' | 'pg_cron' | 'qstash' | 'trigger_dev' | 'bull_mq';

export interface BackgroundJob<T = any> {
  id: string;
  name: string;
  payload: T;
  scheduledAt: number;
  retryCount: number;
  maxRetries: number;
}

export interface JobWorker<T = any> {
  name: string;
  handler: (job: BackgroundJob<T>) => Promise<void>;
}

export interface JobDriver {
  type: JobDriverType;
  dispatch<T>(name: string, payload: T, delayMs?: number): Promise<string>;
}

class MemoryJobDriver implements JobDriver {
  public type: JobDriverType = 'memory';

  public async dispatch<T>(name: string, payload: T, delayMs: number = 0): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    logger.log(`[MemoryJobDriver] Dispatched ${name} (${jobId}) with delay ${delayMs}ms`);
    return jobId;
  }
}

/**
 * WARNING: The MemoryJobDriver is volatile. Jobs enqueued here will be permanently LOST
 * if the app is suspended, closed, or crashes.
 * 
 * For critical backend tasks (e.g., Push Notifications, Scheduled Analytics), use the
 * server-side PostgreSQL queues (e.g., `notification_queue` with `notification-worker`).
 * 
 * Use `JobRunner` exclusively for non-critical, opportunistic UI-level async tasks.
 */
export class JobRunner {
  private static workers = new Map<string, JobWorker>();
  private static activeDriver: JobDriver = new MemoryJobDriver();

  /**
   * Switches the active job driver engine (e.g. pg_cron, qstash, trigger_dev, bull_mq).
   */
  public static setDriver(driver: JobDriver): void {
    this.activeDriver = driver;
    logger.log(`[JobRunner] Active driver set to: ${driver.type}`);
  }

  /**
   * Registers a background worker for a specific job name.
   */
  public static registerWorker<T>(name: string, handler: (job: BackgroundJob<T>) => Promise<void>): void {
    this.workers.set(name, { name, handler });
    logger.log(`[JobRunner] Registered worker for job: ${name}`);
  }

  /**
   * Enqueues a job for background processing via the active driver.
   */
  public static async dispatch<T>(name: string, payload: T, delayMs: number = 0): Promise<string> {
    const CRITICAL_JOBS = ['notification', 'email', 'audit_log', 'payment_processing'];
    if (this.activeDriver.type === 'memory' && CRITICAL_JOBS.includes(name)) {
      throw new Error(`[SECURITY ALERT] Cannot dispatch critical backend job '${name}' using volatile MemoryJobDriver. Use a persistent server-side queue.`);
    }

    const jobId = await this.activeDriver.dispatch(name, payload, delayMs);
    const job: BackgroundJob<T> = {
      id: jobId,
      name,
      payload,
      scheduledAt: Date.now() + delayMs,
      retryCount: 0,
      maxRetries: 3,
    };

    // Asynchronous background execution (decoupled from UI caller)
    setTimeout(() => {
      this.executeJob(job).catch(err => logger.error(`[JobRunner] Unhandled error for job ${jobId}:`, err));
    }, delayMs);

    return jobId;
  }

  /**
   * Internal job execution with exponential backoff retries.
   */
  private static async executeJob(job: BackgroundJob): Promise<void> {
    const worker = this.workers.get(job.name);
    if (!worker) {
      logger.error(`[JobRunner] No worker registered for job: ${job.name}`);
      return;
    }

    try {
      await worker.handler(job);
      logger.log(`[JobRunner] Job completed successfully: ${job.name} (${job.id})`);
    } catch (err: any) {
      logger.error(`[JobRunner] Job failed: ${job.name} (${job.id}) Attempt ${job.retryCount + 1}/${job.maxRetries}`, err);
      
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        const backoffMs = Math.pow(2, job.retryCount) * 1000;
        logger.log(`[JobRunner] Scheduling retry for ${job.id} in ${backoffMs}ms`);
        setTimeout(() => this.executeJob(job), backoffMs);
      } else {
        logger.error(`[JobRunner] Job dead-lettered after max retries: ${job.id}`);
      }
    }
  }
}
