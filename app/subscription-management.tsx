import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

export default function SubscriptionManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentProfile, familyMembers } = useFamily();
  const userId = currentProfile?.id;
  const subMembers = familyMembers.filter(m => m.manager_id === userId);
  const subAccountsCount = subMembers.length;

  const {
    loading,
    newSubCount,
    setNewSubCount,
    selectedMembersToKeep,
    setSelectedMembersToKeep,
    toggleMemberSelection,
    totalPrice,
  } = useSubscriptionData(userId, subAccountsCount, subMembers);

  const isActive = currentProfile?.subscription_status === 'active' && 
                   currentProfile?.subscription_end_date && 
                   new Date(currentProfile.subscription_end_date) > new Date();

  const isActuallyNew = currentProfile?.subscription_status === 'new' || 
                        (!currentProfile?.subscription_end_date && 
                         !currentProfile?.is_onboarded && 
                         currentProfile?.subscription_status === 'expired');

  // If sub count is less than current members, we need user to select who to keep
  const requiresSelection = newSubCount < subAccountsCount;

  // Set default selected members when newSubCount is equal or larger
  useEffect(() => {
    if (newSubCount >= subAccountsCount) {
      setSelectedMembersToKeep(subMembers.map(m => m.id));
    }
  }, [newSubCount, subAccountsCount]);

  const handleContinue = () => {
    // Check if there are changes
    const countChanged = newSubCount !== subAccountsCount;
    
    // If not expired and no count changes, guard
    if (isActive && !countChanged) {
      Alert.alert("تنبيه", "لم يتم إجراء أي تغييرات على الاشتراك.");
      return;
    }

    // If selection is required, make sure the user chose exactly newSubCount members
    if (requiresSelection && selectedMembersToKeep.length !== newSubCount) {
      Alert.alert(
        "تنبيه", 
        `يرجى اختيار ${newSubCount} أفراد للإبقاء عليهم في الباقة الجديدة.`
      );
      return;
    }

    // Proceed to Payment screen
    router.push('/subscription-payment');
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
        <Text style={styles.headerTitle}>إدارة الاشتراك</Text>
        <View style={styles.crownBadge}>
          <Ionicons name="star" size={18} color="#D4AF37" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Expired Banner */}
        {!isActive && !isActuallyNew && (
          <View style={styles.expiredBanner}>
            <View style={styles.expiredBannerLeft}>
              <Ionicons name="warning" size={20} color="#FFF" />
              <Text style={styles.expiredBannerText}>الاشتراك منتهي الصلاحية</Text>
            </View>
            <View style={styles.expiredBadge}>
              <Text style={styles.expiredBadgeText}>تجديد الآن</Text>
            </View>
          </View>
        )}

        {/* New User Banner */}
        {!isActive && isActuallyNew && (
          <View style={[styles.expiredBanner, { backgroundColor: C.success }]}>
            <View style={styles.expiredBannerLeft}>
              <Ionicons name="sparkles" size={20} color="#FFF" />
              <Text style={styles.expiredBannerText}>مرحباً بك في هيليكس!</Text>
            </View>
            <View style={[styles.expiredBadge, { backgroundColor: '#ECFDF5' }]}>
              <Text style={[styles.expiredBadgeText, { color: C.success }]}>تفعيل الباقة</Text>
            </View>
          </View>
        )}

        {/* Current Plan Card */}
        <View style={styles.planCard}>
          <View style={styles.planCardDecorativeCircle} />
          <View style={styles.planCardHeader}>
            <View>
              <Text style={styles.planCardTitle}>{SubscriptionConfig.PLAN_NAME}</Text>
              <Text style={styles.planCardSubtitle}>باقة عائلة هيليكس</Text>
            </View>
            <View style={[styles.statusBadge, isActive ? styles.statusBadgeActive : styles.statusBadgeExpired]}>
              <Text style={[styles.statusBadgeText, isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextExpired]}>
                {isActive ? 'نشط' : (isActuallyNew ? 'جديد' : 'منتهي')}
              </Text>
            </View>
          </View>
          <View style={styles.planCardCostRow}>
            <Text style={styles.planCardCostValue}>
              {SubscriptionConfig.formatPrice(SubscriptionConfig.BASE_PRICE)}
              <Text style={styles.planCardCostPeriod}> / شهرياً</Text>
            </Text>
          </View>
          <View style={styles.planCardFooter}>
            <Ionicons name="people" size={16} color="#FFF" />
            <Text style={styles.planCardFooterText}>تتضمن الباقة {subAccountsCount} أفراد إضافيين حالياً</Text>
          </View>
        </View>

        {/* Additional Accounts Counter */}
        <View style={styles.counterSection}>
          <View style={styles.counterHeader}>
            <Text style={styles.counterTitle}>الحسابات الإضافية بالباقة</Text>
            <Text style={styles.counterDesc}>
              {SubscriptionConfig.formatPrice(SubscriptionConfig.PER_MEMBER)} شهرياً لكل حساب إضافي
            </Text>
          </View>
          <View style={styles.counterControls}>
            <TouchableOpacity 
              onPress={() => setNewSubCount(Math.max(0, newSubCount - 1))} 
              style={styles.counterBtn}
            >
              <Text style={styles.counterBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.counterValue}>{newSubCount}</Text>
            <TouchableOpacity 
              onPress={() => setNewSubCount(newSubCount + 1)} 
              style={styles.counterBtn}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Member Selection List (if count decreased) */}
        {requiresSelection && (
          <View style={styles.selectionSection}>
            <View style={styles.infoAlert}>
              <Ionicons name="alert-circle" size={18} color={C.warningText} />
              <Text style={styles.infoAlertText}>
                لقد اخترت باقة أصغر ({newSubCount} أفراد). يرجى اختيار أفراد العائلة الذين ترغب في الاحتفاظ بهم في الباقة.
              </Text>
            </View>
            <View style={styles.selectionList}>
              {subMembers.map(member => {
                const isSelected = selectedMembersToKeep.includes(member.id);
                return (
                  <TouchableOpacity
                    key={member.id}
                    style={[styles.memberCard, isSelected && styles.memberCardActive]}
                    onPress={() => toggleMemberSelection(member.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, isSelected && styles.memberNameActive]}>
                        {member.full_name}
                      </Text>
                      {isSelected ? (
                        <View style={styles.badgeKeep}>
                          <Text style={styles.badgeKeepText}>مستمر في الباقة</Text>
                        </View>
                      ) : (
                        <View style={styles.badgeStop}>
                          <Text style={styles.badgeStopText}>سيتم إيقافه مؤقتاً</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Live Price Summary */}
        <View style={styles.priceSummarySection}>
          <Text style={styles.summaryTitle}>ملخص التكلفة الجديدة</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>الباقة الأساسية (أنت)</Text>
              <Text style={styles.summaryValue}>{SubscriptionConfig.formatPrice(SubscriptionConfig.BASE_PRICE)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                حسابات إضافية ({newSubCount} × {SubscriptionConfig.PER_MEMBER} ج.م)
              </Text>
              <Text style={styles.summaryValue}>
                {SubscriptionConfig.formatPrice(newSubCount * SubscriptionConfig.PER_MEMBER)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRowTotal}>
              <Text style={styles.summaryLabelTotal}>الإجمالي شهرياً</Text>
              <Text style={styles.summaryValueTotal}>{SubscriptionConfig.formatPrice(totalPrice)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View style={[styles.bottomAction, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        <TouchableOpacity 
          style={styles.continueBtn} 
          onPress={handleContinue}
          activeOpacity={0.9}
        >
          <Text style={styles.continueBtnText}>
            {isActuallyNew ? 'متابعة لتفعيل الباقة' : 'متابعة للدفع'}
          </Text>
          <Ionicons name="chevron-back" size={18} color="#FFF" />
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

  // Expired Banner
  expiredBanner: {
    flexDirection: 'row',
    backgroundColor: C.brandOrange,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    ...CARD_SHADOW,
  },
  expiredBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expiredBannerText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  expiredBadge: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99 },
  expiredBadgeText: { fontSize: 11, fontWeight: '800', color: C.brandOrange },

  // Plan Card
  planCard: { backgroundColor: C.primaryContainer, borderRadius: 24, padding: 24, marginBottom: 20, overflow: 'hidden', position: 'relative', ...CARD_SHADOW },
  planCardDecorativeCircle: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.04)' },
  planCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  planCardTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', textAlign: 'left' },
  planCardSubtitle: { fontSize: 12, fontWeight: '600', color: C.onPrimaryContainer, marginTop: 2, textAlign: 'left' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  statusBadgeActive: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  statusBadgeExpired: { backgroundColor: 'rgba(186, 26, 26, 0.2)' },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusBadgeTextActive: { color: '#6FFBEE' },
  statusBadgeTextExpired: { color: '#FFB2B2' },
  planCardCostRow: { marginBottom: 20 },
  planCardCostValue: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  planCardCostPeriod: { fontSize: 13, fontWeight: '500', color: C.onPrimaryContainer },
  planCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 16 },
  planCardFooterText: { fontSize: 12, fontWeight: '600', color: '#FFF' },

  // Counter
  counterSection: { backgroundColor: C.cardSurface, borderRadius: 24, padding: 20, marginBottom: 20, alignItems: 'center', ...CARD_SHADOW },
  counterHeader: { width: '100%', alignItems: 'center', marginBottom: 16 },
  counterTitle: { fontSize: 15, fontWeight: '700', color: C.primary, marginBottom: 4 },
  counterDesc: { fontSize: 11, fontWeight: '600', color: C.outline, textAlign: 'center' },
  counterControls: { flexDirection: 'row', alignItems: 'center', gap: 32 },
  counterBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.outlineVariant },
  counterBtnText: { fontSize: 24, fontWeight: '600', color: C.primary },
  counterValue: { fontSize: 32, fontWeight: '900', color: C.primaryContainer, width: 50, textAlign: 'center' },

  // Selection
  selectionSection: { marginBottom: 20 },
  infoAlert: { flexDirection: 'row', backgroundColor: C.warningBg, padding: 14, borderRadius: 16, gap: 8, marginBottom: 12, alignItems: 'center' },
  infoAlertText: { flex: 1, fontSize: 11, fontWeight: '700', color: C.warningText, textAlign: 'left', lineHeight: 16 },
  selectionList: { gap: 10 },
  memberCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#EFF0EB', backgroundColor: C.cardSurface },
  memberCardActive: { borderColor: C.primaryContainer, backgroundColor: '#F4FAF8' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.outlineVariant, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: C.primaryContainer, borderColor: C.primaryContainer },
  memberInfo: { alignItems: 'flex-start', flex: 1, marginLeft: 12 },
  memberName: { fontSize: 14, fontWeight: '700', color: C.outline },
  memberNameActive: { color: C.primary },
  badgeKeep: { backgroundColor: '#E6F4EA', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  badgeKeepText: { fontSize: 9, color: '#137333', fontWeight: '800' },
  badgeStop: { backgroundColor: '#F1F3F4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  badgeStopText: { fontSize: 9, color: C.outline, fontWeight: '800' },

  // Price Summary
  priceSummarySection: { marginBottom: 20 },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: C.primary, textAlign: 'left', marginBottom: 10, marginRight: 4 },
  summaryCard: { backgroundColor: C.cardSurface, borderRadius: 24, padding: 20, ...CARD_SHADOW },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  summaryLabel: { fontSize: 13, fontWeight: '500', color: C.onSurfaceVariant },
  summaryValue: { fontSize: 14, fontWeight: '700', color: C.primary },
  summaryDivider: { height: 1, backgroundColor: C.background },
  summaryRowTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14 },
  summaryLabelTotal: { fontSize: 15, fontWeight: '700', color: C.primary },
  summaryValueTotal: { fontSize: 22, fontWeight: '800', color: C.brandOrange },

  // Bottom Sticky Action
  bottomAction: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(249, 248, 243, 0.95)', paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.outlineVariant },
  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.brandOrange, paddingVertical: 16, borderRadius: 16, ...CARD_SHADOW },
  continueBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
});
