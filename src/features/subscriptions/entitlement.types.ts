import type { FeatureId, SubscriptionPlanTier, AppRole } from './featureRegistry';

export type FeatureState = 'unlocked' | 'locked' | 'coming_soon' | 'hidden' | 'disabled';

export type LockReason =
  | 'requires_premium'
  | 'requires_family_plan'
  | 'role_restricted'
  | 'coming_soon'
  | 'disabled_by_admin'
  | null;

export interface PlanLimits {
  maxFamilyMembers: number;
  aiRequestsPerDay: number;
  storageLimitMb: number;
  doctorChatsPerMonth: number;
  nutritionPlansLimit: number;
  workoutPlansLimit: number;
}

export const DEFAULT_PLAN_LIMITS: Record<SubscriptionPlanTier, PlanLimits> = {
  FREE: {
    maxFamilyMembers: 0,
    aiRequestsPerDay: 3,
    storageLimitMb: 50,
    doctorChatsPerMonth: 0,
    nutritionPlansLimit: 0,
    workoutPlansLimit: 0,
  },
  INDIVIDUAL: {
    maxFamilyMembers: 0,
    aiRequestsPerDay: 100,
    storageLimitMb: 1024,
    doctorChatsPerMonth: 50,
    nutritionPlansLimit: 10,
    workoutPlansLimit: 10,
  },
  FAMILY: {
    maxFamilyMembers: 5,
    aiRequestsPerDay: 500,
    storageLimitMb: 5120,
    doctorChatsPerMonth: 250,
    nutritionPlansLimit: 50,
    workoutPlansLimit: 50,
  },
  ENTERPRISE: {
    maxFamilyMembers: 999,
    aiRequestsPerDay: 9999,
    storageLimitMb: 51200,
    doctorChatsPerMonth: 9999,
    nutritionPlansLimit: 999,
    workoutPlansLimit: 999,
  },
};

export type AnalyticsEventName =
  | 'FEATURE_VIEWED'
  | 'FEATURE_BLOCKED'
  | 'FEATURE_UNLOCKED'
  | 'UPGRADE_CLICKED'
  | 'ENTITLEMENT_REFRESHED'
  | 'PLAN_CHANGED';

export interface AnalyticsEventPayload {
  eventName: AnalyticsEventName;
  featureId?: FeatureId;
  userId?: string;
  role?: AppRole;
  plan?: SubscriptionPlanTier;
  screen?: string;
  reason?: LockReason;
  timestamp: string;
}
