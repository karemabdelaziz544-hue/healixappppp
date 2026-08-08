import { Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';;
import ExpiredState from '../../components/ExpiredState';
import LockedTabView from '../../components/LockedTabView';
import { AppColors, AppFontFamily, AppRadius } from '../../constants/AppTheme';
import { useSubscriptionGuard } from '../../hooks/useSubscriptionGuard';
import { useFamily } from '../../src/context/FamilyContext';
import { executeQuery } from '../../src/lib/apiClient';
import { supabase } from '../../src/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEntitlements } from '../../src/features/subscriptions/useEntitlements';
import { PremiumGate } from '../../src/components/PremiumGate';
import type { Inquiry } from '../../src/types';

// Categories mapping for icons and localized names
const CATEGORY_MAP: Record<string, { icon: string, label: string }> = {
  nutrition: { icon: 'restaurant-outline', label: 'النظام الغذائي' },
  meals: { icon: 'fast-food-outline', label: 'الوجبات' },
  weight: { icon: 'scale-outline', label: 'الوزن' },
  exercises: { icon: 'barbell-outline', label: 'التمارين' },
  symptoms: { icon: 'medical-outline', label: 'الأعراض' },
  other: { icon: 'help-circle-outline', label: 'مشكلة أخرى' },
};

// Status mapping for badges
const STATUS_MAP: Record<string, { label: string, color: string, bg: string }> = {
  open: { label: 'مفتوح', color: '#3B82F6', bg: '#DBEAFE' }, // Blue
  under_review: { label: 'قيد المراجعة', color: '#F59E0B', bg: '#FEF3C7' }, // Orange
  replied: { label: 'تم الرد', color: '#10B981', bg: '#D1FAE5' }, // Green
  closed: { label: 'مغلق', color: '#6B7280', bg: '#F3F4F6' }, // Gray
};

export default function InquiriesDashboardScreen() {
  const { currentProfile } = useFamily();
  const currentUserId = currentProfile?.id;
  const { canUse, userRole } = useEntitlements();
  const { userLifecycleState, isGuardLoading } = useSubscriptionGuard();
  const router = useRouter();

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const fetchInquiries = async () => {
    if (!currentUserId) return;
    try {
      const { data, error } = await executeQuery<Inquiry[]>(
        supabase.from('inquiries')
          .select('id, user_id, type, status, subject, description, priority, is_resolved, assigned_doctor_id, created_at, updated_at')
          .eq('user_id', currentUserId)
          .order('updated_at', { ascending: false })
          .limit(50)
      );
      if (!error && data) {
        setInquiries(data);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInquiries();
    }, [currentUserId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchInquiries();
  };

  if (isGuardLoading || userLifecycleState === 'loading') {
    return <ActivityIndicator size="large" color={AppColors.primary} style={{ flex: 1, marginTop: 50 }} />;
  }

  if (!canUse('DOCTOR_CHAT') && userRole !== 'admin' && userRole !== 'doctor') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: AppColors.background }}>
        <PremiumGate featureId="DOCTOR_CHAT" screenName="ChatScreen" />
      </SafeAreaView>
    );
  }

  // 🔒 Onboarding — مقفول
  if (userLifecycleState === 'onboarding') {
    return (
      <LockedTabView
        icon="clipboard"
        iconColor={AppColors.primary}
        iconBg={AppColors.primaryLight}
        title="أكمل بياناتك أولاً 📋"
        subtitle="أكمل بياناتك الطبية ليتمكن الكوتش من دراسة حالتك والرد على استفساراتك."
        buttonText="الذهاب لإكمال البيانات"
        onPress={() => router.push('/(tabs)')}
      />
    );
  }

  const activeInquiries = inquiries.filter(i => i.status !== 'closed');
  const archivedInquiries = inquiries.filter(i => i.status === 'closed');
  const displayData = activeTab === 'active' ? activeInquiries : archivedInquiries;

  const renderInquiry = ({ item }: { item: Inquiry }) => {
    const meta = CATEGORY_MAP[item.category] || CATEGORY_MAP['other'];
    const statusMeta = STATUS_MAP[item.status] || STATUS_MAP['open'];

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/inquiry/[id]', params: { id: item.id, status: item.status, title: item.title } })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: statusMeta.bg }]}>
            <Text style={[styles.badgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
          <View style={styles.dateBox}>
            <Text style={styles.dateText}>{new Date(item.updated_at).toLocaleDateString('ar-EG')}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.iconBox}>
            <Ionicons name={meta.icon as any} size={24} color={AppColors.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <View style={styles.categoryRow}>
              <Ionicons name={meta.icon as any} size={14} color={AppColors.textSecondary} />
              <Text style={styles.categoryText}>{meta.label}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>استفساراتي</Text>
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'active' && styles.tabBtnActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>الحالية ({activeInquiries.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'archived' && styles.tabBtnActive]}
          onPress={() => setActiveTab('archived')}
        >
          <Text style={[styles.tabText, activeTab === 'archived' && styles.tabTextActive]}>المؤرشفة ({archivedInquiries.length})</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={AppColors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item) => item.id}
          renderItem={renderInquiry}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={60} color={AppColors.primaryLight} />
              <Text style={styles.emptyTitle}>لا توجد استفسارات {activeTab === 'active' ? 'حالية' : 'مؤرشفة'}</Text>
              {activeTab === 'active' && inquiries.length === 0 && (
                <Text style={styles.emptySubtitle}>
                  مرحباً بك في قسم التواصل! الكوتش الطبي بانتظارك، اضغط على الزر أدناه لإرسال أول استفسار لك حول نظامك الغذائي.
                </Text>
              )}
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/new-inquiry')}>
        <Ionicons name="add" size={24} color="#FFF" />
        <Text style={styles.fabText}>اسأل الكوتش الآن</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: AppColors.surface,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    fontFamily: AppFontFamily.bold,
  },
  tabsRow: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: AppColors.surface,
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: AppRadius.md,
    backgroundColor: AppColors.inputBg,
  },
  tabBtnActive: {
    backgroundColor: AppColors.primaryLight,
  },
  tabText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontFamily: AppFontFamily.medium,
  },
  tabTextActive: {
    color: AppColors.primary,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AppRadius.sm,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: AppFontFamily.medium,
    fontWeight: 'bold',
  },
  dateBox: {},
  dateText: {
    fontSize: 12,
    color: AppColors.textMuted,
    fontFamily: AppFontFamily.regular,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: AppRadius.md,
    backgroundColor: AppColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flexDirection: 'column',
    flex: 1,
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    fontFamily: AppFontFamily.bold,
    textAlign: 'left',
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  categoryText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    fontFamily: AppFontFamily.medium,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    fontFamily: AppFontFamily.bold,
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontFamily: AppFontFamily.regular,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    bottom: 140, // تم رفعه بزيادة ملحوظة لضمان تخطيه التاب بار بالكامل (يشمل الـ SafeArea)
    start: 20,
    end: 20,
    backgroundColor: AppColors.primary,
    borderRadius: AppRadius.full,
    paddingVertical: 15,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    gap: 8,
  },
  fabText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: AppFontFamily.bold,
  },
});