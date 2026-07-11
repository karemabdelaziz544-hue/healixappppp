import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Clipboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFamily } from '../src/context/FamilyContext';
import { useSubscriptionData } from '../src/features/subscriptions/hooks/useSubscriptionData';
import { SubscriptionConfig } from '../constants/subscriptionConfig';

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

export default function SubscriptionPaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const retryInvoiceId = params.retryInvoiceId as string;

  const { currentProfile, familyMembers } = useFamily();
  const userId = currentProfile?.id;
  const subMembers = familyMembers.filter(m => m.manager_id === userId);
  const subAccountsCount = subMembers.length;

  const {
    loading,
    newSubCount,
    receiptFile,
    uploading,
    totalPrice,
    handlePickReceipt,
    handleSubmitRequest,
  } = useSubscriptionData(userId, subAccountsCount, subMembers);

  // Detect if this is a brand-new user (first-time subscription) vs a renewal
  const isActuallyNew = currentProfile?.subscription_status === 'new' || 
                        (!currentProfile?.subscription_end_date && 
                         !currentProfile?.is_onboarded && 
                         currentProfile?.subscription_status === 'expired');

  const pageTitle = isActuallyNew ? 'تفعيل الباقة' : 'تأكيد الدفع';
  const summaryTitle = isActuallyNew ? 'ملخص اشتراكك الجديد' : 'ملخص التجديد';
  const infoNote = isActuallyNew 
    ? 'سيتم تفعيل باقتك وحسابات عائلتك فور مراجعة التحويل وتأكيده من قبل الإدارة (عادةً خلال أقل من 24 ساعة).' 
    : 'سيتم تفعيل اشتراكك وحسابات عائلتك فور مراجعة التحويل وتأكيده من قبل الإدارة (عادةً خلال أقل من 24 ساعة).';

  const [enteredAmount, setEnteredAmount] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Validation States
  const amountNum = parseFloat(enteredAmount);
  const isAmountValid = !isNaN(amountNum) && amountNum > 0;
  const isExactMatch = isAmountValid && amountNum === totalPrice;
  const isOverpaid = isAmountValid && amountNum > totalPrice;
  const isUnderpaid = isAmountValid && amountNum < totalPrice;

  const handleCopy = (text: string, label: string) => {
    Clipboard.setString(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const onSubmit = async () => {
    if (!receiptFile) {
      Alert.alert("تنبيه", "يرجى رفع صورة إيصال التحويل أولاً.");
      return;
    }

    const success = await handleSubmitRequest();
    if (success) {
      // Navigate to success screen
      router.replace({
        pathname: '/payment-success',
        params: {
          totalPrice: totalPrice.toString(),
          invoiceId: retryInvoiceId || '',
        }
      });
    }
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
          <Ionicons name="arrow-forward" size={24} color={C.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pageTitle}</Text>
        <View style={styles.crownBadge}>
          {isActuallyNew 
            ? <Ionicons name="sparkles" size={18} color={C.success} />
            : <Ionicons name="star" size={18} color="#D4AF37" />}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Retry Payment Notification */}
        {!!retryInvoiceId && (
          <View style={styles.retryBanner}>
            <Ionicons name="refresh-circle" size={20} color={C.brandOrange} />
            <Text style={styles.retryBannerText}>
              إعادة محاولة الدفع لطلب رقم REQ-{retryInvoiceId.slice(0, 8).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Subscription Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryDecorativeCircle} />
          <Text style={styles.summaryCardTitle}>{summaryTitle}</Text>
          
          <View style={styles.summaryBreakdown}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>الباقة</Text>
              <Text style={styles.summaryValue}>{SubscriptionConfig.PLAN_NAME}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>الحسابات الإضافية</Text>
              <Text style={styles.summaryValue}>{newSubCount} حسابات</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>تفصيل السعر</Text>
              <Text style={styles.summaryPriceText}>
                {SubscriptionConfig.BASE_PRICE} + ({newSubCount} × {SubscriptionConfig.PER_MEMBER})
              </Text>
            </View>
          </View>

          <View style={styles.summaryTotalSection}>
            <Text style={styles.summaryTotalValue}>{SubscriptionConfig.formatPrice(totalPrice)}</Text>
            <Text style={styles.summaryTotalLabel}>المبلغ الإجمالي المطلوب تحويله</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>وسائل التحويل المتاحة</Text>
        </View>
        <View style={styles.methodsContainer}>
          {/* InstaPay */}
          <View style={[styles.methodCard, styles.methodCardSelected]}>
            <View style={styles.methodCardRight}>
              <View style={styles.methodIconCircle}>
                <Ionicons name="wallet-outline" size={20} color={C.primary} />
              </View>
              <View style={styles.methodTextColumn}>
                <Text style={styles.methodName}>تطبيق انستاباي (InstaPay)</Text>
                <Text style={styles.methodDetail}>healix@instapay</Text>
                <Text style={styles.methodSubDetail}>الاسم: Healix Healthcare</Text>
              </View>
            </View>
            <View style={styles.methodCardLeft}>
              <View style={styles.methodSelectedBadge}>
                <Text style={styles.methodSelectedBadgeText}>افتراضي</Text>
              </View>
              <TouchableOpacity 
                onPress={() => handleCopy('healix@instapay', 'instapay')}
                style={styles.copyBtn}
              >
                <Ionicons name={copiedText === 'instapay' ? "checkmark" : "copy-outline"} size={16} color={C.primary} />
                <Text style={styles.copyBtnText}>{copiedText === 'instapay' ? "تم النسخ" : "نسخ العنوان"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Vodafone Cash */}
          <View style={styles.methodCard}>
            <View style={styles.methodCardRight}>
              <View style={styles.methodIconCircle}>
                <Ionicons name="phone-portrait-outline" size={20} color={C.primary} />
              </View>
              <View style={styles.methodTextColumn}>
                <Text style={styles.methodName}>فودافون كاش (Vodafone Cash)</Text>
                <Text style={styles.methodDetail}>01026042079</Text>
                <Text style={styles.methodSubDetail}>الاسم: إدارة هيليكس</Text>
              </View>
            </View>
            <View style={styles.methodCardLeft}>
              <TouchableOpacity 
                onPress={() => handleCopy('01026042079', 'vodafone')}
                style={styles.copyBtn}
              >
                <Ionicons name={copiedText === 'vodafone' ? "checkmark" : "copy-outline"} size={16} color={C.primary} />
                <Text style={styles.copyBtnText}>{copiedText === 'vodafone' ? "تم النسخ" : "نسخ الرقم"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Validation Amount Input */}
        <View style={styles.validationSection}>
          <Text style={styles.validationTitle}>أدخل المبلغ المحوّل للتحقق</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.amountInput}
              placeholder="اكتب المبلغ المحوّل هنا"
              placeholderTextColor={C.outline}
              keyboardType="numeric"
              value={enteredAmount}
              onChangeText={setEnteredAmount}
            />
            <Text style={styles.inputCurrency}>EGP</Text>
          </View>

          {/* Validation Feedback messages */}
          {isAmountValid && (
            <View style={styles.feedbackContainer}>
              {isUnderpaid && (
                <View style={[styles.feedbackCard, styles.feedbackError]}>
                  <Ionicons name="close-circle" size={18} color={C.error} />
                  <Text style={styles.feedbackErrorText}>
                    المبلغ المدخل أقل من الإجمالي المطلوب. يرجى التحقق.
                  </Text>
                </View>
              )}

              {isOverpaid && (
                <View style={[styles.feedbackCard, styles.feedbackWarning]}>
                  <Ionicons name="warning" size={18} color={C.warningText} />
                  <Text style={styles.feedbackWarningText}>
                    لقد قمت بتحويل مبلغ أكبر من المطلوب. سيتم مراجعة قيمة التحويل بواسطة الإدارة.
                  </Text>
                </View>
              )}

              {isExactMatch && (
                <View style={[styles.feedbackCard, styles.feedbackSuccess]}>
                  <Ionicons name="checkmark-circle" size={18} color={C.success} />
                  <Text style={styles.feedbackSuccessText}>
                    المبلغ مطابق! يرجى رفع صورة إيصال التحويل.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Upload Screenshot (shows only when validation matches or exceeds) */}
        {(isExactMatch || isOverpaid) && (
          <View style={styles.uploadSection}>
            <Text style={styles.uploadTitle}>رفع صورة إيصال التحويل</Text>
            <TouchableOpacity 
              style={[styles.uploadBox, receiptFile && styles.uploadBoxSuccess]}
              onPress={handlePickReceipt}
              activeOpacity={0.8}
            >
              <View style={[styles.uploadIconCircle, receiptFile && styles.uploadIconCircleSuccess]}>
                <Ionicons 
                  name={receiptFile ? "checkmark" : "cloud-upload-outline"} 
                  size={28} 
                  color={receiptFile ? C.success : C.primary} 
                />
              </View>
              <Text style={[styles.uploadBoxText, receiptFile && styles.uploadBoxTextSuccess]}>
                {receiptFile ? receiptFile.name : "اضغط هنا لإرفاق لقطة الشاشة"}
              </Text>
              <Text style={styles.uploadBoxSubtext}>صيغ الملفات المدعومة: PNG, JPG, JPEG</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info Note */}
        <View style={[styles.infoNoteCard, isActuallyNew && { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' }]}>
          <Ionicons name={isActuallyNew ? "rocket" : "information-circle"} size={20} color={isActuallyNew ? C.success : C.primary} />
          <Text style={[styles.infoNoteText, isActuallyNew && { color: '#065F46' }]}>
            {infoNote}
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Submit Button */}
      <View style={[styles.bottomAction, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        <TouchableOpacity 
          style={[styles.submitBtn, (!(isExactMatch || isOverpaid) || !receiptFile) && styles.submitBtnDisabled]} 
          onPress={onSubmit}
          disabled={!(isExactMatch || isOverpaid) || !receiptFile || uploading}
          activeOpacity={0.9}
        >
          {uploading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>تأكيد وإرسال طلب الدفع</Text>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </View>
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

  // Retry Banner
  retryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.warningBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  retryBannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: C.warningText, textAlign: 'left' },

  // Summary Card
  summaryCard: { backgroundColor: C.primaryContainer, borderRadius: 24, padding: 24, marginBottom: 20, overflow: 'hidden', position: 'relative', ...CARD_SHADOW },
  summaryDecorativeCircle: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.04)' },
  summaryCardTitle: { fontSize: 16, fontWeight: '800', color: '#FFF', textAlign: 'left', marginBottom: 16 },
  summaryBreakdown: { gap: 12 },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 12, fontWeight: '500', color: C.onPrimaryContainer },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  summaryPriceText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  summaryTotalSection: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 16, marginTop: 16, alignItems: 'center' },
  summaryTotalValue: { fontSize: 28, fontWeight: '900', color: C.brandOrange, marginBottom: 4 },
  summaryTotalLabel: { fontSize: 11, fontWeight: '600', color: C.onPrimaryContainer },

  // Section Header
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.primary, textAlign: 'left', marginRight: 4 },

  // Methods
  methodsContainer: { gap: 12, marginBottom: 20 },
  methodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.cardSurface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    ...CARD_SHADOW,
  },
  methodCardSelected: { borderColor: C.primaryContainer, borderWidth: 2 },
  methodCardRight: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  methodIconCircle: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surfaceContainerLow, justifyContent: 'center', alignItems: 'center' },
  methodTextColumn: { alignItems: 'flex-start' },
  methodName: { fontSize: 13, fontWeight: '700', color: C.primary, marginBottom: 2 },
  methodDetail: { fontSize: 14, fontWeight: '800', color: C.brandOrange, fontFamily: 'monospace' },
  methodSubDetail: { fontSize: 11, fontWeight: '600', color: C.outline, marginTop: 2 },
  methodCardLeft: { alignItems: 'flex-start', gap: 8 },
  methodSelectedBadge: { backgroundColor: C.primaryContainer, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  methodSelectedBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: C.background, borderWidth: 1, borderColor: C.outlineVariant },
  copyBtnText: { fontSize: 11, fontWeight: '700', color: C.primary },

  // Validation Section
  validationSection: { backgroundColor: C.cardSurface, borderRadius: 24, padding: 20, marginBottom: 20, ...CARD_SHADOW },
  validationTitle: { fontSize: 14, fontWeight: '700', color: C.primary, textAlign: 'left', marginBottom: 12 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.background, borderRadius: 16, borderWidth: 1, borderColor: C.outlineVariant, paddingHorizontal: 16 },
  amountInput: { flex: 1, height: 54, fontSize: 16, fontWeight: '700', color: C.primary, textAlign: 'left' },
  inputCurrency: { fontSize: 14, fontWeight: '800', color: C.primaryContainer, marginLeft: 8 },
  feedbackContainer: { marginTop: 12 },
  feedbackCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12 },
  feedbackError: { backgroundColor: '#FEF2F2', borderLeftWidth: 4, borderLeftColor: C.error },
  feedbackErrorText: { flex: 1, fontSize: 11, fontWeight: '700', color: C.error, textAlign: 'left', lineHeight: 16 },
  feedbackWarning: { backgroundColor: C.warningBg, borderLeftWidth: 4, borderLeftColor: C.brandOrange },
  feedbackWarningText: { flex: 1, fontSize: 11, fontWeight: '700', color: C.warningText, textAlign: 'left', lineHeight: 16 },
  feedbackSuccess: { backgroundColor: '#ECFDF5', borderLeftWidth: 4, borderLeftColor: C.success },
  feedbackSuccessText: { flex: 1, fontSize: 11, fontWeight: '700', color: '#065F46', textAlign: 'left' },

  // Upload Section
  uploadSection: { backgroundColor: C.cardSurface, borderRadius: 24, padding: 20, marginBottom: 20, ...CARD_SHADOW },
  uploadTitle: { fontSize: 14, fontWeight: '700', color: C.primary, textAlign: 'left', marginBottom: 12 },
  uploadBox: { borderStyle: 'dashed', borderWidth: 2, borderColor: C.outlineVariant, borderRadius: 16, padding: 24, alignItems: 'center', backgroundColor: '#FAF9F6' },
  uploadBoxSuccess: { borderColor: C.success, backgroundColor: '#F0FDF4' },
  uploadIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.surfaceContainerLow, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  uploadIconCircleSuccess: { backgroundColor: '#DCFCE7' },
  uploadBoxText: { fontSize: 13, fontWeight: '800', color: C.outline, textAlign: 'center' },
  uploadBoxTextSuccess: { color: '#137333' },
  uploadBoxSubtext: { fontSize: 10, color: C.outline, marginTop: 4 },

  // Info note
  infoNoteCard: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: C.surfaceContainerLow, marginBottom: 20 },
  infoNoteText: { flex: 1, fontSize: 12, fontWeight: '600', color: C.primaryContainer, textAlign: 'left', lineHeight: 18 },

  // Bottom action
  bottomAction: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(249, 248, 243, 0.95)', paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.outlineVariant },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.brandOrange, paddingVertical: 16, borderRadius: 16, ...CARD_SHADOW },
  submitBtnDisabled: { backgroundColor: C.outlineVariant, opacity: 0.7 },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
});
