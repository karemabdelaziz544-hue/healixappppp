import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSubscriptionGuard } from '../../hooks/useSubscriptionGuard';
import LockedTabView from '../../components/LockedTabView';
import ExpiredState from '../../components/ExpiredState';
import { AppColors, AppFontFamily } from '../../constants/AppTheme';
import { useFamily } from '../../src/context/FamilyContext';
import { supabase } from '../../src/lib/supabase';
import { logger } from '../../src/lib/logger';
import type { Plan, PlanTask } from '../../src/types';

const { width } = Dimensions.get('window');

// Premium Vitality Brand Colors
const VITALITY_COLORS = {
  background: '#FAF9F7',
  primaryDark: '#12362E',
  primaryContainer: '#2A4D44',
  accentOrange: '#F26E11',
  successGreen: '#10B981',
  surfaceCard: '#FFFFFF',
  textMain: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
};

// Timezone-safe local date string helper
const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Monday to Sunday dynamic calendar days
const getWeekDays = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const startOfWeek = new Date(today);
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const weekdaysAr = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
  const weekdaysEn = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    weekDays.push({
      day: weekdaysEn[i],
      label: weekdaysAr[i],
      date: String(d.getDate()),
      todayStr: getLocalDateString(d),
    });
  }
  return weekDays;
};

type WorkoutTask = PlanTask & { is_completed: boolean };

export default function WorkoutsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentProfile } = useFamily();
  const userId = currentProfile?.id;
  const { userLifecycleState, isGuardLoading } = useSubscriptionGuard();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workouts, setWorkouts] = useState<WorkoutTask[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState(getLocalDateString());
  const [activePlan, setActivePlan] = useState<Plan | null>(null);

  // Statistics State
  const [stats, setStats] = useState({
    calories: 0,
    exercisesDone: 0,
    workoutHours: 0,
    streak: 0,
  });

  const weekDays = useMemo(() => getWeekDays(), []);

  // Fetch real workout data from database
  const fetchWorkoutsData = useCallback(async (dateStr: string) => {
    if (!userId) return;
    try {
      // 1. Fetch user's active plan
      const { data: planData } = await supabase
        .from('plans')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('plan_type', 'workout')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!planData) {
        setActivePlan(null);
        setWorkouts([]);
        setLoading(false);
        return;
      }
      setActivePlan(planData);

      // 2. Fetch all plan tasks of type 'workout'
      const { data: allTasks } = await supabase
        .from('plan_tasks')
        .select('*')
        .eq('plan_id', planData.id)
        .eq('task_type', 'workout')
        .order('order_index', { ascending: true });

      const workoutTasks = (allTasks || []) as PlanTask[];

      // 3. Fetch completion status logs for the selected date
      const { data: logs } = await supabase
        .from('daily_task_logs')
        .select('task_id, is_completed')
        .eq('user_id', userId)
        .eq('log_date', dateStr);

      const logsMap = new Map<string, boolean>();
      if (logs) {
        logs.forEach(log => logsMap.set(log.task_id, log.is_completed));
      }

      // 4. Calculate day number for the selected date relative to plan start
      const planStart = new Date(planData.start_date || planData.created_at);
      planStart.setHours(0, 0, 0, 0);
      const selectedDay = new Date(dateStr);
      selectedDay.setHours(0, 0, 0, 0);
      const dayNumber = Math.floor((selectedDay.getTime() - planStart.getTime()) / 86400000) + 1;

      // 5. Filter tasks matching the selected day
      const filteredTasks = workoutTasks.filter(t => {
        if (t.day_number !== null && t.day_number !== undefined) {
          return t.day_number === dayNumber;
        }
        
        // Match weekday name (e.g. "الأربعاء") or day number pattern in day_name (e.g. "اليوم الأول" -> 1)
        const name = t.day_name || '';
        if (dayNumber === 1 && /اليوم\s*(الأول|1($|\D))/.test(name)) return true;
        const match = name.match(/\d+/);
        if (match) {
          return parseInt(match[0], 10) === dayNumber;
        }

        // Check if selected date weekday name is in day_name
        const selectedWeekdayName = selectedDay.toLocaleDateString('ar-EG', { weekday: 'long' });
        return name.includes(selectedWeekdayName);
      });

      // 6. Map completed state
      const mappedWorkouts: WorkoutTask[] = filteredTasks.map(t => ({
        ...t,
        is_completed: logsMap.has(t.id) ? !!logsMap.get(t.id) : false,
      }));

      setWorkouts(mappedWorkouts);

      // 7. Calculate Monthly/30-day Statistics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = getLocalDateString(thirtyDaysAgo);

      // Query logs in the last 30 days
      const { data: monthLogs } = await supabase
        .from('daily_task_logs')
        .select(`
          is_completed,
          log_date,
          plan_tasks!inner (
            id,
            task_type,
            content,
            metadata
          )
        `)
        .eq('user_id', userId)
        .eq('is_completed', true)
        .eq('plan_tasks.task_type', 'workout')
        .gte('log_date', thirtyDaysAgoStr);

      let totalCalories = 0;
      let totalTimeMinutes = 0;
      let completedExercisesCount = 0;

      if (monthLogs) {
        completedExercisesCount = monthLogs.length;
        monthLogs.forEach((log: any) => {
          const meta = log.plan_tasks?.metadata;
          if (meta) {
            const calVal = parseInt(meta.calories || meta.default_calories || '0', 10);
            if (!isNaN(calVal)) totalCalories += calVal;

            const durVal = parseInt(meta.duration || meta.default_duration || '0', 10);
            if (!isNaN(durVal)) totalTimeMinutes += durVal;
          } else {
            // Fallbacks for tasks without detailed metadata
            totalCalories += 100;
            totalTimeMinutes += 15;
          }
        });
      }

      // Fetch streak
      const { data: streakLogs } = await supabase
        .from('daily_logs')
        .select('date, completed_tasks')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(30);

      let streakCount = 0;
      if (streakLogs && streakLogs.length > 0) {
        const todayForStreak = new Date();
        todayForStreak.setHours(0, 0, 0, 0);
        for (let i = 0; i < streakLogs.length; i++) {
          const logDate = new Date(streakLogs[i].date);
          logDate.setHours(0, 0, 0, 0);
          const expectedDate = new Date(todayForStreak);
          expectedDate.setDate(expectedDate.getDate() - i);
          const hasCompletedTasks = Array.isArray(streakLogs[i].completed_tasks) && streakLogs[i].completed_tasks!.length > 0;
          if (logDate.getTime() !== expectedDate.getTime() || !hasCompletedTasks) break;
          streakCount++;
        }
      }

      setStats({
        calories: totalCalories,
        exercisesDone: completedExercisesCount,
        workoutHours: parseFloat((totalTimeMinutes / 60).toFixed(1)),
        streak: streakCount,
      });

    } catch (err) {
      logger.error('[WorkoutsScreen] Error fetching workouts data:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Synchronize on focus or date change
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchWorkoutsData(selectedDateStr);
    }, [fetchWorkoutsData, selectedDateStr])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWorkoutsData(selectedDateStr);
    setRefreshing(false);
  }, [fetchWorkoutsData, selectedDateStr]);

  // Toggle Exercise completion status in DB
  const toggleExercise = async (taskId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Optimistic UI update
    setWorkouts(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: newStatus } : t));
    
    try {
      const { error } = await supabase.from('daily_task_logs').upsert(
        {
          user_id: userId,
          task_id: taskId,
          log_date: selectedDateStr,
          is_completed: newStatus,
        },
        { onConflict: 'user_id,task_id,log_date' }
      );
      if (error) throw error;

      await Haptics.impactAsync(newStatus ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
      
      // Silent refresh statistics
      fetchWorkoutsData(selectedDateStr);
    } catch (err) {
      logger.error('[WorkoutsScreen] Failed to toggle exercise status:', err);
      // Revert optimistic UI update
      setWorkouts(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: currentStatus } : t));
    }
  };

  const completedCount = workouts.filter(w => w.is_completed).length;
  const totalCount = workouts.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // 🔒 Lead check
  if (!isGuardLoading && userLifecycleState === 'lead') {
    return (
      <LockedTabView
        icon="fitness"
        iconColor={VITALITY_COLORS.accentOrange}
        iconBg="#FDF2E9"
        title="افتح مكتبة التمارين المخصصة"
        subtitle="اشترك الآن للحصول على خطط تمارين رياضية مخصصة لحالتك الصحية وأهدافك البدنية تحت إشراف طبي كامل."
        buttonText="اشترك الآن"
        onPress={() => router.push('/subscriptions')}
      />
    );
  }

  // 🔒 Onboarding check
  if (!isGuardLoading && userLifecycleState === 'onboarding') {
    return (
      <LockedTabView
        icon="clipboard"
        iconColor={VITALITY_COLORS.primaryDark}
        iconBg="#EBF5F2"
        title="صمم خطتك الرياضية"
        subtitle="يرجى إكمال بياناتك الطبية والبدنية ليتمكن فريقنا الطبي والرياضي من صياغة تمارينك اليومية."
        buttonText="اذهب للملف الشخصي"
        onPress={() => router.push('/(tabs)')}
      />
    );
  }

  // ⏰ Expired check
  if (!isGuardLoading && userLifecycleState === 'expired') {
    return <ExpiredState />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="barbell" size={24} color={VITALITY_COLORS.primaryDark} style={styles.headerTitleIcon} />
          <Text style={styles.headerTitle}>تماريني اليومية</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="notifications-outline" size={24} color={VITALITY_COLORS.primaryDark} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={VITALITY_COLORS.primaryDark} />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[VITALITY_COLORS.primaryDark]} />}
        >
          {/* Weekly Progress Card */}
          <View style={styles.progressCard}>
            <View style={styles.progressTopRow}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressTitle}>
                  {activePlan ? activePlan.title : 'لا توجد خطة نشطة حالياً'}
                </Text>
                {activePlan && (
                  <Text style={styles.progressSubtitle}>
                    بدأت في: {new Date(activePlan.start_date || activePlan.created_at).toLocaleDateString('ar-EG')}
                  </Text>
                )}
              </View>
              {totalCount > 0 && (
                <View style={styles.progressBadgeContainer}>
                  <Text style={styles.progressBadgeText}>{completedCount} من {totalCount} منجز</Text>
                </View>
              )}
            </View>

            {totalCount > 0 ? (
              <View style={styles.progressMeterContainer}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>
                <Text style={styles.progressPercentText}>{progressPercent}%</Text>
              </View>
            ) : (
              <Text style={styles.noPlanProgressText}>قم بالتواصل مع طبيبك للحصول على خطتك الرياضية</Text>
            )}

            <View style={styles.cardDecorativeCircle} />
          </View>

          {/* Weekly Calendar */}
          <View style={styles.calendarSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>أسبوعك الرياضي</Text>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarScroll}>
              {weekDays.map((item) => {
                const isSelected = selectedDateStr === item.todayStr;
                return (
                  <TouchableOpacity 
                    key={item.day} 
                    style={[
                      styles.calendarDayCard, 
                      isSelected && styles.calendarDayCardToday
                    ]}
                    onPress={() => setSelectedDateStr(item.todayStr)}
                  >
                    <Text style={[styles.dayLabel, isSelected && styles.dayLabelToday]}>{item.day}</Text>
                    <View style={[styles.calendarDateCircle, isSelected && styles.calendarDateCircleToday]}>
                      <Text style={[styles.calendarDateText, isSelected && styles.calendarDateTextToday]}>{item.date}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Doctor recommendations card */}
          <View style={styles.doctorNotesCard}>
            <View style={styles.doctorNotesHeader}>
              <View style={styles.doctorIconContainer}>
                <Ionicons name="medical" size={20} color={VITALITY_COLORS.primaryDark} />
              </View>
              <Text style={styles.doctorNotesTitle}>توصيات وإرشادات الطبيب</Text>
            </View>
            <View style={styles.doctorNotesList}>
              <View style={styles.doctorNoteItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.doctorNoteText}>قم بعمل إحماء خفيف لمدة 5 دقائق قبل البدء بالتمرين</Text>
              </View>
              <View style={styles.doctorNoteItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.doctorNoteText}>حافظ على شرب كميات كافية من المياه بانتظام أثناء التمرين</Text>
              </View>
              <View style={styles.doctorNoteItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.doctorNoteText}>توقف فوراً عن ممارسة أي تمرين رياضي في حال الشعور بألم حاد</Text>
              </View>
            </View>
          </View>

          {/* Today's Exercises */}
          <View style={styles.exercisesSection}>
            <Text style={styles.sectionTitleText}>تمارين اليوم المحددة</Text>

            {workouts.length === 0 ? (
              <View style={styles.emptyWorkoutsContainer}>
                <Ionicons name="cafe-outline" size={48} color={VITALITY_COLORS.textMuted} />
                <Text style={styles.emptyWorkoutsText}>لا توجد تمارين محددة لهذا اليوم. خذ قسطاً من الراحة!</Text>
              </View>
            ) : (
              workouts.map((workout) => {
                const meta = workout.metadata as any || {};
                
                // Extract exercise info with fallback templates
                const categoryLabel = meta.category || 'قوة';
                const difficultyLabel = meta.difficulty || 'متوسط';
                const durationLabel = meta.duration || meta.default_duration || '15 min';
                const caloriesLabel = meta.calories || meta.default_calories || '100 kcal';
                const setsLabel = meta.sets || meta.default_sets || '3 جولات';
                const muscleLabel = meta.muscle || 'كامل الجسم';
                const tipsLabel = meta.tips || workout.content || 'تمرين رياضي محدد بالخطة.';
                const imageUri = meta.image_url || 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=300&auto=format&fit=crop';
                
                const stepsArray = meta.steps || [];
                const mistakesArray = meta.mistakes || [];

                return (
                  <View 
                    key={workout.id} 
                    style={[styles.exerciseCard, workout.is_completed && styles.exerciseCardCompleted]}
                  >
                    <View style={styles.exerciseCardContent}>
                      <Image 
                        source={{ uri: imageUri }} 
                        style={[styles.exerciseImage, workout.is_completed && styles.exerciseImageCompleted]} 
                      />
                      <View style={styles.exerciseInfo}>
                        <View style={styles.exerciseHeaderRow}>
                          <Text style={styles.exerciseName}>{workout.content}</Text>
                          {workout.is_completed && (
                            <View style={styles.completedBadge}>
                              <Text style={styles.completedBadgeText}>مكتمل</Text>
                            </View>
                          )}
                        </View>
                        
                        <View style={styles.tagRow}>
                          <View style={styles.tagBadge}>
                            <Text style={styles.tagBadgeText}>{categoryLabel}</Text>
                          </View>
                          <View style={styles.tagBadge}>
                            <Text style={styles.tagBadgeText}>{difficultyLabel}</Text>
                          </View>
                        </View>

                        <View style={styles.exerciseMetaRow}>
                          <View style={styles.exerciseMetaItem}>
                            <Ionicons name="repeat-outline" size={14} color={VITALITY_COLORS.accentOrange} />
                            <Text style={styles.exerciseMetaText}>{setsLabel}</Text>
                          </View>
                          <View style={styles.exerciseMetaItem}>
                            <Ionicons name="time-outline" size={14} color={VITALITY_COLORS.textSecondary} />
                            <Text style={styles.exerciseMetaText}>{durationLabel}</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    <View style={styles.exerciseCardActions}>
                      <TouchableOpacity 
                        style={[styles.exerciseActionButton, styles.exerciseActionSecondary]}
                        onPress={() => toggleExercise(workout.id, workout.is_completed)}
                      >
                        <Ionicons 
                          name={workout.is_completed ? "checkmark-circle" : "ellipse-outline"} 
                          size={18} 
                          color={workout.is_completed ? VITALITY_COLORS.successGreen : VITALITY_COLORS.textSecondary} 
                        />
                        <Text style={[styles.exerciseActionText, { color: VITALITY_COLORS.textMain }]}>
                          {workout.is_completed ? 'تم الإنجاز' : 'تحديد كمنجز'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.exerciseActionButton, styles.exerciseActionPrimary]}
                        onPress={() => router.push({
                          pathname: '/exercise-details',
                          params: {
                            id: workout.id,
                            title: workout.content,
                            category: categoryLabel,
                            difficulty: difficultyLabel,
                            duration: durationLabel,
                            calories: caloriesLabel,
                            muscle: muscleLabel,
                            sets: setsLabel,
                            mistakes: JSON.stringify(mistakesArray),
                            steps: JSON.stringify(stepsArray),
                            tips: tipsLabel
                          }
                        })}
                      >
                        <Ionicons name="play" size={18} color="#FFF" />
                        <Text style={[styles.exerciseActionText, { color: '#FFF' }]}>ابدأ التمرين</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Statistics Grid */}
          <View style={styles.statisticsSection}>
            <Text style={styles.sectionTitleText}>إحصائيات الشهر</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="flame" size={20} color="#EF4444" />
                </View>
                <Text style={styles.statLabel}>السعرات المحروقة</Text>
                <Text style={styles.statValue}>{stats.calories}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="checkbox" size={20} color={VITALITY_COLORS.successGreen} />
                </View>
                <Text style={styles.statLabel}>التمارين المنجزة</Text>
                <Text style={styles.statValue}>{stats.exercisesDone} تمارين</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="time" size={20} color="#3B82F6" />
                </View>
                <Text style={styles.statLabel}>ساعات التدريب</Text>
                <Text style={styles.statValue}>{stats.workoutHours} ساعة</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="flash" size={20} color="#F59E0B" />
                </View>
                <Text style={styles.statLabel}>أيام الاستمرار</Text>
                <Text style={styles.statValue}>{stats.streak} أيام</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VITALITY_COLORS.background,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: VITALITY_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: VITALITY_COLORS.primaryDark,
    marginLeft: 6,
    fontFamily: AppFontFamily.bold,
  },
  headerTitleIcon: {
    transform: [{ rotate: '-45deg' }],
  },
  scrollContent: {
    padding: 20,
  },
  progressCard: {
    backgroundColor: VITALITY_COLORS.primaryContainer,
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 24,
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressInfo: {
    alignItems: 'flex-start',
    flex: 1,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: AppFontFamily.bold,
    textAlign: 'left',
  },
  progressSubtitle: {
    fontSize: 12,
    color: '#A9CEC2',
    marginTop: 4,
    fontFamily: AppFontFamily.regular,
    textAlign: 'left',
  },
  progressBadgeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressMeterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: VITALITY_COLORS.accentOrange,
    borderRadius: 4,
  },
  progressPercentText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: VITALITY_COLORS.accentOrange,
  },
  noPlanProgressText: {
    fontSize: 13,
    color: '#C4EBDE',
    textAlign: 'left',
    fontFamily: AppFontFamily.medium,
  },
  cardDecorativeCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    top: -50,
    left: -50,
  },
  calendarSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: VITALITY_COLORS.primaryDark,
    fontFamily: AppFontFamily.bold,
  },
  calendarScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  calendarDayCard: {
    width: 54,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  calendarDayCardToday: {
    backgroundColor: '#FAF0E6',
    borderColor: VITALITY_COLORS.accentOrange,
    shadowColor: VITALITY_COLORS.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: VITALITY_COLORS.textSecondary,
    marginBottom: 8,
  },
  dayLabelToday: {
    color: VITALITY_COLORS.accentOrange,
  },
  calendarCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: VITALITY_COLORS.successGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDateCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDateCircleToday: {
    backgroundColor: VITALITY_COLORS.accentOrange,
  },
  calendarDateText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: VITALITY_COLORS.textMain,
  },
  calendarDateTextToday: {
    color: '#FFF',
  },
  doctorNotesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 24,
  },
  doctorNotesHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  doctorNotesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: VITALITY_COLORS.primaryDark,
    fontFamily: AppFontFamily.bold,
  },
  doctorIconContainer: {
    backgroundColor: '#EBF5F2',
    padding: 6,
    borderRadius: 8,
  },
  doctorNotesList: {
    gap: 8,
  },
  doctorNoteItem: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 10,
  },
  doctorNoteText: {
    fontSize: 12,
    color: VITALITY_COLORS.textSecondary,
    textAlign: 'left',
    flex: 1,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: VITALITY_COLORS.primaryDark,
  },
  exercisesSection: {
    marginBottom: 24,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: VITALITY_COLORS.primaryDark,
    fontFamily: AppFontFamily.bold,
    textAlign: 'left',
    marginBottom: 16,
  },
  emptyWorkoutsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyWorkoutsText: {
    fontSize: 14,
    color: VITALITY_COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    fontFamily: AppFontFamily.medium,
    lineHeight: 22,
  },
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  exerciseCardCompleted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#A7F3D0',
  },
  exerciseCardContent: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  exerciseImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  exerciseImageCompleted: {
    opacity: 0.6,
  },
  exerciseInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: VITALITY_COLORS.textMain,
    textAlign: 'left',
    fontFamily: AppFontFamily.bold,
  },
  completedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  completedBadgeText: {
    fontSize: 10,
    color: VITALITY_COLORS.successGreen,
    fontWeight: 'bold',
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 6,
  },
  tagBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagBadgeText: {
    fontSize: 10,
    color: VITALITY_COLORS.primaryDark,
    fontWeight: '500',
  },
  exerciseMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  exerciseMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseMetaText: {
    fontSize: 12,
    color: VITALITY_COLORS.textSecondary,
    marginRight: 4,
  },
  exerciseCardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    height: 48,
  },
  exerciseActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  exerciseActionSecondary: {
    borderLeftWidth: 1,
    borderLeftColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  exerciseActionPrimary: {
    backgroundColor: VITALITY_COLORS.accentOrange,
  },
  exerciseActionText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  statisticsSection: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'flex-start',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    color: VITALITY_COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: VITALITY_COLORS.primaryDark,
    fontFamily: AppFontFamily.bold,
  },
  fab: {
    position: 'absolute',
    bottom: 95,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: VITALITY_COLORS.accentOrange,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: VITALITY_COLORS.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
