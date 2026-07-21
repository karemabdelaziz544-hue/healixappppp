import { Pedometer } from 'expo-sensors';
import { logger } from '../../../lib/logger';

export interface ActivityProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  getPermissions(): Promise<{ status: string; granted: boolean; canAskAgain: boolean }>;
  requestPermissions(): Promise<{ status: string; granted: boolean; canAskAgain: boolean }>;
  getStepsForPeriod(start: Date, end: Date): Promise<number>;
  watchSteps(callback: (steps: number) => void): { remove: () => void } | null;
}

export class PedometerActivityProvider implements ActivityProvider {
  name = 'Pedometer';

  async isAvailable(): Promise<boolean> {
    try {
      return await Pedometer.isAvailableAsync();
    } catch (e) {
      logger.error('[PedometerActivityProvider] failed checking availability:', e);
      return false;
    }
  }

  async getPermissions() {
    try {
      return await Pedometer.getPermissionsAsync();
    } catch (e) {
      logger.error('[PedometerActivityProvider] failed getting permissions:', e);
      return { status: 'undetermined', granted: false, canAskAgain: true };
    }
  }

  async requestPermissions() {
    try {
      return await Pedometer.requestPermissionsAsync();
    } catch (e) {
      logger.error('[PedometerActivityProvider] failed requesting permissions:', e);
      return { status: 'denied', granted: false, canAskAgain: true };
    }
  }

  async getStepsForPeriod(start: Date, end: Date): Promise<number> {
    try {
      const avail = await this.isAvailable();
      if (!avail) return 0;
      const perm = await this.getPermissions();
      if (!perm.granted) return 0;

      const result = await Pedometer.getStepCountAsync(start, end);
      return result?.steps || 0;
    } catch (e) {
      logger.error('[PedometerActivityProvider] failed getting steps:', e);
      return 0;
    }
  }

  watchSteps(callback: (stepsCount: number) => void) {
    try {
      return Pedometer.watchStepCount((result) => {
        callback(result.steps);
      });
    } catch (e) {
      logger.error('[PedometerActivityProvider] failed watching steps:', e);
      return null;
    }
  }
}
