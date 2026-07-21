import type { PaymentRequest, Profile } from '../../types';
import type { FamilyEntitlement, SubscriptionAccessState } from './subscription.types';

/**
 * Client-side display resolver for subscription state.
 * ======================================================
 * The backend `profile_subscription_state()` RPC is the source of truth.
 * This resolver provides a local approximation for immediate UI rendering
 * while the backend state is being fetched or when offline.
 *
 * States supported:
 *   admin, no_subscription, pending_review, rejected, active, expiring_soon,
 *   expired, renewing, upgrade_pending, downgrade_pending, cancelled,
 *   family_active, family_expired, family_removed
 */
export function resolveSubscriptionState(
  profile: Profile | null | undefined,
  latestRequest?: PaymentRequest | null,
  entitlement?: FamilyEntitlement | null,
  now = new Date(),
): SubscriptionAccessState {
  if (!profile) return 'loading';
  if (profile.role === 'admin' || profile.role === 'doctor') return 'admin';

  // ─── Family member states ───
  if (profile.manager_id) {
    if (entitlement?.status === 'excluded') return 'family_removed';
    if (
      entitlement?.status === 'included' &&
      !!entitlement.included_until &&
      new Date(entitlement.included_until) > now
    ) {
      return 'family_active';
    }
    return 'family_expired';
  }

  // ─── Payment states with type awareness ───
  if (latestRequest?.status === 'pending') {
    switch (latestRequest.payment_type) {
      case 'upgrade': return 'upgrade_pending';
      case 'downgrade': return 'downgrade_pending';
      case 'renewal': return 'renewing';
      default: return 'pending_review';
    }
  }

  if (latestRequest?.status === 'rejected') return 'rejected';
  if (profile.subscription_status === 'cancelled') return 'cancelled';

  // ─── Active states ───
  if (
    profile.subscription_status === 'active' &&
    profile.subscription_end_date &&
    new Date(profile.subscription_end_date) > now
  ) {
    // Check if expiring soon (within 7 days)
    const daysUntilExpiry = Math.ceil(
      (new Date(profile.subscription_end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry <= 7) return 'expiring_soon';
    return 'active';
  }

  // ─── Expired: had subscription before ───
  // IMPORTANT: Only treat as 'expired' if they actually had a prior subscription
  // (subscription_end_date is not null). Users with status='expired' but no
  // end_date have never subscribed and must be treated as 'no_subscription'.
  if (profile.subscription_status === 'expired' && profile.subscription_end_date) {
    return 'expired';
  }
  if (profile.subscription_end_date) {
    return 'expired';
  }

  return 'no_subscription';
}

/** Check if a state grants access to the dashboard and features */
export const isActiveSubscriptionState = (state: SubscriptionAccessState): boolean =>
  state === 'active' ||
  state === 'expiring_soon' ||
  state === 'family_active' ||
  state === 'admin';

/** Check if a state has a pending change but user still has access */
export const hasPendingChange = (state: SubscriptionAccessState): boolean =>
  state === 'renewing' ||
  state === 'upgrade_pending' ||
  state === 'downgrade_pending';

/** Arabic label for each subscription state */
export const subscriptionStateLabel: Record<SubscriptionAccessState, string> = {
  loading: 'جاري التحميل...',
  admin: 'مدير النظام',
  no_subscription: 'بدون اشتراك',
  pending_review: 'قيد المراجعة',
  rejected: 'مرفوض',
  active: 'فعّال',
  expiring_soon: 'ينتهي قريباً',
  expired: 'منتهي',
  renewing: 'قيد التجديد',
  upgrade_pending: 'ترقية قيد المراجعة',
  downgrade_pending: 'تخفيض قيد المراجعة',
  cancelled: 'ملغي',
  family_active: 'عائلي فعّال',
  family_expired: 'عائلي منتهي',
  family_removed: 'تم الاستثناء',
};

/** Arabic label for payment types */
export const paymentTypeLabel: Record<string, string> = {
  new: 'اشتراك جديد',
  renewal: 'تجديد',
  upgrade: 'ترقية',
  downgrade: 'تخفيض',
};
