import { Text, TextInput } from '@/components/AppText';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';;
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { logger } from '../src/lib/logger';
import { useRouter } from 'expo-router';
import { useFamily } from '../src/context/FamilyContext';
import { useSubscriptionGuard } from '../hooks/useSubscriptionGuard';
import LockedTabView from '../components/LockedTabView';
import ExpiredState from '../components/ExpiredState';
import Skeleton from '../components/Skeleton';
import type { Plan } from '../src/types';
import { AppColors, AppRadius, AppFontSize, AppFontFamily } from '../constants/AppTheme';
import { AnimatedButton } from '../components/animations/AnimatedButton';
import { FadeInView } from '../components/animations/FadeInView';
import { SlideInView } from '../components/animations/SlideInView';

export default function PlansHistoryScreen() {
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
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*, plan_tasks (count)')
        .eq('user_id', currentUserId)
        .neq('plan_type', 'workout')
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

  if (!isGuardLoading && userLifecycleState === 'expired') {
    return <ExpiredState />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* TopAppBar */}
      <FadeInView delay={50} style={styles.header}>
        <AnimatedButton
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-forward" size={24} color={AppColors.primary} />
        </AnimatedButton>
        <Text style={styles.headerTitle}>الأنظمة الغذائية</Text>
        <View style={styles.headerSpacer} />
      </FadeInView>

      <ScrollView
        style={styles.mainScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.accent, AppColors.primary]} tintColor={AppColors.primary} />}
      >
        {/* Search Section */}
        <SlideInView delay={100} direction="up" style={styles.searchSection}>
          <View style={[styles.searchContainer, isSearchFocused && styles.searchContainerFocused]}>
            <Ionicons name="search" size={24} color={isSearchFocused ? AppColors.accent : AppColors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث عن نظام غذائي..."
              placeholderTextColor={AppColors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              textAlign="right"
            />
            {searchQuery.length > 0 && (
              <AnimatedButton onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <Ionicons name="close-circle" size={18} color={AppColors.textMuted} />
              </AnimatedButton>
            )}
          </View>
        </SlideInView>

        {/* Filter Chips */}
        <SlideInView delay={150} direction="up">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          <AnimatedButton
            style={[styles.chip, selectedFilter === 'all' ? styles.chipActive : styles.chipInactive]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[styles.chipText, selectedFilter === 'all' ? styles.chipTextActive : styles.chipTextInactive]}>الكل</Text>
          </AnimatedButton>
          <AnimatedButton
            style={[styles.chip, selectedFilter === 'active' ? styles.chipActive : styles.chipInactive]}
            onPress={() => setSelectedFilter('active')}
          >
            <Text style={[styles.chipText, selectedFilter === 'active' ? styles.chipTextActive : styles.chipTextInactive]}>نشط</Text>
          </AnimatedButton>
          <AnimatedButton
            style={[styles.chip, selectedFilter === 'archived' ? styles.chipActive : styles.chipInactive]}
            onPress={() => setSelectedFilter('archived')}
          >
            <Text style={[styles.chipText, selectedFilter === 'archived' ? styles.chipTextActive : styles.chipTextInactive]}>منتهي</Text>
          </AnimatedButton>
        </ScrollView>
        </SlideInView>

        {/* Diet Plan Cards List */}
        {loading || isGuardLoading ? (
          <View style={styles.cardsList}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} width="100%" height={160} borderRadius={24} style={{ marginBottom: 24 }} />
            ))}
          </View>
        ) : plans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={60} color={AppColors.textMuted} />
            <Text style={styles.emptyText}>لا يوجد سجل تاريخي حتى الآن.</Text>
          </View>
        ) : filteredPlans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={60} color={AppColors.textMuted} />
            <Text style={styles.emptyText}>لا توجد نتائج تطابق بحثك.</Text>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {filteredPlans.map((plan) => {
              const isCurrent = plan.status === 'active';
              const taskCount = plan.plan_tasks?.[0]?.count || 0;

              return (
                <SlideInView key={plan.id} delay={200} direction="up">
                <AnimatedButton
                  style={[styles.card, isCurrent && styles.currentPlanCard]}
                  onPress={() => router.push({ pathname: '/plan-details', params: { planId: plan.id } })}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.cardIconBox, isCurrent && styles.cardIconBoxActive]}>
                        <Ionicons name="restaurant" size={20} color={isCurrent ? AppColors.accent : AppColors.primary} />
                      </View>
                      <View style={styles.cardTitles}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {plan.title || 'خطة بدون اسم'}
                        </Text>
                        <Text style={styles.cardSubtitle}>برنامج غذائي مخصص</Text>
                      </View>
                    </View>
                    <View style={styles.cardTopRight}>
                      <View style={[styles.badge, isCurrent ? styles.badgeActive : styles.badgeInactive]}>
                        <Text style={[styles.badgeText, isCurrent ? styles.badgeTextActive : styles.badgeTextInactive]}>
                          {isCurrent ? 'نشط' : 'منتهي'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-back" size={20} color={AppColors.textMuted} />
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.cardBottomRow}>
                    <View style={styles.cardInfoItem}>
                      <Ionicons name="calendar-outline" size={16} color={AppColors.textSecondary} />
                      <Text style={styles.cardInfoText}>{new Date(plan.created_at).toLocaleDateString('ar-EG')}</Text>
                    </View>
                    <View style={[styles.cardInfoItem, isCurrent && styles.cardInfoItemAccent]}>
                      <Ionicons name="nutrition-outline" size={16} color={isCurrent ? AppColors.accent : AppColors.textSecondary} />
                      <Text style={[styles.cardInfoText, isCurrent && styles.cardInfoTextAccent]}>{taskCount} مهام</Text>
                    </View>
                  </View>
                </AnimatedButton>
                </SlideInView>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: AppColors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: AppFontFamily.bold,
    color: AppColors.primary,
  },
  headerSpacer: {
    width: 40,
  },
  mainScrollView: {
    flex: 1,
  },
  searchSection: {
    marginTop: 16,
    paddingHorizontal: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    height: 56,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AppColors.border,
    paddingHorizontal: 16,
  },
  searchContainerFocused: {
    borderColor: AppColors.accent,
  },
  searchIcon: {
    marginEnd: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: AppFontFamily.regular,
    fontSize: AppFontSize.md,
    color: AppColors.textPrimary,
    textAlign: 'right',
    height: '100%',
  },
  clearSearchBtn: {
    padding: 4,
    marginStart: 4,
  },
  chipsContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  chipActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderColor: AppColors.accent,
  },
  chipInactive: {
    backgroundColor: AppColors.surface,
    borderColor: AppColors.border,
  },
  chipText: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.md,
  },
  chipTextActive: {
    color: AppColors.accent,
  },
  chipTextInactive: {
    color: AppColors.textPrimary,
  },
  cardsList: {
    marginTop: 32,
    paddingHorizontal: 24,
    gap: 16, // reduced from 24 for a denser list
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 20, // reduced from 24
    padding: 16, // reduced from 24
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, // smaller shadow
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  currentPlanCard: {
    borderColor: AppColors.accentBorder,
    borderEndWidth: 4,
    borderEndColor: AppColors.accent,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // center alignment so chevron aligns with title
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // reduced gap so text sticks closer to icon
    flex: 1,
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(42, 75, 70, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconBoxActive: {
    backgroundColor: AppColors.accentLight,
  },
  cardTitles: {
    flex: 1,
    alignItems: 'flex-start', // In RTL, this aligns items to the right side (next to the icon)
  },
  cardTitle: {
    fontSize: AppFontSize.lg, // approx 16-18
    fontFamily: AppFontFamily.bold,
    color: AppColors.primary,
    marginBottom: 2,
    textAlign: 'right',
  },
  cardSubtitle: {
    fontSize: AppFontSize.sm, // approx 12-14
    fontFamily: AppFontFamily.regular,
    color: AppColors.textMuted,
    textAlign: 'right',
  },
  cardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  badgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  badgeInactive: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
  },
  badgeText: {
    fontSize: AppFontSize.xs, // approx 10-12
    fontFamily: AppFontFamily.bold, // changed to bold for punchiness
  },
  badgeTextActive: {
    color: AppColors.success,
  },
  badgeTextInactive: {
    color: AppColors.textSecondary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: AppColors.borderLight,
    marginVertical: 12,
    width: '100%',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // space between metadata items
  },
  cardInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardInfoItemAccent: {
    backgroundColor: AppColors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardInfoText: {
    fontSize: AppFontSize.sm, // approx 12-14
    fontFamily: AppFontFamily.medium,
    color: AppColors.textPrimary,
  },
  cardInfoTextAccent: {
    color: AppColors.accent,
    fontFamily: AppFontFamily.bold,
  },
  emptyContainer: {
    marginTop: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    color: AppColors.textMuted,
    fontSize: AppFontSize.lg,
    fontFamily: AppFontFamily.medium,
  },
});


