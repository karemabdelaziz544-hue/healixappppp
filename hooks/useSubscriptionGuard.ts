import { useEffect, useRef, useState } from 'react';
import { useFamily } from '../src/context/FamilyContext';

/**
 * حالات دورة حياة المستخدم (User Lifecycle States)
 * ===================================================
 * 'loading'         — جاري تحميل بيانات المستخدم
 * 'admin_or_doctor' — المستخدم ليس عميل (طبيب أو مدير)
 * 'lead'            — عميل جديد لم يدفع بعد (subscription_status = 'new')
 * 'onboarding'      — عميل دفع لكن لم يكمل بياناته (active + !is_onboarded)
 * 'active'          — عميل نشط مكتمل البيانات
 * 'expired'         — عميل اشتراكه منتهي
 */
export type UserLifecycleState =
  | 'loading'
  | 'admin_or_doctor'
  | 'lead'
  | 'onboarding'
  | 'active'
  | 'expired';

export function useSubscriptionGuard() {
  const { currentProfile } = useFamily();
  const [userLifecycleState, setUserLifecycleState] = useState<UserLifecycleState>('loading');
  const [isGuardLoading, setIsGuardLoading] = useState(true);
  // ✅ BUG-02: فصل التحميل الأولي عن التحديثات اللاحقة
  const initialized = useRef(false);

  useEffect(() => {
    if (!currentProfile) {
      // ✅ BUG-02: فقط أظهر loading في التحميل الأولي، مش في كل تغيير
      if (!initialized.current) {
        setUserLifecycleState('loading');
        setIsGuardLoading(true);
      }
      return;
    }

    const { role, subscription_status, subscription_end_date } = currentProfile;
    // ⚠️ is_onboarded comes as null from DB for existing rows — coerce to boolean
    const isOnboarded = !!currentProfile.is_onboarded;

    // 1. ليس عميل (طبيب أو مدير)
    if (role !== 'client') {
      setUserLifecycleState('admin_or_doctor');
      setIsGuardLoading(false);
      initialized.current = true;
      return;
    }

    // 2. عميل جديد لم يدفع
    if (subscription_status === 'new') {
      setUserLifecycleState('lead');
      setIsGuardLoading(false);
      initialized.current = true;
      return;
    }

    // 3. عميل نشط — نتحقق من التاريخ أولاً
    if (subscription_status === 'active') {
      const isDateValid = !subscription_end_date ||
        new Date(subscription_end_date) > new Date();

      if (!isDateValid) {
        // التاريخ انتهى رغم أن الحالة active — يعتبر expired
        setUserLifecycleState('expired');
      } else if (!isOnboarded) {
        // دفع لكن لم يكمل بياناته
        setUserLifecycleState('onboarding');
      } else {
        // عميل نشط مكتمل
        setUserLifecycleState('active');
      }
      setIsGuardLoading(false);
      initialized.current = true;
      return;
    }

    // 4. اشتراك منتهي
    if (subscription_status === 'expired') {
      setUserLifecycleState('expired');
      setIsGuardLoading(false);
      initialized.current = true;
      return;
    }

    // حالة غير معروفة — fallback إلى lead
    setUserLifecycleState('lead');
    setIsGuardLoading(false);
    initialized.current = true;
  }, [currentProfile]);

  // ✅ Backward compatibility — isSubscribed للتوافقية مع أي كود قديم
  const isSubscribed = userLifecycleState === 'active' ||
    userLifecycleState === 'onboarding' ||
    userLifecycleState === 'admin_or_doctor';

  return { userLifecycleState, isGuardLoading, isSubscribed };
}