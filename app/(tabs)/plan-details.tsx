import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { logger } from '../../src/lib/logger';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ExpiredState from '../../components/ExpiredState';
import Skeleton from '../../components/Skeleton';
import { useSubscriptionGuard } from '../../hooks/useSubscriptionGuard';
import type { PlanTask } from '../../src/types';

export default function PlanDetailsScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams(); 

  const [planTitle, setPlanTitle] = useState('');
  const [tasksByDay, setTasksByDay] = useState<Record<string, PlanTask[]>>({});
  const [dayNames, setDayNames] = useState<string[]>([]);
  const [activeDay, setActiveDay] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { isSubscribed, isGuardLoading } = useSubscriptionGuard();

  useEffect(() => {
    if (planId) {
      fetchPlanDetails();
    }
  }, [planId]);

  const fetchPlanDetails = async () => {
    try {
      setLoading(true);
      const { data: plan } = await supabase.from('plans').select('title').eq('id', planId).maybeSingle(); // ✅ BUG-08: لا يرمي خطأ إذا لم توجد خطة
      if (plan) setPlanTitle(plan.title || 'تفاصيل الخطة');

      const { data: tasks } = await supabase
        .from('plan_tasks')
        .select('id, plan_id, day_name, content, task_type, is_completed, order_index')
        .eq('plan_id', planId)
        .order('order_index', { ascending: true });

      if (tasks) {
        const grouped: Record<string, PlanTask[]> = {};
        const days: string[] = [];

        tasks.forEach((task) => {
          const dayName = task.day_name || 'اليوم الأول';
          if (!grouped[dayName]) {
            grouped[dayName] = [];
            days.push(dayName);
          }
          grouped[dayName].push(task);
        });

        setTasksByDay(grouped);
        setDayNames(days);
        if (days.length > 0) setActiveDay(days[0]);
      }
    } catch (error) {
      logger.error('Error fetching details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || isGuardLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Skeleton width={30} height={30} borderRadius={15} />
          <View style={[styles.headerTitleBox, { alignItems: 'flex-start' }]}>
            <Skeleton width={120} height={20} borderRadius={8} style={{ marginBottom: 5 }} />
            <Skeleton width={80} height={15} borderRadius={5} />
          </View>
          <View style={styles.spacer} />
        </View>
        <View style={{ padding: 20 }}>
          <Skeleton width="100%" height={40} borderRadius={20} style={{ marginBottom: 20 }} />
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} width="100%" height={60} borderRadius={15} style={{ marginBottom: 10 }} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (!isSubscribed) {
    return <ExpiredState />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>{planTitle}</Text>
          <Text style={styles.headerSubtitle}>تفاصيل النظام الكاملة</Text>
        </View>
        <View style={styles.spacer} />
      </View>

      {dayNames.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-clear-outline" size={60} color="#D1D5DB" />
          <Text style={styles.emptyText}>لا توجد مهام مسجلة في هذا النظام.</Text>
        </View>
      ) : (
        <View style={styles.contentWrapper}>
          <View style={styles.daysScrollContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
              {dayNames.map((day) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => setActiveDay(day)}
                  style={[styles.dayTab, activeDay === day && styles.dayTabActive]}
                >
                  <Text style={[styles.dayTabText, activeDay === day && styles.dayTabTextActive]}>{day}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView contentContainerStyle={styles.tasksContainer}>
            <Text style={styles.sectionTitle}>مهام {activeDay}</Text>
            
            {tasksByDay[activeDay]?.map((task) => (
              <View key={task.id} style={styles.taskCard}>
                <Ionicons 
                  name={task.is_completed ? "checkmark-circle" : "ellipse-outline"} 
                  size={24} 
                  color={task.is_completed ? "#10B981" : "#D1D5DB"} 
                />
                <Text style={[styles.taskContent, task.is_completed && styles.taskContentCompleted]}>
                  {task.content}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F6F0' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F6F0' },
  loadingText: { marginTop: 10, color: '#2A4B46', fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 15, color: '#9CA3AF', fontSize: 16, fontWeight: 'bold' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A4B46', padding: 20, paddingTop: 10 },
  backButton: { padding: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10 },
  headerTitleBox: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  spacer: { width: 40 },
  contentWrapper: { flex: 1 },
  daysScrollContainer: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  daysScroll: { paddingHorizontal: 15, paddingVertical: 10, flexDirection: 'row-reverse' },
  dayTab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginHorizontal: 4, borderWidth: 1, borderColor: 'transparent' },
  dayTabActive: { backgroundColor: '#F97316', shadowColor: '#F97316', shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
  dayTabText: { color: '#6B7280', fontWeight: 'bold', fontSize: 13 },
  dayTabTextActive: { color: '#FFF' },
  tasksContainer: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2A4B46', textAlign: 'right', marginBottom: 15 },
  taskCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  taskContent: { flex: 1, fontSize: 15, color: '#1F2937', textAlign: 'right', marginRight: 15 },
  taskContentCompleted: { color: '#9CA3AF', textDecorationLine: 'line-through' },
});