import { logger } from '../../../lib/logger';
import { ActivityProvider, PedometerActivityProvider } from './ActivityProvider';

export class ActivityService {
  private static providers: Map<string, ActivityProvider> = new Map();
  private static activeProviderName = 'Pedometer';

  static {
    // Register the default Pedometer provider
    this.registerProvider(new PedometerActivityProvider());
  }

  /**
   * Register a new activity tracking provider plugin.
   */
  static registerProvider(provider: ActivityProvider) {
    this.providers.set(provider.name, provider);
    logger.log(`[ActivityService] Registered provider: ${provider.name}`);
  }

  /**
   * Set the active provider.
   */
  static setActiveProvider(name: string) {
    if (this.providers.has(name)) {
      this.activeProviderName = name;
      logger.log(`[ActivityService] Active provider set to: ${name}`);
    } else {
      logger.error(`[ActivityService] Provider not found: ${name}`);
    }
  }

  /**
   * Get the active provider instance.
   */
  private static getActiveProvider(): ActivityProvider {
    const provider = this.providers.get(this.activeProviderName);
    if (!provider) {
      // Fallback
      return new PedometerActivityProvider();
    }
    return provider;
  }

  static async isAvailable(): Promise<boolean> {
    try {
      return await this.getActiveProvider().isAvailable();
    } catch (e) {
      logger.error('[ActivityService] failed checking availability:', e);
      return false;
    }
  }

  static async getPermissions() {
    try {
      return await this.getActiveProvider().getPermissions();
    } catch (e) {
      logger.error('[ActivityService] failed getting permissions:', e);
      return { status: 'undetermined', granted: false, canAskAgain: true };
    }
  }

  static async requestPermissions() {
    try {
      return await this.getActiveProvider().requestPermissions();
    } catch (e) {
      logger.error('[ActivityService] failed requesting permissions:', e);
      return { status: 'denied', granted: false, canAskAgain: true };
    }
  }

  static async getStepsForPeriod(start: Date, end: Date): Promise<number> {
    try {
      return await this.getActiveProvider().getStepsForPeriod(start, end);
    } catch (e) {
      logger.error('[ActivityService] failed getting steps for period:', e);
      return 0;
    }
  }

  static watchSteps(callback: (stepsCount: number) => void) {
    try {
      return this.getActiveProvider().watchSteps(callback);
    } catch (e) {
      logger.error('[ActivityService] failed watching step count:', e);
      return null;
    }
  }

  static getActiveProviderName(): string {
    return this.activeProviderName;
  }
}
