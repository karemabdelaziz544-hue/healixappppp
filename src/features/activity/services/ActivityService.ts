import { Platform } from 'react-native';
import { logger } from '../../../lib/logger';
import { ActivityProvider, PedometerActivityProvider, AppleHealthActivityProvider } from './ActivityProvider';

export class ActivityService {
  private static providers: Map<string, ActivityProvider> = new Map();
  private static activeProviderName: ActivityProvider['name'] = 'Pedometer';

  static {
    // Register available providers
    this.registerProvider(new AppleHealthActivityProvider());
    this.registerProvider(new PedometerActivityProvider());
    this.initializeBestProvider();
  }

  /**
   * Register a new activity tracking provider plugin.
   */
  static registerProvider(provider: ActivityProvider) {
    this.providers.set(provider.name, provider);
    logger.log(`[ActivityService] Registered provider: ${provider.name}`);
  }

  /**
   * Automatically selects the best available provider (AppleHealth on iOS -> Pedometer).
   */
  private static async initializeBestProvider() {
    try {
      if (Platform.OS === 'ios') {
        const appleHealth = this.providers.get('AppleHealth');
        if (appleHealth) {
          const avail = await appleHealth.isAvailable();
          if (avail) {
            this.activeProviderName = 'AppleHealth';
            logger.log('[ActivityService] Automatic provider selection: AppleHealth');
            return;
          }
        }
      }
    } catch (e) {
      logger.error('[ActivityService] Error in automatic provider selection:', e);
    }
    this.activeProviderName = 'Pedometer';
    logger.log('[ActivityService] Automatic provider selection: Pedometer');
  }

  /**
   * Set the active provider explicitly if needed.
   */
  static setActiveProvider(name: ActivityProvider['name']) {
    if (this.providers.has(name)) {
      this.activeProviderName = name;
      logger.log(`[ActivityService] Active provider set to: ${name}`);
    } else {
      logger.error(`[ActivityService] Provider not found: ${name}`);
    }
  }

  /**
   * Get the active provider instance with safe fallback.
   */
  private static getActiveProvider(): ActivityProvider {
    const provider = this.providers.get(this.activeProviderName);
    if (!provider) {
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
      const perm = await this.getActiveProvider().requestPermissions();
      // Re-evaluate best provider after permission change
      await this.initializeBestProvider();
      return perm;
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

  static getActiveProviderName(): ActivityProvider['name'] {
    return this.activeProviderName;
  }

  /**
   * Helper to translate DB provider enum to user-friendly Arabic/English UI string.
   */
  static getDisplayName(name?: string): string {
    const provider = name || this.activeProviderName;
    switch (provider) {
      case 'AppleHealth':
        return 'Apple Health';
      case 'GoogleFit':
        return 'Google Health';
      case 'Garmin':
        return 'Garmin';
      case 'Huawei':
        return 'Huawei Health';
      case 'Pedometer':
      default:
        return 'حساس الجهاز';
    }
  }
}
