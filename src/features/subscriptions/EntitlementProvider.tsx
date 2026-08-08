import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import type { PaymentRequest } from '../../types';
import { FEATURE_REGISTRY, FeatureId, SubscriptionPlanTier, AppRole } from './featureRegistry';
import { DEFAULT_PLAN_LIMITS, FeatureState, LockReason, PlanLimits } from './entitlement.types';
import { resolveSubscriptionState } from './resolveSubscriptionState';
import { SubscriptionAccessState } from './subscription.types';
import { EntitlementContext, EntitlementsPayload } from './EntitlementContext';

export const EntitlementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentProfile, accountProfileId, loadingFamily } = useFamily();
  const [latestRequest, setLatestRequest] = useState<PaymentRequest | null>(null);

  const cacheRef = useRef<{ timestamp: number; payload: EntitlementsPayload | null }>({
    timestamp: 0,
    payload: null,
  });
  const prevPlanRef = useRef<SubscriptionPlanTier | null>(null);

  // Fetch latest payment request
  useEffect(() => {
    if (!accountProfileId || currentProfile?.manager_id) {
      setLatestRequest(null);
      return;
    }

    const fetchLatestPaymentRequest = async () => {
      try {
        const { data } = await supabase
          .from('payment_requests')
          .select('id,user_id,amount,plan_type,status,receipt_url,renewal_metadata,created_at,payment_type,requested_family_quota')
          .eq('user_id', accountProfileId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setLatestRequest((data as PaymentRequest | null) || null);
      } catch (err: unknown) {
        logger.error('[EntitlementProvider] Failed to fetch latest request:', err);
      }
    };

    fetchLatestPaymentRequest();
  }, [accountProfileId, currentProfile?.manager_id]);

  // Compute User Role
  const userRole: AppRole = useMemo(() => {
    if (!currentProfile) return 'client';
    if (currentProfile.role === 'admin') return 'admin';
    if (currentProfile.role === 'doctor') return 'doctor';
    return 'client';
  }, [currentProfile?.role]);

  // Compute Subscription Access State using resolveSubscriptionState
  const accessState: SubscriptionAccessState = useMemo(() => {
    return resolveSubscriptionState(currentProfile, latestRequest, currentProfile?.entitlement);
  }, [currentProfile, latestRequest]);

  // Compute Plan Tier
  const planTier: SubscriptionPlanTier = useMemo(() => {
    if (userRole === 'admin') return 'ENTERPRISE';
    if (accessState === 'active' || accessState === 'expiring_soon' || accessState === 'renewing') {
      if (currentProfile?.manager_id || currentProfile?.subscription_status === 'active') {
        if (latestRequest?.requested_family_quota || currentProfile?.manager_id) return 'FAMILY';
        return 'INDIVIDUAL';
      }
    }
    if (accessState === 'family_active') return 'FAMILY';
    return 'FREE';
  }, [accessState, userRole, currentProfile, latestRequest]);

  // Track Plan Change for Enterprise Audit Log
  useEffect(() => {
    if (prevPlanRef.current && prevPlanRef.current !== planTier) {
      logger.log(`[EntitlementProvider] PLAN_CHANGED: ${prevPlanRef.current} -> ${planTier}`);
      if (currentProfile?.id) {
        (async () => {
          try {
            await supabase.from('enterprise_audit_logs').insert({
              actor_id: currentProfile.id,
              actor_role: userRole,
              action: 'PLAN_CHANGED',
              entity_type: 'subscription',
              old_value: { plan: prevPlanRef.current },
              new_value: { plan: planTier },
            });
          } catch (auditErr) {
            logger.error('[EntitlementProvider] Audit log insert error:', auditErr);
          }
        })();
      }
    }
    prevPlanRef.current = planTier;
  }, [planTier, currentProfile?.id, userRole]);

  const isPremium = planTier !== 'FREE';

  // Compute Limits
  const limits: PlanLimits = useMemo(() => DEFAULT_PLAN_LIMITS[planTier], [planTier]);

  // Dates
  const expiresAt = currentProfile?.subscription_end_date || null;
  const renewalDate = currentProfile?.subscription_end_date || null;

  // Evaluate Feature State
  const getFeatureState = useCallback(
    (featureId: FeatureId): FeatureState => {
      const meta = FEATURE_REGISTRY[featureId];
      if (!meta) return 'disabled';

      if (meta.comingSoon) return 'coming_soon';

      // Role check
      if (!meta.allowedRoles.includes(userRole) && userRole !== 'admin') {
        return 'hidden';
      }

      // Admin & Doctor access bypass
      if (userRole === 'admin' || userRole === 'doctor') return 'unlocked';

      // Plan requirement check
      if (meta.requiredPlan.includes(planTier)) return 'unlocked';

      return 'locked';
    },
    [userRole, planTier]
  );

  const canUse = useCallback(
    (featureId: FeatureId): boolean => {
      return getFeatureState(featureId) === 'unlocked';
    },
    [getFeatureState]
  );

  const getLockReason = useCallback(
    (featureId: FeatureId): LockReason => {
      const state = getFeatureState(featureId);
      if (state === 'unlocked') return null;
      if (state === 'coming_soon') return 'coming_soon';
      if (state === 'hidden') return 'role_restricted';

      const meta = FEATURE_REGISTRY[featureId];
      if (meta?.requiredPlan.includes('FAMILY') && !meta?.requiredPlan.includes('INDIVIDUAL')) {
        return 'requires_family_plan';
      }
      return 'requires_premium';
    },
    [getFeatureState]
  );

  // Compute Map of Permissions
  const permissions: Record<FeatureId, FeatureState> = useMemo(() => {
    const map = {} as Record<FeatureId, FeatureState>;
    (Object.keys(FEATURE_REGISTRY) as FeatureId[]).forEach((fid) => {
      map[fid] = getFeatureState(fid);
    });
    return map;
  }, [getFeatureState]);

  const refreshEntitlements = useCallback(async () => {
    cacheRef.current.timestamp = Date.now();
    logger.log(`[EntitlementProvider] ENTITLEMENT_REFRESHED for plan ${planTier}`);
  }, [planTier]);

  const value: EntitlementsPayload = useMemo(() => {
    const payload: EntitlementsPayload = {
      plan: planTier,
      limits,
      permissions,
      expiresAt,
      renewalDate,
      subscriptionAccessState: accessState,
      isPremium,
      userRole,
      getFeatureState,
      canUse,
      getLockReason,
      refreshEntitlements,
      isLoading: loadingFamily,
    };

    cacheRef.current = {
      timestamp: Date.now(),
      payload,
    };

    return payload;
  }, [planTier, limits, permissions, expiresAt, renewalDate, accessState, isPremium, userRole, getFeatureState, canUse, getLockReason, refreshEntitlements, loadingFamily]);

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
};
