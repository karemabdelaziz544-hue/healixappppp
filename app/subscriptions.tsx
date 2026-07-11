import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Pressable, RefreshControl, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFamily } from '../src/context/FamilyContext';
import { useRouter } from 'expo-router';
import Skeleton from '../components/Skeleton';
import { SubscriptionConfig } from '../constants/subscriptionConfig';
import { useSubscriptionData } from '../src/features/subscriptions/hooks/useSubscriptionData';

// ─── Design System Colors ───
const C = {
  primary: '#12362e',
  primaryContainer: '#2A4D44',
  brandOrange: '#F26E11',
  success: '#10B981',
  error: '#ba1a1a',
  warningBg: '#FEF3C7',
  warningText: '#92400E',
  background: '#F9F8F3',
  cardSurface: '#FFFFFF',
  onSurface: '#121c2a',
  onSurfaceVariant: '#414846',
  outline: '#717975',
  outlineVariant: '#c1c8c4',
  surfaceContainerLow: '#eff4ff',
  onPrimaryContainer: '#97bdb1',
  inversePrimary: '#a9cec2',
};

const CARD_SHADOW = {
  shadowColor: '#1F2937',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 20,
  elevation: 3,
};

export default function SubscriptionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { currentProfile, familyMembers } = useFamily();
  const userId = currentProfile?.id;
  const subMembers = familyMembers.filter(m => m.manager_id === userId);
  const subAccountsCount = subMembers.length;

  const {
    loading,
    refreshing,
    history,
    pendingRequest,
    onRefresh,
    totalPrice,
  } = useSubscriptionData(userId, subAccountsCount, subMembers);

  const isActive = !!(currentProfile?.subscription_status === 'active' && 
                      currentProfile?.subscription_end_date && 
                      new Date(currentProfile.subscription_end_date) > new Date());
                   
  const isActuallyNew = currentProfile?.subscription_status === 'new' || 
                        (!currentProfile?.subscription_end_date && 
                         !currentProfile?.is_onboarded && 
                         currentProfile?.subscription_status === 'expired');

  const isSubAccount = !!currentProfile?.manager_id;

  // Determine shown count and cost based on pending request or current active subscription
  const displayedSubAccountsCount = pendingRequest && pendingRequest.renewal_metadata && typeof (pendingRequest.renewal_metadata as any).sub_count === 'number'
    ? (pendingRequest.renewal_metadata as any).sub_count
    : subAccountsCount;

  const displayedTotalPrice = pendingRequest
    ? pendingRequest.amount
    : SubscriptionConfig.calculateTotal(subAccountsCount);

  // Invoice Bottom Sheet state
  const [invoiceModalVisible, setInvoiceModalVisible] = React.useState(false);

  // Calculate remaining days
  const getRemainingDays = () => {
    if (!currentProfile?.subscription_end_date) return 0;
    const end = new Date(currentProfile.subscription_end_date);
    const today = new Date();
    const diff = end.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const remainingDays = getRemainingDays();
  const progressPercent = Math.min(100, Math.max(0, (remainingDays / 30) * 100));

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'غير محدد';
    return new Date(dateStr).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatDateShort = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
  };

  // ─── Loading State ───
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Skeleton width={30} height={30} borderRadius={15} />
          <Skeleton width={140} height={22} borderRadius={8} />
          <Skeleton width={36} height={36} borderRadius={18} />
        </View>
        <View style={{ padding: 20 }}>
          <Skeleton width="100%" height={60} borderRadius={16} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={200} borderRadius={24} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={100} borderRadius={24} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={100} borderRadius={24} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Sub Account Warning Screen ───
  if (isSubAccount && !isActive) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
            <Ionicons name="arrow-forward" size={24} color={C.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>اشتراكي</Text>
          <View style={styles.crownBadge}>
            <Ionicons name="star" size={18} color="#D4AF37" />
          </View>
        </View>
        <View style={styles.alertContainer}>
          <View style={styles.alertIconBox}>
            <Ionicons name="warning" size={48} color={C.error} />
          </View>
          <Text style={styles.alertTitle}>تنبيه بخصوص اشتراكك</Text>
          <Text style={styles.alertText}>
            نحيطك علماً بأنه <Text style={{fontWeight: 'bold', color: C.error}}>تم استثناء هذا الحساب</Text> من الاشتراك العائلي الجديد، أو أن الباقة قد انتهت صلاحيتها حالياً.
          </Text>
          <View style={styles.alertStepsBox}>
            <Text style={styles.alertStepsTitle}>ماذا تفعل الآن؟</Text>
            <Text style={styles.alertStep}>• تواصل مع مدير الحساب الأساسي لتجديد الباقة</Text>
            <Text style={styles.alertStep}>• أو تحدث مع خدمة عملائنا لمساعدتك فوريًا</Text>
          </View>
          <TouchableOpacity style={styles.alertBtn} onPress={() => router.replace('/chat')}>
            <Text style={styles.alertBtnText}>تحدث مع خدمة العملاء</Text>
            <Ionicons name="chatbubbles" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main Overview Screen ───
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
          <Ionicons name="arrow-forward" size={24} color={C.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>اشتراكي</Text>
        <View style={styles.crownBadge}>
          <Ionicons name="star" size={18} color="#D4AF37" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        {/* ─── Quick Status Card ─── */}
        <View style={styles.quickStatusCard}>
          <View style={styles.quickStatusLeft}>
            <Text style={styles.quickStatusPlan}>{SubscriptionConfig.PLAN_NAME}</Text>
            <View style={[styles.statusBadge, isActive ? styles.statusBadgeActive : styles.statusBadgeExpired]}>
              <View style={[styles.statusDot, isActive ? styles.statusDotActive : styles.statusDotExpired]} />
              <Text style={[styles.statusBadgeText, isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextExpired]}>
                {isActive ? 'فعّال' : (isActuallyNew ? 'جديد' : 'منتهي')}
              </Text>
            </View>
          </View>
          <View style={styles.quickStatusRight}>
            <View style={styles.quickStatusItem}>
              <Text style={styles.quickStatusLabel}>متبقي</Text>
              <Text style={styles.quickStatusValue}>{isActive ? `${remainingDays} يوم` : '—'}</Text>
            </View>
            <View style={styles.quickStatusDivider} />
            <View style={styles.quickStatusItem}>
              <Text style={styles.quickStatusLabel}>التجديد</Text>
              <Text style={styles.quickStatusValue}>{formatDateShort(currentProfile?.subscription_end_date)}</Text>
            </View>
          </View>
        </View>

        {/* ─── Hero Premium Plan Card ─── */}
        <View style={[styles.heroCard, isActive ? styles.heroCardActive : styles.heroCardExpired]}>
          {/* Decorative circle */}
          <View style={styles.heroDecorativeCircle} />
          
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroPlanName}>{SubscriptionConfig.PLAN_NAME}</Text>
              <View style={[styles.heroBadge, isActive ? styles.heroBadgeActive : styles.heroBadgeExpired]}>
                <View style={[styles.heroBadgeDot, isActive && { backgroundColor: '#4ADE80' }]} />
                <Text style={styles.heroBadgeText}>{isActive ? 'اشتراك فعّال' : (isActuallyNew ? 'غير مفعل' : 'منتهي الصلاحية')}</Text>
              </View>
            </View>
          </View>

          {/* Dates */}
          <View style={styles.heroDatesRow}>
            <View style={styles.heroDateItem}>
              <Text style={styles.heroDateLabel}>تاريخ البداية</Text>
              <Text style={styles.heroDateValue}>
                {currentProfile?.subscription_end_date 
                  ? formatDateShort(new Date(new Date(currentProfile.subscription_end_date).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
                  : '—'}
              </Text>
            </View>
            <View style={styles.heroDateItem}>
              <Text style={styles.heroDateLabel}>تاريخ الانتهاء</Text>
              <Text style={styles.heroDateValue}>{formatDateShort(currentProfile?.subscription_end_date)}</Text>
            </View>
          </View>

          {/* Progress bar */}
          {isActive && (
            <View style={styles.heroProgressSection}>
              <View style={styles.heroProgressTextRow}>
                <Text style={styles.heroProgressDays}>{remainingDays} يوم متبقي</Text>
                <Text style={styles.heroProgressExpiry}>انقضاء: {formatDateShort(currentProfile?.subscription_end_date)}</Text>
              </View>
              <View style={styles.heroProgressBarBg}>
                <View style={[styles.heroProgressBarFill, { width: `${progressPercent}%` }]} />
              </View>
            </View>
          )}

          {/* Plan cost */}
          <View style={styles.heroCostSection}>
            <Text style={styles.heroCostLabel}>قيمة الاشتراك</Text>
            <Text style={styles.heroCostValue}>
              {SubscriptionConfig.formatPrice(displayedTotalPrice)}
              <Text style={styles.heroCostPeriod}> / شهرياً</Text>
            </Text>
          </View>
        </View>

        {/* ─── Pending Payment Card ─── */}
        {pendingRequest && (
          <View style={styles.pendingCard}>
            <View style={styles.pendingIconRow}>
              <View style={styles.pendingIconCircle}>
                <Ionicons name="time" size={28} color={C.warningText} />
              </View>
            </View>
            <Text style={styles.pendingTitle}>طلبك الحالي تحت المراجعة</Text>
            <Text style={styles.pendingDate}>تم الإرسال: {formatDate(pendingRequest.created_at)}</Text>
            <View style={styles.pendingWarningBox}>
              <Ionicons name="alert-circle" size={16} color={C.warningText} />
              <Text style={styles.pendingWarningText}>لا يمكن إرسال طلب جديد حتى يتم مراجعة الطلب الحالي</Text>
            </View>
            <TouchableOpacity style={styles.pendingDetailsBtn} onPress={() => setInvoiceModalVisible(true)}>
              <Text style={styles.pendingDetailsBtnText}>عرض التفاصيل</Text>
              <Ionicons name="chevron-forward" size={18} color={C.primaryContainer} />
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Quick Actions Bento ─── */}
        <View style={styles.bentoGrid}>
          {/* Manage Subscription — hidden if pending */}
          {!pendingRequest && (
          <TouchableOpacity 
              style={[styles.bentoCard, isActive && styles.bentoCardDisabled,
                !isActive && isActuallyNew && { borderWidth: 1.5, borderColor: C.success }]} 
              onPress={() => !isActive && router.push('/subscription-management')}
              disabled={isActive}
              activeOpacity={0.7}
            >
              <View style={styles.bentoTopRow}>
                <View style={[styles.bentoIconBox, 
                  isActive && { backgroundColor: C.outlineVariant + '33' },
                  !isActive && isActuallyNew && { backgroundColor: '#ECFDF5' }
                ]}>
                  <Ionicons 
                    name={isActive ? "lock-closed-outline" : (isActuallyNew ? "rocket-outline" : "settings-outline")} 
                    size={24} 
                    color={isActive ? C.outline : (isActuallyNew ? C.success : C.primary)} 
                  />
                </View>
                {isActive ? (
                  <View style={styles.lockBadge}>
                    <Text style={styles.lockBadgeText}>مغلق</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={isActuallyNew ? C.success : C.outlineVariant} />
                )}
              </View>
              <View style={styles.bentoTextBox}>
                <Text style={[styles.bentoTitle, isActive && { color: C.outline }, !isActive && isActuallyNew && { color: C.success }]}>
                  {isActuallyNew ? 'تفعيل الباقة' : 'إدارة الاشتراك'}
                </Text>
                <Text style={styles.bentoDesc}>
                  {isActive 
                    ? 'التعديل والتجديد متاح عند انتهاء الاشتراك فقط' 
                    : (isActuallyNew ? 'اختر عدد الأفراد وابدأ رحلتك مع هيليكس' : 'إضافة أو حذف الحسابات وتجديد الباقة')}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Financial History — always visible */}
          <TouchableOpacity 
            style={styles.bentoCard} 
            onPress={() => router.push('/financial-history')}
            activeOpacity={0.7}
          >
            <View style={styles.bentoTopRow}>
              <View style={styles.bentoIconBox}>
                <Ionicons name="receipt-outline" size={24} color={C.primary} />
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.outlineVariant} />
            </View>
            <View style={styles.bentoTextBox}>
              <Text style={styles.bentoTitle}>السجل المالي</Text>
              <Text style={styles.bentoDesc}>عرض جميع المدفوعات والفواتير السابقة</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── Subscription Details Card ─── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>تفاصيل الاشتراك</Text>
        </View>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>اسم الباقة</Text>
            <Text style={styles.detailValue}>{SubscriptionConfig.PLAN_NAME}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>سعر الباقة الأساسية</Text>
            <Text style={styles.detailValue}>{SubscriptionConfig.formatPrice(SubscriptionConfig.BASE_PRICE)}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>الحسابات الإضافية</Text>
            <Text style={styles.detailValue}>{displayedSubAccountsCount} أفراد</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRowTotal}>
            <Text style={styles.detailTotalLabel}>إجمالي الاشتراك الشهري</Text>
            <View>
              <Text style={styles.detailTotalValue}>
                {SubscriptionConfig.formatPrice(displayedTotalPrice)}
              </Text>
              <Text style={styles.detailTotalSub}>التجديد القادم: {formatDateShort(currentProfile?.subscription_end_date)}</Text>
            </View>
          </View>
        </View>

        {/* ─── Included Features ─── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ميزات الباقة</Text>
        </View>
        <View style={styles.featuresCard}>
          {[
            { title: 'متابعة طبية مباشرة', desc: 'متابعة مستمرة ويومية من الطبيب والكوتش المخصص لك.' },
            { title: 'أنظمة غذائية تفصيلية', desc: 'وجبات محسوبة السعرات والمكونات متطابقة مع أهدافك الصحية.' },
            { title: 'خطط تمارين رياضية', desc: 'تمارين فيديو وصور متحركة للبيت أو الجيم تناسب لياقتك.' },
            { title: 'الملف الطبي الذكي', desc: 'تتبع المؤشرات الحيوية كالفحوصات والأمراض والحساسية.' },
          ].map((feature, idx) => (
            <View key={idx} style={[styles.featureItem, idx < 3 && { marginBottom: 16 }]}>
              <View style={styles.featureCheckCircle}>
                <Ionicons name="checkmark" size={14} color="#FFF" />
              </View>
              <View style={styles.featureTextBox}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ─── Pending Invoice Bottom Sheet Modal ─── */}
      {pendingRequest && (
        <Modal
          visible={invoiceModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setInvoiceModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setInvoiceModalVisible(false)}>
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <View style={styles.modalDragHandle} />
              <Text style={styles.modalTitle}>تفاصيل الطلب</Text>
              
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>رقم الطلب</Text>
                <Text style={styles.modalValue}>REQ-{pendingRequest.id.slice(0, 8).toUpperCase()}</Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>الخطة</Text>
                <Text style={styles.modalValue}>{SubscriptionConfig.PLAN_NAME}</Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>المبلغ</Text>
                <Text style={styles.modalValue}>{SubscriptionConfig.formatPrice(pendingRequest.amount)}</Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>تاريخ الإرسال</Text>
                <Text style={styles.modalValue}>{formatDate(pendingRequest.created_at)}</Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>الحالة</Text>
                <View style={styles.pendingStatusBadge}>
                  <Text style={styles.pendingStatusText}>قيد المراجعة</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setInvoiceModalVisible(false)}>
                <Text style={styles.modalCloseBtnText}>إغلاق</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  scrollContent: { padding: 20 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: C.background,
  },
  headerBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.cardSurface, justifyContent: 'center', alignItems: 'center', ...CARD_SHADOW },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.primary },
  crownBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primaryContainer, justifyContent: 'center', alignItems: 'center' },

  // Quick Status Card
  quickStatusCard: {
    backgroundColor: C.cardSurface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  quickStatusLeft: { alignItems: 'flex-start', gap: 6 },
  quickStatusPlan: { fontSize: 16, fontWeight: '700', color: C.primary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, gap: 5 },
  statusBadgeActive: { backgroundColor: '#ECFDF5' },
  statusBadgeExpired: { backgroundColor: '#FEF2F2' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusDotActive: { backgroundColor: C.success },
  statusDotExpired: { backgroundColor: C.error },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusBadgeTextActive: { color: '#065F46' },
  statusBadgeTextExpired: { color: '#991B1B' },
  quickStatusRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quickStatusItem: { alignItems: 'center' },
  quickStatusLabel: { fontSize: 10, fontWeight: '600', color: C.outline, marginBottom: 2 },
  quickStatusValue: { fontSize: 13, fontWeight: '800', color: C.primary },
  quickStatusDivider: { width: 1, height: 28, backgroundColor: C.outlineVariant },

  // Hero Card
  heroCard: { borderRadius: 24, padding: 24, marginBottom: 16, overflow: 'hidden', position: 'relative', ...CARD_SHADOW },
  heroCardActive: { backgroundColor: C.primaryContainer },
  heroCardExpired: { backgroundColor: C.primaryContainer },
  heroDecorativeCircle: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.04)' },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  heroPlanName: { fontSize: 22, fontWeight: '800', color: '#FFF', textAlign: 'left', marginBottom: 8 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, gap: 6 },
  heroBadgeActive: { backgroundColor: 'rgba(111, 251, 190, 0.2)' },
  heroBadgeExpired: { backgroundColor: 'rgba(186, 26, 26, 0.15)' },
  heroBadgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },
  heroBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  heroDatesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  heroDateItem: { alignItems: 'flex-start' },
  heroDateLabel: { fontSize: 10, fontWeight: '600', color: C.onPrimaryContainer, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  heroDateValue: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  heroProgressSection: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 16, marginBottom: 16 },
  heroProgressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  heroProgressDays: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  heroProgressExpiry: { fontSize: 11, fontWeight: '600', color: C.inversePrimary },
  heroProgressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  heroProgressBarFill: { height: '100%', backgroundColor: C.brandOrange, borderRadius: 4 },
  heroCostSection: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 16 },
  heroCostLabel: { fontSize: 10, fontWeight: '600', color: C.onPrimaryContainer, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  heroCostValue: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  heroCostPeriod: { fontSize: 14, fontWeight: '500', color: C.onPrimaryContainer },

  // Pending Card
  pendingCard: { backgroundColor: C.warningBg, borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#FDE68A' },
  pendingIconRow: { marginBottom: 12 },
  pendingIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FDE68A', justifyContent: 'center', alignItems: 'center' },
  pendingTitle: { fontSize: 16, fontWeight: '800', color: C.warningText, marginBottom: 4 },
  pendingDate: { fontSize: 12, fontWeight: '600', color: '#B45309', marginBottom: 12 },
  pendingWarningBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(146, 64, 14, 0.08)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginBottom: 16, width: '100%' },
  pendingWarningText: { flex: 1, fontSize: 11, fontWeight: '700', color: C.warningText, textAlign: 'left', lineHeight: 16 },
  pendingDetailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.cardSurface, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  pendingDetailsBtnText: { fontSize: 13, fontWeight: '700', color: C.primaryContainer },

  // Bento Grid
  bentoGrid: { gap: 12, marginBottom: 16 },
  bentoCard: {
    backgroundColor: C.cardSurface,
    borderRadius: 24,
    padding: 20,
    ...CARD_SHADOW,
  },
  bentoCardDisabled: { opacity: 0.65 },
  lockBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  lockBadgeText: { fontSize: 10, fontWeight: '700', color: C.outline },
  bentoTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  bentoIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.surfaceContainerLow, justifyContent: 'center', alignItems: 'center' },
  bentoTextBox: { alignItems: 'flex-start' },
  bentoTitle: { fontSize: 17, fontWeight: '700', color: C.primary, marginBottom: 4 },
  bentoDesc: { fontSize: 12, fontWeight: '500', color: C.onSurfaceVariant, textAlign: 'left' },

  // Section Header
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.primary, textAlign: 'left', marginLeft: 4 },

  // Details Card
  detailsCard: { backgroundColor: C.cardSurface, borderRadius: 24, padding: 20, marginBottom: 16, ...CARD_SHADOW },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  detailLabel: { fontSize: 14, fontWeight: '500', color: C.onSurfaceVariant },
  detailValue: { fontSize: 15, fontWeight: '700', color: C.primary },
  detailDivider: { height: 1, backgroundColor: C.surfaceContainerLow },
  detailRowTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 },
  detailTotalLabel: { fontSize: 15, fontWeight: '700', color: C.primary },
  detailTotalValue: { fontSize: 22, fontWeight: '800', color: C.primary },
  detailTotalSub: { fontSize: 11, fontWeight: '600', color: C.onSurfaceVariant, marginTop: 2 },

  // Features Card
  featuresCard: { backgroundColor: C.cardSurface, borderRadius: 24, padding: 20, marginBottom: 16, ...CARD_SHADOW },
  featureItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  featureCheckCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.primaryContainer, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  featureTextBox: { flex: 1, alignItems: 'flex-start' },
  featureTitle: { fontSize: 14, fontWeight: '700', color: C.primary, marginBottom: 2 },
  featureDesc: { fontSize: 12, fontWeight: '500', color: C.onSurfaceVariant, textAlign: 'left', lineHeight: 18 },

  // Alert Screen (Sub Account)
  alertContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  alertIconBox: { width: 80, height: 80, backgroundColor: '#FEF2F2', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  alertTitle: { fontSize: 20, fontWeight: '800', color: C.primary, marginBottom: 8, textAlign: 'center' },
  alertText: { textAlign: 'center', color: C.outline, lineHeight: 22, fontSize: 13, marginBottom: 24 },
  alertStepsBox: { backgroundColor: '#EFF0EB', padding: 16, borderRadius: 16, width: '100%', marginBottom: 24 },
  alertStepsTitle: { fontSize: 13, fontWeight: '800', color: C.primary, marginBottom: 8, textAlign: 'left' },
  alertStep: { fontSize: 12, color: C.outline, textAlign: 'left', marginBottom: 4, fontWeight: '700' },
  alertBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, width: '100%', padding: 16, borderRadius: 16 },
  alertBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.cardSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalDragHandle: { width: 40, height: 4, backgroundColor: C.outlineVariant, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.primary, textAlign: 'left', marginBottom: 20 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  modalLabel: { fontSize: 13, fontWeight: '500', color: C.onSurfaceVariant },
  modalValue: { fontSize: 14, fontWeight: '700', color: C.primary },
  modalDivider: { height: 1, backgroundColor: C.surfaceContainerLow },
  pendingStatusBadge: { backgroundColor: C.warningBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pendingStatusText: { fontSize: 11, fontWeight: '700', color: C.warningText },
  modalCloseBtn: { marginTop: 24, backgroundColor: C.surfaceContainerLow, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalCloseBtnText: { fontSize: 14, fontWeight: '700', color: C.primary },
}) as any;