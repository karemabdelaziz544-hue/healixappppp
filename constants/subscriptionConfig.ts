/**
 * Healix — Single Premium Plan & Family Licensing Pricing Config (Phase 4 Final Architecture)
 * ======================================================================================
 * - Single Plan: "Healix Premium"
 * - Billing Durations: Monthly, Quarterly, Semi-Annual, Annual
 * - Configurable Maximum Additional Licenses: MAX_ADDITIONAL_LICENSES = 3
 */

export type BillingDurationKey = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';

export interface BillingDurationOption {
  key: BillingDurationKey;
  label: string;
  months: number;
  basePrice: number;
  perLicensePrice: number;
  discountBadge?: string;
}

export const MAX_ADDITIONAL_LICENSES = 3;

export const BILLING_DURATIONS: Record<BillingDurationKey, BillingDurationOption> = {
  MONTHLY: {
    key: 'MONTHLY',
    label: 'شهر واحد',
    months: 1,
    basePrice: 500,
    perLicensePrice: 250,
  },
  QUARTERLY: {
    key: 'QUARTERLY',
    label: '3 أشهر',
    months: 3,
    basePrice: 1350,
    perLicensePrice: 675,
    discountBadge: 'وفر 10%',
  },
  SEMI_ANNUAL: {
    key: 'SEMI_ANNUAL',
    label: '6 أشهر',
    months: 6,
    basePrice: 2400,
    perLicensePrice: 1200,
    discountBadge: 'وفر 20%',
  },
  ANNUAL: {
    key: 'ANNUAL',
    label: '12 شهر (سنوي)',
    months: 12,
    basePrice: 4200,
    perLicensePrice: 2100,
    discountBadge: 'وفر 30% 🔥',
  },
};

export const SubscriptionConfig = {
  PLAN_NAME: 'Healix Premium',
  PLAN_TYPE: 'HEALIX_PREMIUM' as const,
  CURRENCY: 'ج.م',
  PAYMENT_METHOD: 'فودافون كاش',
  EXPIRING_SOON_DAYS: 7,
  BASE_PRICE: 500,
  PER_MEMBER: 250,
  MAX_FAMILY_MEMBERS: MAX_ADDITIONAL_LICENSES,
  MAX_ADDITIONAL_LICENSES,

  /**
   * Calculate total price dynamically based on duration and additional family licenses
   */
  calculateTotalPrice(durationKey: BillingDurationKey = 'MONTHLY', additionalLicensesCount: number = 0): number {
    const duration = BILLING_DURATIONS[durationKey] || BILLING_DURATIONS.MONTHLY;
    const cleanLicenses = Math.min(Math.max(0, additionalLicensesCount), MAX_ADDITIONAL_LICENSES);
    return duration.basePrice + (cleanLicenses * duration.perLicensePrice);
  },

  /** Legacy estimateTotal fallback */
  estimateTotal(memberCount: number): number {
    return this.calculateTotalPrice('MONTHLY', Math.max(0, memberCount - 1));
  },

  /** Price formatting string */
  formatPrice(amount: number): string {
    return `${amount} ${this.CURRENCY}`;
  },
} as const;
