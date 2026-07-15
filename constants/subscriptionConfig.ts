/**
 * Healix — Subscription Pricing Config
 * =====================================
 * تعديل الأسعار من هنا فقط بدل البحث في كل الملفات.
 *
 * ⚠️ الأسعار هنا للعرض فقط. السعر الفعلي يُحسب في الـ Backend.
 * استخدم RPC `get_subscription_price(sub_count)` للحصول على السعر الرسمي.
 *
 * BASE_PRICE:  سعر الباقة الأساسية للمشترك الرئيسي
 * PER_MEMBER:  السعر الإضافي لكل فرد عائلي
 * CURRENCY:    العملة المعروضة في الـ UI
 */

export const SubscriptionConfig = {
  /** سعر الباقة الأساسية — 500 ج.م */
  BASE_PRICE: 500,

  /** سعر كل فرد إضافي — 250 ج.م */
  PER_MEMBER: 250,

  CURRENCY: 'EGP',
  PAYMENT_METHOD: 'فودافون كاش',
  PLAN_NAME: 'هيليكس المتكاملة',
  PLAN_TYPE: 'helix_integrated' as const,

  /** عدد الأيام قبل الانتهاء لعرض تنبيه "ينتهي قريباً" */
  EXPIRING_SOON_DAYS: 7,

  /** أقصى عدد للحسابات الإضافية */
  MAX_FAMILY_MEMBERS: 20,

  /**
   * تقدير السعر للعرض فقط — السعر الحقيقي يأتي من الـ Backend.
   * لا تعتمد على هذا الرقم في الدفع أو التحقق.
   */
  estimateTotal(memberCount: number): number {
    return this.BASE_PRICE + memberCount * this.PER_MEMBER;
  },

  /** نص التسعير للعرض */
  formatPrice(amount: number): string {
    return `${amount} ${this.CURRENCY}`;
  },
} as const;
