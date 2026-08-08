import { createContext } from 'react';
import type { FeatureId, SubscriptionPlanTier, AppRole } from './featureRegistry';
import type { FeatureState, LockReason, PlanLimits } from './entitlement.types';
import type { SubscriptionAccessState } from './subscription.types';

export interface EntitlementsPayload {
  plan: SubscriptionPlanTier;
  limits: PlanLimits;
  permissions: Record<FeatureId, FeatureState>;
  expiresAt: string | null;
  renewalDate: string | null;
  subscriptionAccessState: SubscriptionAccessState;
  isPremium: boolean;
  userRole: AppRole;
  getFeatureState: (featureId: FeatureId) => FeatureState;
  canUse: (featureId: FeatureId) => boolean;
  getLockReason: (featureId: FeatureId) => LockReason;
  refreshEntitlements: () => Promise<void>;
  isLoading: boolean;
}

export const EntitlementContext = createContext<EntitlementsPayload | undefined>(undefined);
