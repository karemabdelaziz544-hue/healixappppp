import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, FlatList, LayoutAnimation, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';

// 🔴 AUDIT FIX: تفعيل LayoutAnimation على أندرويد
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import NotificationBell from '../NotificationBell';
import Skeleton from '../Skeleton';
import { AppColors, NutritionalColors } from '../../constants/AppTheme';
import { Strings } from '../../constants/strings';
import { useFamily } from '../../src/context/FamilyContext';
import { supabase } from '../../src/lib/supabase';
import { executeQuery } from '../../src/lib/apiClient';
import { logger } from '../../src/lib/logger';
import type { Plan, PlanTask } from '../../src/types';
import { AppCache } from '../../src/lib/cache';
import { OfflineQueue } from '../../src/lib/offlineQueue';



const getFormattedDate = () => {
  const date = new Date();
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `اليوم، ${date.toLocaleDateString('ar-EG', options)}`;
};

// 🔴 AUDIT FIX: دالة لتحديد نوع المهمة — تستخدم NutritionalColors و Strings بدل hex و نصوص مباشرة
const getTaskMeta = (task: PlanTask) => {
  const type = task.task_type;
  
  if (type === 'workout') return { title: Strings.dashboard.tasks.workout, icon: 'barbell', color: NutritionalColors.workout.main, bg: NutritionalColors.workout.bg };
  if (type === 'breakfast') return { title: Strings.dashboard.tasks.breakfast, icon: 'cafe', color: NutritionalColors.breakfast.main, bg: NutritionalColors.breakfast.bg };
  if (type === 'lunch') return { title: Strings.dashboard.tasks.lunch, icon: 'restaurant', color: NutritionalColors.lunch.main, bg: NutritionalColors.lunch.bg };
  if (type === 'dinner') return { title: Strings.dashboard.tasks.dinner, icon: 'moon', color: NutritionalColors.dinner.main, bg: NutritionalColors.dinner.bg };
  if (type === 'snack') return { title: Strings.dashboard.tasks.snack, icon: 'apple', color: NutritionalColors.snack.main, bg: NutritionalColors.snack.bg };
  
  // 🔴 AUDIT FIX: Narrow the fallback to return fallback styling instead of guessing from content
  if (__DEV__ && !type) {
    logger.warn(`Task ${task.id} missing task_type — needs database backfill migration`);
  }
  return { title: Strings.dashboard.tasks.system, icon: 'nutrition', color: NutritionalColors.fallback.main, bg: NutritionalColors.fallback.bg };
};

export default function MainDashboardView() {
  const { currentProfile } = useFamily();
  const userId = currentProfile?.id;
  const insets = useSafeAreaInsets();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const userName = currentProfile?.full_name?.split(' ')[0] || Strings.dashboard.defaultName;
  const randomQuote = React.useMemo(() => Strings.dashboard.quotes[Math.floor(Math.random() * Strings.dashboard.quotes.length)], []);

  const fetchDashboardData = useCallback(async () => {
    if (!userId) return;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // 🚀 Parallelize streak fetching — 🔴 CF-01 FIX: now through executeQuery
      // 🔴 SCHEMA FIX: column is `date` (not `log_date`) and `completed_tasks` (jsonb[]) instead of `all_tasks_completed`
      const streakPromise = executeQuery<{ date: string; completed_tasks: unknown[] | null }[]>(
        supabase.from('daily_logs')
          .select('date, completed_tasks')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(30),
        { isIdempotent: true }
      );

      // ✅ BUG-01: استعلام الخطة للمستخدم الحالي أولاً
      let { data: activePlan } = await executeQuery<Plan | null>(
        supabase.from('plans')
          .select('id, user_id, title, status, start_date, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        { isIdempotent: true }
      );

      // ✅ BUG-01: لو مفيش خطة + ده حساب فرعي → جرب خطة المدير
      if (!activePlan && currentProfile?.manager_id) {
        const { data: managerPlan } = await executeQuery<Plan | null>(
          supabase.from('plans')
            .select('id, user_id, title, status, start_date, created_at')
            .eq('user_id', currentProfile.manager_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          { isIdempotent: true }
        );
        activePlan = managerPlan;
      }

      let finalTasks: PlanTask[] = [];

      if (activePlan) {
        setPlan(activePlan as Plan);
        
        // 🚀 Parallelize Tasks & Logs fetching
        const [tasksRes, logsRes] = await Promise.all([
          executeQuery<PlanTask[]>(
            supabase.from('plan_tasks')
              .select('id, plan_id, day_name, content, task_type, is_completed, order_index')
              .eq('plan_id', activePlan.id)
              .order('order_index', { ascending: true }),
            { isIdempotent: true }
          ),
          executeQuery<{ task_id: string; is_completed: boolean }[]>(
            supabase.from('daily_task_logs')
              .select('task_id, is_completed')
              .eq('user_id', userId)
              .eq('log_date', todayStr),
            { isIdempotent: true }
          ),
        ]);

        const allTasks = tasksRes.data;
        const logData = logsRes.data;

        if (allTasks && allTasks.length > 0) {
          const startDate = new Date(activePlan.start_date || activePlan.created_at);
          startDate.setHours(0, 0, 0, 0);
          const currentDayNum = Math.floor((today.getTime() - startDate.getTime()) / 86400000) + 1;
          const filtered = (allTasks as PlanTask[]).filter(t => {
            // Support 'day_number' if added in future migrations
            if ((t as any).day_number !== undefined && (t as any).day_number !== null) {
              return (t as any).day_number === currentDayNum;
            }

            const name = t.day_name || "";
            if (currentDayNum === 1 && /اليوم\s*(الأول|1($|\D))/.test(name)) return true;
            
            // Extract the first number found in the day name string
            const match = name.match(/\d+/);
            if (match) {
              return parseInt(match[0], 10) === currentDayNum;
            }
            return false;
          });
          
          const logsMap = new Map();
          if (logData) {
            logData.forEach(log => logsMap.set(log.task_id, log.is_completed));
          }

          // Override is_completed with user-specific progress
          const tasksWithProgress = filtered.map(t => ({
             ...t,
             is_completed: logsMap.has(t.id) ? logsMap.get(t.id) : false
          }));

          finalTasks = tasksWithProgress;
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setTasks(finalTasks);
        } else {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setTasks([]);
        }
      } else {
        setPlan(null);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setTasks([]);
      }

      // Streak Calculation
      const { data: logs } = await streakPromise;
      let count = 0;
      if (logs && logs.length > 0) {
        const todayForStreak = new Date(); todayForStreak.setHours(0, 0, 0, 0);
        for (let i = 0; i < logs.length; i++) {
          const logDate = new Date(logs[i].date); logDate.setHours(0, 0, 0, 0);
          const expectedDate = new Date(todayForStreak); expectedDate.setDate(expectedDate.getDate() - i);
          // A day counts as "completed" if completed_tasks array has at least 1 entry
          const hasCompletedTasks = Array.isArray(logs[i].completed_tasks) && logs[i].completed_tasks!.length > 0;
          if (logDate.getTime() !== expectedDate.getTime() || !hasCompletedTasks) break;
          count++;
        }
      }
      setStreak(count);

      // 💾 Save to cache
      await AppCache.set(`dashboard_${userId}`, {
        plan: activePlan ? (activePlan as Plan) : null,
        tasks: finalTasks,
        streak: count
      });
    } catch (err) {
      logger.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, currentProfile?.manager_id]);

  // Load cached dashboard data
  const loadCachedData = useCallback(async () => {
    if (!userId) return;
    try {
      const cached = await AppCache.get<{ plan: Plan | null; tasks: PlanTask[]; streak: number }>(`dashboard_${userId}`);
      if (cached) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setPlan(cached.plan);
        setTasks(cached.tasks);
        setStreak(cached.streak);
        setLoading(false);
      }
    } catch (e) {
      logger.error("Error loading cached dashboard data:", e);
    }
  }, [userId]);

  // ✅ BUG-02: مسح البيانات القديمة فوراً عند تغيير userId
  useEffect(() => {
    setPlan(null);
    setTasks([]);
    setStreak(0);
    setLoading(true);
    loadCachedData().then(() => {
      fetchDashboardData();
    });
  }, [fetchDashboardData, loadCachedData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetchDashboardData(); setRefreshing(false);
  }, [fetchDashboardData]);

  const pendingTaskIds = useRef(new Set<string>());

  const toggleTask = useCallback(async (taskId: string, currentStatus: boolean) => {
    if (pendingTaskIds.current.has(taskId)) return;
    pendingTaskIds.current.add(taskId);
    
    try {
      const newStatus = !currentStatus;
      const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, is_completed: newStatus } : t);
      setTasks(updatedTasks);
      // Update cache
      await AppCache.set(`dashboard_${userId}`, {
        plan,
        tasks: updatedTasks,
        streak
      });
      await Haptics.impactAsync(newStatus ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
      
      const todayStr = new Date().toISOString().split('T')[0];
      await OfflineQueue.addMutation('task_toggle', userId!, {
        taskId,
        isCompleted: newStatus,
        logDate: todayStr
      });
    } finally {
      pendingTaskIds.current.delete(taskId);
    }
  }, [userId, tasks, plan, streak]);


  const completedCount = tasks.filter(t => t.is_completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // 🔴 AUDIT FIX: renderItem مع useCallback لتحسين أداء القائمة
  const renderTaskItem = useCallback(({ item: task }: { item: PlanTask }) => {
    const meta = getTaskMeta(task);
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => toggleTask(task.id, task.is_completed)}
        style={[styles.taskRowCard, task.is_completed && styles.taskRowCardCompleted]}
      >
        {/* 1. الأيقونة على اليمين (في الـ RTL) */}
        <View style={[styles.taskIconBox, { backgroundColor: task.is_completed ? '#F3F4F6' : meta.bg }]}>
          <Ionicons name={meta.icon as any} size={26} color={task.is_completed ? '#9CA3AF' : meta.color} />
        </View>

        {/* 2. المحتوى في المنتصف */}
        <View style={styles.taskContentWrap}>
          <Text style={[styles.taskTypeTitle, task.is_completed && { color: '#9CA3AF' }]}>
            {meta.title}
          </Text>
          <Text style={[styles.taskDesc, task.is_completed && styles.textCompleted]} numberOfLines={2}>
            {task.content}
          </Text>
        </View>

        {/* 3. دائرة التحقق على اليسار */}
        <View style={styles.taskCheckWrap}>
          {task.is_completed ? (
            <Ionicons name="checkmark-circle" size={32} color={AppColors.success} />
          ) : (
            <Ionicons name="ellipse-outline" size={32} color="#D1D5DB" />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [toggleTask]);

  const keyExtractor = useCallback((item: PlanTask) => item.id, []);

  // 🔴 AUDIT FIX: ListHeaderComponent — العناصر الثابتة فوق القائمة
  const ListHeader = useCallback(() => (
    <>
      {/* 🔥 Header */}
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={24} color="#FFF" />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.greeting}>{Strings.dashboard.greeting(userName)}</Text>
          <Text style={styles.subGreeting}>{getFormattedDate()}</Text>
        </View>
        <TouchableOpacity style={styles.iconCircle}>
          <NotificationBell />
        </TouchableOpacity>
      </View>

      {/* 🔥 Premium Hero Progress Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroTitle}>{Strings.dashboard.todayPlan}</Text>
            <Text style={styles.heroSubtitle}>{plan?.title || Strings.dashboard.activePlan}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={16} color={AppColors.accent} />
            <Text style={styles.streakBadgeText}>{Strings.dashboard.daysStreak(streak)}</Text>
          </View>
        </View>

        <View style={styles.progressWrap}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressPercent}>{progress}%</Text>
            <Text style={styles.progressLabel}>{Strings.dashboard.taskCount(completedCount, tasks.length)}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            />
          </View>
        </View>

        {progress === 100 && tasks.length > 0 && (
          <View style={styles.celebrationBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#FFF" />
            <Text style={styles.celebrationText}>{Strings.dashboard.allComplete}</Text>
          </View>
        )}
        <View style={styles.heroDecoration} />
      </View>

      <Text style={styles.sectionTitle}>{Strings.dashboard.dailyMap}</Text>
    </>
  ), [userName, plan, streak, progress, completedCount, tasks.length, progressAnim]);

  // 🔴 AUDIT FIX: ListEmptyComponent — حالة فارغة بنفس ارتفاع القائمة لمنع القفز البصري
  const ListEmpty = useCallback(() => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIconWrap}>
        <Ionicons name="cafe-outline" size={50} color={AppColors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{Strings.dashboard.restDay}</Text>
      <Text style={styles.emptySub}>{randomQuote}</Text>
    </View>
  ), [randomQuote]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.scrollContent}>
          <Skeleton width="100%" height={200} borderRadius={30} style={{ marginBottom: 30 }} />
          <Skeleton width="100%" height={100} borderRadius={25} style={{ marginBottom: 15 }} />
          <Skeleton width="100%" height={100} borderRadius={25} style={{ marginBottom: 15 }} />
          <Skeleton width="100%" height={100} borderRadius={25} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ✅ UX-06: بانر يُشير للحساب الفرعي النشط */}
      {currentProfile?.manager_id && (
        <View style={styles.subAccountBanner}>
          <Ionicons name="swap-horizontal" size={16} color="#FFF" />
          <Text style={styles.subAccountBannerText}>{Strings.dashboard.subAccountViewing(currentProfile.full_name)}</Text>
        </View>
      )}
      {/* 🔴 AUDIT FIX: FlatList بدل ScrollView + .map() — يدعم إعادة تدوير العناصر */}
      <FlatList
        data={tasks}
        renderItem={renderTaskItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.primary]} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  scrollContent: { paddingHorizontal: 24, paddingTop: 10 },

  // Header
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: AppColors.primary, justifyContent: 'center', alignItems: 'center' },
  headerTextWrap: { flex: 1, alignItems: 'center' },
  greeting: { fontSize: 22, fontWeight: '900', color: AppColors.textPrimary },
  subGreeting: { fontSize: 14, color: AppColors.textSecondary, marginTop: 2, fontWeight: '600' },
  iconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },

  // Hero Card (Dark Green + Orange Accents)
  heroCard: { backgroundColor: AppColors.primary, borderRadius: 30, padding: 25, marginBottom: 35, position: 'relative', overflow: 'hidden', elevation: 4, shadowColor: AppColors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15 },
  heroHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 2 },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', textAlign: 'right' },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'right', fontWeight: 'bold' },
  streakBadge: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(249, 115, 22, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  streakBadgeText: { color: AppColors.accent, fontSize: 13, fontWeight: 'bold', marginRight: 6 },

  progressWrap: { marginTop: 35, zIndex: 2 },
  progressHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  progressPercent: { color: '#FFF', fontSize: 36, fontWeight: '900' },
  progressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 'bold' },
  progressBarBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: AppColors.accent, borderRadius: 10 },

  celebrationBanner: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12, marginTop: 20, zIndex: 2 },
  celebrationText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, marginRight: 8 },
  heroDecoration: { position: 'absolute', left: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.05)', zIndex: 1 },

  sectionTitle: { fontSize: 22, fontWeight: '900', color: AppColors.textPrimary, textAlign: 'right', marginBottom: 20 },

  // 🔥 Horizontal Tasks List (كروت عريضة)
  tasksList: { paddingBottom: 10 },
  taskRowCard: {
    flexDirection: 'row-reverse', // أيقونة يمين، تفاصيل في النص، صح على الشمال
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5
  },
  taskRowCardCompleted: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F3F4F6',
    elevation: 0,
    shadowOpacity: 0
  },
  taskIconBox: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 15 },

  taskContentWrap: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  taskTypeTitle: { fontSize: 14, fontWeight: '900', color: '#4B5563', marginBottom: 4 },
  taskDesc: { fontSize: 16, fontWeight: '800', color: AppColors.textPrimary, textAlign: 'right', lineHeight: 24 },
  textCompleted: { textDecorationLine: 'line-through', color: '#9CA3AF' },

  taskCheckWrap: { marginRight: 0, marginLeft: 15, justifyContent: 'center', alignItems: 'center' },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', padding: 40, borderRadius: 35, marginTop: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  emptyStateIconWrap: { width: 90, height: 90, backgroundColor: AppColors.primaryLight, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: AppColors.textPrimary },
  emptySub: { fontSize: 15, color: AppColors.textSecondary, marginTop: 8, fontWeight: '600', textAlign: 'center', lineHeight: 22 },

  // ✅ UX-06: Sub-account banner
  subAccountBanner: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: AppColors.accent, paddingVertical: 8, paddingHorizontal: 15 },
  subAccountBannerText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
});
