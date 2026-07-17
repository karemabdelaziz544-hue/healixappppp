import { useEffect, useRef, useState } from 'react';
import { useFamily } from '../src/context/FamilyContext';
import { supabase } from '../src/lib/supabase';
import type { PaymentRequest } from '../src/types';
import { resolveSubscriptionState } from '../src/features/subscriptions/resolveSubscriptionState';

/**
 * حالات دورة حياة المستخدم (User Lifecycle States)
 * ===================================================
 * 'loading'           — جاري تحميل بيانات المستخدم
 * 'admin_or_doctor'   — المستخدم ليس عميل (طبيب أو مدير)
 * 'lead'              — عميل جديد لم يدفع بعد (no_subscription)
 * 'onboarding'        — عميل دفع لكن لم يكمل بياناته (active + !is_onboarded)
 * 'active'            — عميل نشط مكتمل البيانات
 * 'expiring_soon'     — عميل نشط اشتراكه ينتهي خلال 7 أيام
 * 'expired'           — عميل اشتراكه منتهي
 * 'payment_pending'   — طلب دفع قيد المراجعة (new)
 * 'payment_rejected'  — آخر طلب مرفوض
 * 'renewing'          — طلب تجديد قيد المراجعة
 * 'upgrade_pending'   — طلب ترقية قيد المراجعة
 * 'downgrade_pending' — طلب تخفيض قيد المراجعة
 * 'cancelled'         — تم إلغاء الاشتراك
 * 'sub_excluded'      — حساب عائلي مستثنى أو منتهي
 */
export type UserLifecycleState =
  | 'loading'
  | 'admin_or_doctor'
  | 'lead'
  | 'onboarding'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'payment_pending'
  | 'payment_rejected'
  | 'renewing'
  | 'upgrade_pending'
  | 'downgrade_pending'
  | 'cancelled'
  | 'sub_excluded';

export function useSubscriptionGuard() {
  const { currentProfile, accountProfileId, loadingFamily } = useFamily();
  const [userLifecycleState, setUserLifecycleState] = useState<UserLifecycleState>('loading');
  const [isGuardLoading, setIsGuardLoading] = useState(true);
  const [latestRequest, setLatestRequest] = useState<PaymentRequest | null>(null);
  // ✅ BUG-02: فصل التحميل الأولي عن التحديثات اللاحقة
  const initialized = useRef(false);

  useEffect(() => {
    if (!accountProfileId || currentProfile?.manager_id) { setLatestRequest(null); return; }
    supabase.from('payment_requests')
      .select('id,user_id,amount,plan_type,status,receipt_url,renewal_metadata,created_at,payment_type,requested_family_quota')
      .eq('user_id', accountProfileId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setLatestRequest(data as PaymentRequest | null));
  }, [accountProfileId, currentProfile?.manager_id]);

  useEffect(() => {
    if (!accountProfileId) {
      setUserLifecycleState('loading');
      setIsGuardLoading(false);
      initialized.current = false;
      return;
    }

    if (loadingFamily) {
      if (!initialized.current) {
        setUserLifecycleState('loading');
        setIsGuardLoading(true);
      }
      return;
    }

    if (!currentProfile) {
      // ✅ BUG-02: فقط أظهر loading في التحميل الأولي، مش في كل تغيير
      if (!initialized.current) {
        setUserLifecycleState('lead');
        setIsGuardLoading(false);
        initialized.current = true;
      }
      return;
    }

    const { role } = currentProfile;
    // ⚠️ is_onboarded comes as null from DB for existing rows — coerce to boolean
    const isOnboarded = !!currentProfile.is_onboarded;

    // 1. ليس عميل (طبيب أو مدير)
    if (role !== 'client') {
      setUserLifecycleState('admin_or_doctor');
      setIsGuardLoading(false);
      initialized.current = true;
      return;
    }

    const state = resolveSubscriptionState(currentProfile, latestRequest, currentProfile.entitlement);

    const isPeriodActive = currentProfile.subscription_status === 'active' &&
                           currentProfile.subscription_end_date &&
                           new Date(currentProfile.subscription_end_date) > new Date();

    const isExpiringSoon = state === 'expiring_soon';

    // Map subscription access state to user lifecycle state
    switch (state) {
      case 'no_subscription':
        setUserLifecycleState('lead');
        break;

      case 'active':
      case 'expiring_soon': {
        if (!isOnboarded) {
          setUserLifecycleState('onboarding');
        } else {
          setUserLifecycleState(isExpiringSoon ? 'expiring_soon' : 'active');
        }
        break;
      }

      case 'family_active': {
        if (!isOnboarded) {
          setUserLifecycleState('onboarding');
        } else {
          setUserLifecycleState('active');
        }
        break;
      }

      case 'pending_review':
        setUserLifecycleState('payment_pending');
        break;

      case 'rejected':
        setUserLifecycleState('payment_rejected');
        break;

      case 'renewing':
        // If renewing early (subscription still active), treat them as active/expiring_soon
        if (isPeriodActive) {
          setUserLifecycleState(isExpiringSoon ? 'expiring_soon' : 'active');
        } else {
          setUserLifecycleState('renewing');
        }
        break;

      case 'upgrade_pending':
        if (isPeriodActive) {
          setUserLifecycleState(isExpiringSoon ? 'expiring_soon' : 'active');
        } else {
          setUserLifecycleState('upgrade_pending');
        }
        break;

      case 'downgrade_pending':
        if (isPeriodActive) {
          setUserLifecycleState(isExpiringSoon ? 'expiring_soon' : 'active');
        } else {
          setUserLifecycleState('downgrade_pending');
        }
        break;

      case 'expired':
        setUserLifecycleState('expired');
        break;

      case 'cancelled':
        setUserLifecycleState('cancelled');
        break;

      case 'family_expired':
      case 'family_removed':
        setUserLifecycleState('sub_excluded');
        break;

      default:
        setUserLifecycleState('lead');
        break;
    }

    setIsGuardLoading(false);
    initialized.current = true;
  }, [currentProfile, latestRequest, accountProfileId, loadingFamily]);

  // Check if current user period is active
  const isPeriodActive = currentProfile?.subscription_status === 'active' &&
                         currentProfile?.subscription_end_date &&
                         new Date(currentProfile.subscription_end_date) > new Date();

  // ✅ Backward compatibility — isSubscribed للتوافقية مع أي كود قديم
  // Grants access to tab screens when active or onboarding
  const isSubscribed = userLifecycleState === 'active' ||
    userLifecycleState === 'expiring_soon' ||
    userLifecycleState === 'onboarding' ||
    userLifecycleState === 'admin_or_doctor' ||
    userLifecycleState === 'upgrade_pending' ||
    userLifecycleState === 'downgrade_pending' ||
    (userLifecycleState === 'renewing' && isPeriodActive);

  return { userLifecycleState, isGuardLoading, isSubscribed };
}
