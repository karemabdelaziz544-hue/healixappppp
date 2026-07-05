import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, I18nManager, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { logger } from '../../src/lib/logger';
import { useRouter } from 'expo-router';
import { useFamily } from '../../src/context/FamilyContext';
import { useSubscriptionGuard } from '../../hooks/useSubscriptionGuard';
import LockedTabView from '../../components/LockedTabView';
import ExpiredState from '../../components/ExpiredState';
import Skeleton from '../../components/Skeleton';
import type { Plan } from '../../src/types';
import { AppColors, AppRadius, AppSpacing, AppFontSize, AppFontFamily } from '../../constants/AppTheme';

// ✅ أيقونة الـ chevron دائماً تشير لليسار كما طلب المستخدم
const chevronIcon = 'chevron-back';


export default function HistoryScreen() {
  const { currentProfile } = useFamily();
  const currentUserId = currentProfile?.id;
  const router = useRouter();
  const { userLifecycleState, isGuardLoading } = useSubscriptionGuard();
  const insets = useSafeAreaInsets();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'archived'>('all');

  const fetchHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*, plan_tasks (count)') 
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      logger.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      setLoading(true);
      fetchHistory();
    }
  }, [currentUserId, fetchHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, [fetchHistory]);

  // تصفية الخطط محلياً بناءً على البحث والفلتر المختار
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchesSearch = plan.title 
        ? plan.title.toLowerCase().includes(searchQuery.toLowerCase()) 
        : false;
      
      const isCurrent = plan.status === 'active';
      if (selectedFilter === 'active') {
        return matchesSearch && isCurrent;
      }
      if (selectedFilter === 'archived') {
        return matchesSearch && !isCurrent;
      }
      return matchesSearch;
    });
  }, [plans, searchQuery, selectedFilter]);

  // 🔒 Lead — مقفول بالكامل
  if (!isGuardLoading && userLifecycleState === 'lead') {
    return (
      <LockedTabView
        icon="time"
        iconColor={AppColors.accent}
        iconBg={AppColors.accentLight}
        title="اشترك لتتبع رحلتك 📊"
        subtitle="سجل اشتراكك في Healix لتتمكن من متابعة سجل خططك وإنجازاتك الصحية بالكامل."
        buttonText="اشترك الآن"
        onPress={() => router.push('/subscriptions')}
      />
    );
  }

  // 🔒 Onboarding — مقفول برسالة خاصة
  if (!isGuardLoading && userLifecycleState === 'onboarding') {
    return (
      <LockedTabView
        icon="clipboard"
        iconColor={AppColors.primary}
        iconBg={AppColors.primaryLight}
        title="أكمل بياناتك أولاً 📋"
        subtitle="أكمل بياناتك الطبية ليتم تصميم خطتك الشخصية وتسجيل تاريخك الصحي."
        buttonText="ارجع للداشبورد"
        onPress={() => router.push('/(tabs)')}
      />
    );
  }

  // ⏰ Expired — مقفول بالكامل (إجبار على التجديد)
  if (!isGuardLoading && userLifecycleState === 'expired') {
    return <ExpiredState />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* الهيدر ثابت وبيظهر دايماً */}
      <View style={styles.header}>
        <View style={styles.titleRowMain}>
          <Ionicons name="time-outline" size={28} color={AppColors.accent} />
          <Text style={styles.title}>أرشيف رحلتك</Text>
        </View>
        <Text style={styles.subtitle}>سجل كامل لجميع خططك الغذائية والتدريبية</Text>
      </View>

      {/* 🌟 دمجنا لودينج الحارس مع لودينج الداتا وعرضنا الـ Skeleton */}
      {loading || isGuardLoading ? (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]} showsVerticalScrollIndicator={false}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="100%" height={90} borderRadius={AppRadius.xl} style={{ marginBottom: 15 }} />
          ))}
        </ScrollView>
      ) : plans.length === 0 ? (
        <ScrollView contentContainerStyle={styles.centerContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.accent]} />}>
          <Ionicons name="document-text-outline" size={60} color={AppColors.textMuted} />
          <Text style={styles.emptyText}>لا يوجد سجل تاريخي حتى الآن.</Text>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {/* قسم البحث والفلاتر الذكية */}
          <View style={styles.searchFilterContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={20} color={AppColors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="بحث باسم الخطة..."
                placeholderTextColor={AppColors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                textAlign="right"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={AppColors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.filtersContainer}
            >
              <TouchableOpacity 
                style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]} 
                onPress={() => setSelectedFilter('all')}
              >
                <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>الكل</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterChip, selectedFilter === 'active' && styles.filterChipActive]} 
                onPress={() => setSelectedFilter('active')}
              >
                <Text style={[styles.filterChipText, selectedFilter === 'active' && styles.filterChipTextActive]}>الحالية</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterChip, selectedFilter === 'archived' && styles.filterChipActive]} 
                onPress={() => setSelectedFilter('archived')}
              >
                <Text style={[styles.filterChipText, selectedFilter === 'archived' && styles.filterChipTextActive]}>المؤرشفة</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {filteredPlans.length === 0 ? (
            <ScrollView contentContainerStyle={styles.centerContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.accent]} />}>
              <Ionicons name="search-outline" size={60} color={AppColors.textMuted} />
              <Text style={styles.emptyText}>لا توجد نتائج تطابق بحثك.</Text>
            </ScrollView>
          ) : (
            <ScrollView 
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.accent, AppColors.primary]} tintColor={AppColors.primary} />}
            >
              {filteredPlans.map((plan) => {
                const isCurrent = plan.status === 'active';
                const taskCount = plan.plan_tasks?.[0]?.count || 0;

                return (
                  <TouchableOpacity 
                    key={plan.id} style={[styles.planCard, isCurrent && styles.currentPlanCard]} activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/(tabs)/plan-details', params: { planId: plan.id } })} 
                  >
                    <View style={styles.cardLeft}>
                      <View style={[styles.taskCountBadge, isCurrent && styles.taskCountBadgeCurrent]}>
                        <Text style={[styles.taskCountText, isCurrent && styles.taskCountTextCurrent]}>{taskCount} مهمة</Text>
                      </View>
                      <Ionicons name={chevronIcon as any} size={20} color={isCurrent ? AppColors.accent : AppColors.textMuted} />
                    </View>

                    <View style={styles.cardRight}>
                      <View style={styles.titleRow}>
                        {isCurrent && <View style={styles.activeTag}><Text style={styles.activeTagText}>الحالية</Text></View>}
                        <Text style={[styles.planTitle, isCurrent && styles.planTitleCurrent]}>{plan.title || 'خطة بدون اسم'}</Text>
                      </View>
                      <View style={styles.dateRow}>
                        <Text style={styles.dateText}>{new Date(plan.created_at).toLocaleDateString('ar-EG')}</Text>
                        <Ionicons name="calendar-outline" size={14} color={AppColors.textMuted} />
                      </View>
                    </View>

                    <View style={[styles.iconBox, isCurrent && styles.iconBoxCurrent]}>
                      <Ionicons name="document-text" size={24} color={isCurrent ? AppColors.accent : AppColors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  header: { padding: 20, alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: AppColors.border, backgroundColor: AppColors.surface },
  titleRowMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 5 },
  title: { fontSize: 24, fontWeight: '900', color: AppColors.primary, marginLeft: 8, fontFamily: AppFontFamily.bold },
  subtitle: { fontSize: 14, color: AppColors.textSecondary, fontWeight: 'bold', fontFamily: AppFontFamily.medium },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 15, color: AppColors.textMuted, fontSize: 16, fontWeight: 'bold', fontFamily: AppFontFamily.medium },
  scrollContent: { padding: 15, paddingBottom: 100 }, // Note: paddingBottom is overridden dynamically
  planCard: { flexDirection: 'row', backgroundColor: AppColors.surface, padding: 20, borderRadius: AppRadius.xl, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: AppColors.borderLight, elevation: 1 },
  currentPlanCard: { borderColor: AppColors.accent, borderWidth: 1.5, elevation: 3 },
  cardRight: { flex: 1, alignItems: 'flex-end', paddingRight: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  planTitle: { fontSize: 16, fontWeight: 'bold', color: AppColors.textPrimary, marginLeft: 8, fontFamily: AppFontFamily.bold },
  planTitleCurrent: { color: AppColors.primary },
  activeTag: { backgroundColor: AppColors.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: AppRadius.xs },
  activeTagText: { color: AppColors.surface, fontSize: 10, fontWeight: 'bold', fontFamily: AppFontFamily.medium },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 12, color: AppColors.textMuted, fontWeight: 'bold', marginRight: 5, fontFamily: AppFontFamily.regular },
  iconBox: { width: 50, height: 50, borderRadius: AppRadius.lg, backgroundColor: AppColors.borderLight, justifyContent: 'center', alignItems: 'center' },
  iconBoxCurrent: { backgroundColor: AppColors.accentLight },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  taskCountBadge: { backgroundColor: AppColors.borderLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: AppRadius.sm, marginRight: 10 },
  taskCountBadgeCurrent: { backgroundColor: AppColors.accentLight },
  taskCountText: { fontSize: 12, fontWeight: 'bold', color: AppColors.textSecondary, fontFamily: AppFontFamily.medium },
  taskCountTextCurrent: { color: AppColors.accent },
  
  // قسم البحث والفلاتر
  searchFilterContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: AppColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  searchBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: AppColors.inputBg,
    borderRadius: AppRadius.md,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchIcon: {
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: AppFontSize.md,
    color: AppColors.textPrimary,
    fontFamily: AppFontFamily.regular,
    textAlign: 'right',
    height: '100%',
  },
  filtersContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: AppRadius.full,
    backgroundColor: AppColors.borderLight,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  filterChipText: {
    fontSize: AppFontSize.sm,
    color: AppColors.textSecondary,
    fontFamily: AppFontFamily.medium,
  },
  filterChipTextActive: {
    color: AppColors.surface,
    fontWeight: 'bold',
  },
});