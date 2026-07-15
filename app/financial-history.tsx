import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Text } from '@/components/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFamily } from '../src/context/FamilyContext';
import { usePaymentHistory } from '../src/features/subscriptions/hooks/useSubscriptionData';
import { SubscriptionConfig } from '../constants/subscriptionConfig';
import { PaymentRequest } from '../src/types';
import { AnimatedButton } from '../components/animations/AnimatedButton';
import { FadeInView } from '../components/animations/FadeInView';
import { SlideInView } from '../components/animations/SlideInView';
import { paymentTypeLabel } from '../src/features/subscriptions/resolveSubscriptionState';

const C = {
  primary: '#12362e',
  primaryContainer: '#2A4D44',
  brandOrange: '#F26E11',
  success: '#10B981',
  error: '#ba1a1a',
  background: '#F9F8F3',
  cardSurface: '#FFFFFF',
  onSurface: '#121c2a',
  onSurfaceVariant: '#414846',
  outline: '#717975',
  outlineVariant: '#c1c8c4',
  surfaceContainerLow: '#eff4ff',
  warningBg: '#FEF3C7',
  warningText: '#92400E',
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

type FilterStatus = 'all' | 'approved' | 'pending' | 'rejected';

export default function FinancialHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { currentProfile } = useFamily();
  const userId = currentProfile?.id;

  const {
    loading,
    refreshing,
    history,
    onRefresh,
  } = usePaymentHistory(userId);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<PaymentRequest | null>(null);

  // Filter history list
  const filteredHistory = history.filter(item => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  // Calculate total invested (only approved)
  const totalInvested = history
    .filter(item => item.status === 'approved')
    .reduce((sum, item) => sum + item.amount, 0);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatDateShort = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <FadeInView delay={50} style={styles.header}>
        <AnimatedButton onPress={() => router.back()} style={styles.headerBackBtn}>
          <Ionicons name="arrow-forward" size={24} color={C.primary} />
        </AnimatedButton>
        <Text style={styles.headerTitle}>السجل المالي</Text>
        <View style={styles.crownBadge}>
          <Ionicons name="star" size={18} color="#D4AF37" />
        </View>
      </FadeInView>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        {/* Summary Dashboard Grid */}
        <SlideInView delay={100} direction="up" style={styles.dashboardGrid}>
          <View style={styles.dashboardCardPrimary}>
            <View style={styles.dashboardDecorativeCircle} />
            <Text style={styles.dashboardCardLabel}>إجمالي المدفوعات المقبولة</Text>
            <Text style={styles.dashboardCardValuePrimary}>
              {SubscriptionConfig.formatPrice(totalInvested)}
            </Text>
            <View style={styles.dashboardCardFooterPrimary}>
              <Ionicons name="trending-up" size={14} color="#6FFBEE" />
              <Text style={styles.dashboardCardFooterTextPrimary}>تم التحقق منها وتفعيلها</Text>
            </View>
          </View>

          <View style={styles.dashboardSubGrid}>
            <View style={styles.dashboardCard}>
              <Text style={styles.dashboardCardLabelSecondary}>إجمالي المعاملات</Text>
              <Text style={styles.dashboardCardValueSecondary}>{history.length}</Text>
              <Text style={styles.dashboardCardFooterText}>طلب إيداع ومراجعة</Text>
            </View>

            <View style={styles.dashboardCard}>
              <Text style={styles.dashboardCardLabelSecondary}>التجديد القادم</Text>
              <Text style={styles.dashboardCardValueDate}>
                {formatDateShort(currentProfile?.subscription_end_date)}
              </Text>
              <AnimatedButton 
                style={styles.manageBillingBtn}
                onPress={() => router.push('/subscription-management')}
              >
                <Text style={styles.manageBillingText}>إدارة الباقة</Text>
                <Ionicons name="open-outline" size={10} color={C.brandOrange} />
              </AnimatedButton>
            </View>
          </View>
        </SlideInView>

        {/* Filter Chips */}
        <SlideInView delay={150} direction="up" style={styles.filterContainer}>
          {[
            { id: 'all', label: 'الكل' },
            { id: 'approved', label: 'مقبول' },
            { id: 'pending', label: 'تحت المراجعة' },
            { id: 'rejected', label: 'مرفوض' },
          ].map(chip => (
            <AnimatedButton
              key={chip.id}
              style={[styles.filterChip, filterStatus === chip.id && styles.filterChipActive]}
              onPress={() => setFilterStatus(chip.id as FilterStatus)}
            >
              <Text style={[styles.filterChipText, filterStatus === chip.id && styles.filterChipTextActive]}>
                {chip.label}
              </Text>
            </AnimatedButton>
          ))}
        </SlideInView>

        {/* Transactions list */}
        <View style={styles.transactionsHeader}>
          <Text style={styles.transactionsTitle}>جميع المعاملات</Text>
          <Text style={styles.transactionsCount}>إجمالي {filteredHistory.length} فواتير</Text>
        </View>

        {filteredHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={C.outlineVariant} />
            <Text style={styles.emptyText}>لا توجد معاملات مطابقة للفلتر المحدد</Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {filteredHistory.map((item, index) => (
              <SlideInView key={item.id} delay={200 + index * 50} direction="up">
              <View style={styles.invoiceCard}>
                <View style={styles.invoiceCardHeader}>
                  <View style={styles.invoiceCardHeaderRight}>
                    <View style={styles.receiptIconCircle}>
                      <Ionicons name="receipt-outline" size={20} color={C.primary} />
                    </View>
                    <View style={styles.invoiceMeta}>
                      <Text style={styles.invoiceId}>{item.invoice_number || `REQ-${item.id.slice(0, 8).toUpperCase()}`}</Text>
                      <Text style={styles.invoiceDate}>{formatDate(item.created_at)}</Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    item.status === 'approved' ? styles.badgeApproved : 
                    item.status === 'rejected' ? styles.badgeRejected : 
                    styles.badgePending
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      item.status === 'approved' ? styles.badgeTextApproved : 
                      item.status === 'rejected' ? styles.badgeTextRejected : 
                      styles.badgeTextPending
                    ]}>
                      {item.status === 'approved' ? 'مقبول' : item.status === 'rejected' ? 'مرفوض' : 'تحت المراجعة'}
                    </Text>
                  </View>
                </View>

                <View style={styles.invoiceDetailsGrid}>
                  <View style={styles.invoiceGridItem}>
                    <Text style={styles.gridLabel}>العملية</Text>
                    <Text style={styles.gridValue}>
                      {paymentTypeLabel[item.payment_type || ''] || 'تفعيل جديد'}
                    </Text>
                  </View>
                  <View style={styles.invoiceGridItem}>
                    <Text style={styles.gridLabel}>المقاعد العائلية</Text>
                    <Text style={styles.gridValue}>
                      {item.requested_family_quota || 0} حسابات
                    </Text>
                  </View>
                  <View style={styles.invoiceGridItem}>
                    <Text style={styles.gridLabel}>القيمة المطلوبة</Text>
                    <Text style={styles.gridValuePrice}>{SubscriptionConfig.formatPrice(item.amount)}</Text>
                  </View>
                </View>

                {item.status === 'rejected' && item.rejection_reason && (
                  <View style={styles.rejectionCard}>
                    <Text style={styles.rejectionLabel}>سبب الرفض:</Text>
                    <Text style={styles.rejectionText}>{item.rejection_reason}</Text>
                  </View>
                )}

                <View style={styles.invoiceCardActions}>
                  {item.status === 'rejected' ? (
                    <AnimatedButton 
                      style={styles.retryBtn}
                      onPress={() => router.push({
                        pathname: '/subscription-payment',
                        params: {
                          retryInvoiceId: item.id,
                          newSubCount: String(item.requested_family_quota || 0),
                          paymentType: item.payment_type || 'new',
                          totalPrice: String(item.amount),
                          selectedMembersToKeep: JSON.stringify(item.keep_member_ids || []),
                        }
                      })}
                    >
                      <Text style={styles.retryBtnText}>إعادة الدفع</Text>
                      <Ionicons name="refresh" size={14} color="#FFF" />
                    </AnimatedButton>
                  ) : (
                    <AnimatedButton 
                      style={styles.detailsBtn}
                      onPress={() => setSelectedInvoice(item)}
                    >
                      <Text style={styles.detailsBtnText}>عرض التفاصيل</Text>
                      <Ionicons name="eye-outline" size={14} color={C.primaryContainer} />
                    </AnimatedButton>
                  )}
                </View>
              </View>
              </SlideInView>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Invoice Details Bottom Sheet Modal */}
      {selectedInvoice && (
        <Modal
          visible={!!selectedInvoice}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedInvoice(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setSelectedInvoice(null)}>
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <View style={styles.modalDragHandle} />
              <Text style={styles.modalTitle}>تفاصيل المعاملة</Text>
              
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>رقم الطلب</Text>
                <Text style={styles.modalValue}>{selectedInvoice.invoice_number || `REQ-${selectedInvoice.id.slice(0, 8).toUpperCase()}`}</Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>نوع العملية</Text>
                <Text style={styles.modalValue}>{paymentTypeLabel[selectedInvoice.payment_type || ''] || 'تفعيل جديد'}</Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>عدد حسابات العائلة</Text>
                <Text style={styles.modalValue}>
                  {selectedInvoice.requested_family_quota || 0} حسابات
                </Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>المبلغ المطلوب</Text>
                <Text style={styles.modalValue}>{SubscriptionConfig.formatPrice(selectedInvoice.amount)}</Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>المبلغ المحوّل المعلن</Text>
                <Text style={styles.modalValue}>
                  {selectedInvoice.declared_transferred_amount 
                    ? SubscriptionConfig.formatPrice(selectedInvoice.declared_transferred_amount) 
                    : 'لم يحدد'}
                </Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>المبلغ المؤكد إدارياً</Text>
                <Text style={styles.modalValuePrice}>
                  {selectedInvoice.admin_confirmed_amount 
                    ? SubscriptionConfig.formatPrice(selectedInvoice.admin_confirmed_amount) 
                    : 'تحت المراجعة'}
                </Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>تاريخ التقديم</Text>
                <Text style={styles.modalValue}>{formatDate(selectedInvoice.created_at)}</Text>
              </View>
              {selectedInvoice.reviewed_at && (
                <>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>تاريخ المراجعة</Text>
                    <Text style={styles.modalValue}>{formatDate(selectedInvoice.reviewed_at)}</Text>
                  </View>
                </>
              )}
              {selectedInvoice.admin_notes && (
                <>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalNotesRow}>
                    <Text style={styles.modalLabel}>ملاحظات الإدارة:</Text>
                    <Text style={styles.modalNotesValue}>{selectedInvoice.admin_notes}</Text>
                  </View>
                </>
              )}
              <View style={styles.modalDivider} />
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>الحالة</Text>
                <View style={[
                  styles.statusBadge,
                  selectedInvoice.status === 'approved' ? styles.badgeApproved : 
                  selectedInvoice.status === 'rejected' ? styles.badgeRejected : 
                  styles.badgePending
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    selectedInvoice.status === 'approved' ? styles.badgeTextApproved : 
                    selectedInvoice.status === 'rejected' ? styles.badgeTextRejected : 
                    styles.badgeTextPending
                  ]}>
                    {selectedInvoice.status === 'approved' ? 'مقبول' : selectedInvoice.status === 'rejected' ? 'مرفوض' : 'تحت المراجعة'}
                  </Text>
                </View>
              </View>

              <AnimatedButton style={styles.modalCloseBtn} onPress={() => setSelectedInvoice(null)}>
                <Text style={styles.modalCloseBtnText}>إغلاق</Text>
              </AnimatedButton>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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

  // Dashboard Grid
  dashboardGrid: { gap: 12, marginBottom: 20 },
  dashboardCardPrimary: { backgroundColor: C.primaryContainer, borderRadius: 24, padding: 24, overflow: 'hidden', position: 'relative', ...CARD_SHADOW },
  dashboardDecorativeCircle: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.04)' },
  dashboardCardLabel: { fontSize: 12, fontWeight: '600', color: C.onPrimaryContainer, marginBottom: 6, textAlign: 'right' },
  dashboardCardValuePrimary: { fontSize: 28, fontWeight: '900', color: '#FFF', textAlign: 'right', marginBottom: 12 },
  dashboardCardFooterPrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12 },
  dashboardCardFooterTextPrimary: { fontSize: 11, fontWeight: '600', color: '#FFF' },

  dashboardSubGrid: { flexDirection: 'row', gap: 12 },
  dashboardCard: { flex: 1, backgroundColor: C.cardSurface, borderRadius: 24, padding: 16, justifyContent: 'space-between', ...CARD_SHADOW },
  dashboardCardLabelSecondary: { fontSize: 11, fontWeight: '600', color: C.outline, textAlign: 'right', marginBottom: 8 },
  dashboardCardValueSecondary: { fontSize: 22, fontWeight: '900', color: C.primary, textAlign: 'right', marginBottom: 6 },
  dashboardCardFooterText: { fontSize: 10, color: C.outline, textAlign: 'right' },
  dashboardCardValueDate: { fontSize: 14, fontWeight: '800', color: C.primary, textAlign: 'right', marginBottom: 12 },

  manageBillingBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  manageBillingText: { fontSize: 10, fontWeight: '800', color: C.brandOrange },

  // Filters
  filterContainer: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: C.cardSurface, borderWidth: 1, borderColor: C.outlineVariant, ...CARD_SHADOW },
  filterChipActive: { backgroundColor: C.primaryContainer, borderColor: C.primaryContainer },
  filterChipText: { fontSize: 12, fontWeight: '700', color: C.outline },
  filterChipTextActive: { color: '#FFF' },

  // Transactions Header
  transactionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  transactionsTitle: { fontSize: 15, fontWeight: '700', color: C.primary },
  transactionsCount: { fontSize: 12, fontWeight: '600', color: C.outline },

  // Empty State
  emptyContainer: { backgroundColor: C.cardSurface, borderRadius: 24, padding: 40, alignItems: 'center', justifyContent: 'center', ...CARD_SHADOW },
  emptyText: { fontSize: 13, fontWeight: '600', color: C.outline, marginTop: 12 },

  // Transactions List
  transactionsList: { gap: 12 },
  invoiceCard: { backgroundColor: C.cardSurface, borderRadius: 24, padding: 20, ...CARD_SHADOW },
  invoiceCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  invoiceCardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  receiptIconCircle: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surfaceContainerLow, justifyContent: 'center', alignItems: 'center' },
  invoiceMeta: { alignItems: 'flex-end' },
  invoiceId: { fontSize: 14, fontWeight: '800', color: C.primary },
  invoiceDate: { fontSize: 11, fontWeight: '600', color: C.outline, marginTop: 2 },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  badgeApproved: { backgroundColor: '#ECFDF5' },
  badgeTextApproved: { color: '#065F46', fontSize: 11, fontWeight: '700' },
  badgePending: { backgroundColor: C.warningBg },
  badgeTextPending: { color: C.warningText, fontSize: 11, fontWeight: '700' },
  badgeRejected: { backgroundColor: '#FEF2F2' },
  badgeTextRejected: { color: '#991B1B', fontSize: 11, fontWeight: '700' },

  invoiceDetailsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, borderTopWidth: 1, borderTopColor: C.background, borderBottomWidth: 1, borderBottomColor: C.background, paddingVertical: 12 },
  invoiceGridItem: { alignItems: 'center', flex: 1 },
  gridLabel: { fontSize: 9, fontWeight: '600', color: C.outline, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  gridValue: { fontSize: 12, fontWeight: '700', color: C.primary },
  gridValuePrice: { fontSize: 13, fontWeight: '800', color: C.brandOrange },

  rejectionCard: { backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12, marginBottom: 16, borderStartWidth: 4, borderStartColor: C.error },
  rejectionLabel: { fontSize: 11, fontWeight: '800', color: C.error, textAlign: 'left', marginBottom: 2 },
  rejectionText: { fontSize: 12, color: '#991B1B', textAlign: 'left' },

  invoiceCardActions: { alignItems: 'flex-start' },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: C.background, borderWidth: 1, borderColor: C.outlineVariant },
  detailsBtnText: { fontSize: 11, fontWeight: '700', color: C.primaryContainer },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: C.brandOrange, ...CARD_SHADOW },
  retryBtnText: { fontSize: 11, fontWeight: '800', color: '#FFF' },

  // Modal Sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.cardSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalDragHandle: { width: 40, height: 4, backgroundColor: C.outlineVariant, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.primary, textAlign: 'left', marginBottom: 20 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  modalLabel: { fontSize: 13, fontWeight: '500', color: C.onSurfaceVariant },
  modalValue: { fontSize: 14, fontWeight: '700', color: C.primary },
  modalValuePrice: { fontSize: 15, fontWeight: '800', color: C.brandOrange },
  modalNotesRow: { paddingVertical: 10, alignItems: 'flex-start' },
  modalNotesValue: { fontSize: 13, color: C.onSurfaceVariant, marginTop: 4, textAlign: 'left' },
  modalDivider: { height: 1, backgroundColor: C.background },
  modalCloseBtn: { marginTop: 24, backgroundColor: C.surfaceContainerLow, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalCloseBtnText: { fontSize: 14, fontWeight: '700', color: C.primary },
});
