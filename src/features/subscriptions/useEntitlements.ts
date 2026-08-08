import { useContext, useCallback } from 'react';
import { EntitlementContext, EntitlementsPayload } from './EntitlementContext';
import { FeatureId } from './featureRegistry';
import { AnalyticsEventName, AnalyticsEventPayload } from './entitlement.types';
import { logger } from '../../lib/logger';

export function useEntitlements(): EntitlementsPayload & {
  logEvent: (eventName: AnalyticsEventName, featureId?: FeatureId, screen?: string) => void;
} {
  const context = useContext(EntitlementContext);

  if (!context) {
    throw new Error('useEntitlements must be used within an EntitlementProvider');
  }

  const logEvent = useCallback(
    (eventName: AnalyticsEventName, featureId?: FeatureId, screen?: string) => {
      const payload: AnalyticsEventPayload = {
        eventName,
        featureId,
        role: context.userRole,
        plan: context.plan,
        screen,
        reason: featureId ? context.getLockReason(featureId) : null,
        timestamp: new Date().toISOString(),
      };

      logger.log(`[AnalyticsEvent] ${eventName}`, JSON.stringify(payload));
    },
    [context.userRole, context.plan, context.getLockReason]
  );

  return {
    ...context,
    logEvent,
  };
}

export function useSubscriptionAccess() {
  return useEntitlements();
}
