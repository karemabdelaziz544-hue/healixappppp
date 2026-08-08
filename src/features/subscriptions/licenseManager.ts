import { MAX_ADDITIONAL_LICENSES } from '../../../constants/subscriptionConfig';
import type { Profile } from '../../types';

export interface LicenseStatus {
  mainAccountActive: boolean;
  purchasedLicenses: number;
  usedLicenses: number;
  availableSlots: number;
  totalActiveProfiles: number;
  maxTotalProfiles: number;
  pendingMembers: Profile[];
  activeMembers: Profile[];
  isQuotaFull: boolean;
}

export class LicenseManager {
  /**
   * Computes the complete license allocation for a subscription context
   */
  static getLicenseStatus(
    subscriberProfile: Profile | null,
    familyMembers: Profile[],
    purchasedAdditionalLicenses: number = 0,
    subscriptionActive: boolean = false
  ): LicenseStatus {
    const mainAccountActive = subscriptionActive && subscriberProfile?.role === 'client';
    const cleanPurchased = Math.min(Math.max(0, purchasedAdditionalLicenses), MAX_ADDITIONAL_LICENSES);

    // Child family members (excluding main account)
    const childMembers = familyMembers.filter(m => !!m.manager_id);
    
    // Active members have subscription_status === 'active'
    const activeMembers = childMembers.filter(m => m.subscription_status === 'active');
    const pendingMembers = childMembers.filter(m => m.subscription_status !== 'active');

    const usedLicenses = activeMembers.length;
    const availableSlots = subscriptionActive ? Math.max(0, cleanPurchased - usedLicenses) : 0;
    const totalActiveProfiles = (mainAccountActive ? 1 : 0) + usedLicenses;
    const maxTotalProfiles = 1 + cleanPurchased;

    return {
      mainAccountActive,
      purchasedLicenses: cleanPurchased,
      usedLicenses,
      availableSlots,
      totalActiveProfiles,
      maxTotalProfiles,
      pendingMembers,
      activeMembers,
      isQuotaFull: availableSlots <= 0,
    };
  }

  /**
   * Validates if a member can be activated given current license allocation
   */
  static canActivateMember(status: LicenseStatus): boolean {
    return status.mainAccountActive && status.availableSlots > 0;
  }
}
