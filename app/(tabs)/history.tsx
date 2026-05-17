import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, I18nManager } from 'react-native';
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
import { AppColors } from '../../constants/AppTheme';

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

  // 🔒 Lead — مقفول بالكامل
  if (!isGuardLoading && userLifecycleState === 'lead') {
    return (
      <LockedTabView
        icon="time"
        iconColor="#F97316"
        iconBg="#FFF7ED"
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
          <Ionicons name="time-outline" size={28} color="#F97316" />
          <Text style={styles.title}>أرشيف رحلتك</Text>
        </View>
        <Text style={styles.subtitle}>سجل كامل لجميع خططك الغذائية والتدريبية</Text>
      </View>

      {/* 🌟 دمجنا لودينج الحارس مع لودينج الداتا وعرضنا الـ Skeleton */}
      {loading || isGuardLoading ? (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]} showsVerticalScrollIndicator={false}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="100%" height={90} borderRadius={20} style={{ marginBottom: 15 }} />
          ))}
        </ScrollView>
      ) : plans.length === 0 ? (
        <ScrollView contentContainerStyle={styles.centerContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F97316']} />}>
          <Ionicons name="document-text-outline" size={60} color="#D1D5DB" />
          <Text style={styles.emptyText}>لا يوجد سجل تاريخي حتى الآن.</Text>
        </ScrollView>
      ) : (
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F97316', '#2A4B46']} tintColor="#2A4B46" />}
        >
          {plans.map((plan) => {
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
                  <Ionicons name={chevronIcon as any} size={20} color={isCurrent ? "#F97316" : "#9CA3AF"} />
                </View>

                <View style={styles.cardRight}>
                  <View style={styles.titleRow}>
                    {isCurrent && <View style={styles.activeTag}><Text style={styles.activeTagText}>الحالية</Text></View>}
                    <Text style={[styles.planTitle, isCurrent && styles.planTitleCurrent]}>{plan.title || 'خطة بدون اسم'}</Text>
                  </View>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateText}>{new Date(plan.created_at).toLocaleDateString('ar-EG')}</Text>
                    <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                  </View>
                </View>

                <View style={[styles.iconBox, isCurrent && styles.iconBoxCurrent]}>
                  <Ionicons name="document-text" size={24} color={isCurrent ? "#F97316" : "#6B7280"} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F6F0' },
  header: { padding: 20, alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFF' },
  titleRowMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 5 },
  title: { fontSize: 24, fontWeight: '900', color: '#2A4B46', marginLeft: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', fontWeight: 'bold' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 15, color: '#9CA3AF', fontSize: 16, fontWeight: 'bold' },
  scrollContent: { padding: 15, paddingBottom: 100 }, // Note: paddingBottom is overridden dynamically
  planCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 20, borderRadius: 20, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6', elevation: 1 },
  currentPlanCard: { borderColor: '#F97316', borderWidth: 1.5, elevation: 3 },
  cardRight: { flex: 1, alignItems: 'flex-end', paddingRight: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  planTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginLeft: 8 },
  planTitleCurrent: { color: '#2A4B46' },
  activeTag: { backgroundColor: '#F97316', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  activeTagText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 12, color: '#9CA3AF', fontWeight: 'bold', marginRight: 5 },
  iconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  iconBoxCurrent: { backgroundColor: '#FFF7ED' },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  taskCountBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 10 },
  taskCountBadgeCurrent: { backgroundColor: '#FFF7ED' },
  taskCountText: { fontSize: 12, fontWeight: 'bold', color: '#6B7280' },
  taskCountTextCurrent: { color: '#F97316' },
});