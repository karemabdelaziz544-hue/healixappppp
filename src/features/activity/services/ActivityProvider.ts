import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { logger } from '../../../lib/logger';

export interface ActivityProvider {
  name: 'Pedometer' | 'AppleHealth' | 'GoogleFit' | 'Garmin' | 'Huawei' | 'Manual';
  isAvailable(): Promise<boolean>;
  getPermissions(): Promise<{ status: string; granted: boolean; canAskAgain: boolean }>;
  requestPermissions(): Promise<{ status: string; granted: boolean; canAskAgain: boolean }>;
  getStepsForPeriod(start: Date, end: Date): Promise<number>;
  watchSteps(callback: (steps: number) => void): { remove: () => void } | null;
}

/**
 * PedometerActivityProvider — Fallback hardware motion sensor.
 */
export class PedometerActivityProvider implements ActivityProvider {
  name: ActivityProvider['name'] = 'Pedometer';

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
      const perm = await Pedometer.getPermissionsAsync();
      return {
        status: perm.status,
        granted: perm.granted || perm.status === 'granted',
        canAskAgain: perm.canAskAgain
      };
    } catch (e) {
      logger.error('[PedometerActivityProvider] failed getting permissions:', e);
      return { status: 'undetermined', granted: false, canAskAgain: true };
    }
  }

  async requestPermissions() {
    try {
      const perm = await Pedometer.requestPermissionsAsync();
      return {
        status: perm.status,
        granted: perm.granted || perm.status === 'granted',
        canAskAgain: perm.canAskAgain
      };
    } catch (e) {
      logger.error('[PedometerActivityProvider] failed requesting permissions:', e);
      return { status: 'denied', granted: false, canAskAgain: true };
    }
  }

  async getStepsForPeriod(start: Date, end: Date): Promise<number> {
    try {
      const avail = await this.isAvailable();
      if (!avail) return 0;
      
      let perm = await this.getPermissions();
      if (perm.status === 'undetermined') {
        perm = await this.requestPermissions();
      }
      
      if (!perm.granted && perm.status !== 'granted') return 0;

      const result = await Pedometer.getStepCountAsync(start, end);
      const steps = result?.steps || 0;
      logger.log(`[PedometerActivityProvider] getStepsForPeriod returned ${steps} steps`);
      return steps;
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

/**
 * AppleHealthActivityProvider — iOS Apple HealthKit / CoreMotion integration.
 * Reads step count data safely on iOS devices with zero write requests.
 */
export class AppleHealthActivityProvider implements ActivityProvider {
  name: ActivityProvider['name'] = 'AppleHealth';

  async isAvailable(): Promise<boolean> {
    try {
      if (Platform.OS !== 'ios') return false;
      return await Pedometer.isAvailableAsync();
    } catch (e) {
      logger.error('[AppleHealthActivityProvider] failed checking availability:', e);
      return false;
    }
  }

  async getPermissions() {
    try {
      if (Platform.OS !== 'ios') {
        return { status: 'denied', granted: false, canAskAgain: false };
      }
      const perm = await Pedometer.getPermissionsAsync();
      return {
        status: perm.status,
        granted: perm.granted || perm.status === 'granted',
        canAskAgain: perm.canAskAgain
      };
    } catch (e) {
      logger.error('[AppleHealthActivityProvider] failed getting permissions:', e);
      return { status: 'undetermined', granted: false, canAskAgain: true };
    }
  }

  async requestPermissions() {
    try {
      if (Platform.OS !== 'ios') {
        return { status: 'denied', granted: false, canAskAgain: false };
      }
      const perm = await Pedometer.requestPermissionsAsync();
      return {
        status: perm.status,
        granted: perm.granted || perm.status === 'granted',
        canAskAgain: perm.canAskAgain
      };
    } catch (e) {
      logger.error('[AppleHealthActivityProvider] failed requesting permissions:', e);
      return { status: 'denied', granted: false, canAskAgain: true };
    }
  }

  async getStepsForPeriod(start: Date, end: Date): Promise<number> {
    try {
      if (Platform.OS !== 'ios') return 0;
      const avail = await this.isAvailable();
      if (!avail) return 0;
      
      let perm = await this.getPermissions();
      if (perm.status === 'undetermined') {
        perm = await this.requestPermissions();
      }
      
      if (!perm.granted && perm.status !== 'granted') return 0;

      const result = await Pedometer.getStepCountAsync(start, end);
      const steps = result?.steps || 0;
      logger.log(`[AppleHealthActivityProvider] getStepsForPeriod returned ${steps} steps`);
      return steps;
    } catch (e) {
      logger.error('[AppleHealthActivityProvider] failed getting steps:', e);
      return 0;
    }
  }

  watchSteps(callback: (stepsCount: number) => void) {
    try {
      if (Platform.OS !== 'ios') return null;
      return Pedometer.watchStepCount((result) => {
        callback(result.steps);
      });
    } catch (e) {
      logger.error('[AppleHealthActivityProvider] failed watching steps:', e);
      return null;
    }
  }
}
