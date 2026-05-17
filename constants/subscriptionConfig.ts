/**
 * Healix — Subscription Pricing Config
 * =====================================
 * تعديل الأسعار من هنا فقط بدل البحث في كل الملفات.
 *
 * BASE_PRICE:  سعر الباقة الأساسية للمشترك الرئيسي
 * PER_MEMBER:  السعر الإضافي لكل فرد عائلي
 * CURRENCY:    العملة المعروضة في الـ UI
 * PAYMENT_METHOD: طريقة الدفع المعتمدة
 */

export const SubscriptionConfig = {
  BASE_PRICE: 500,
  PER_MEMBER: 150,
  CURRENCY: 'EGP',
  PAYMENT_METHOD: 'فودافون كاش',
  PLAN_NAME: 'هيليكس المتكاملة',
  PLAN_TYPE: 'helix_integrated' as const,

  /** احسب الإجمالي حسب عدد الأفراد */
  calculateTotal(memberCount: number): number {
    return this.BASE_PRICE + memberCount * this.PER_MEMBER;
  },

  /** نص التسعير للعرض */
  formatPrice(amount: number): string {
    return `${amount} ${this.CURRENCY}`;
  },
} as const;
