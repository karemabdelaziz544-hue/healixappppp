/**
 * Healix Subscription — Lifecycle States
 * ========================================
 * The full subscription lifecycle as returned by the backend
 * profile_subscription_state() RPC and used for UI rendering.
 */
export type SubscriptionAccessState =
  | 'loading'
  | 'admin'
  // ─── Main account states ───
  | 'no_subscription'
  | 'pending_review'
  | 'rejected'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'renewing'
  | 'upgrade_pending'
  | 'downgrade_pending'
  | 'cancelled'
  // ─── Family member states ───
  | 'family_active'
  | 'family_expired'
  | 'family_removed';

/** Payment request action type */
export type PaymentType = 'new' | 'renewal' | 'upgrade' | 'downgrade';

/** Family entitlement record (from family_subscription_memberships) */
export interface FamilyEntitlement {
  status: 'included' | 'excluded' | 'expired' | 'cancelled';
  included_until: string | null;
}

/** Subscription details returned by the get_my_subscription_details() RPC */
export interface SubscriptionDetails {
  subscription_id: string;
  status: string;
  family_quota: number;
  period_starts_at: string | null;
  period_ends_at: string | null;
  access_state: SubscriptionAccessState;
  included_member_count: number;
}
