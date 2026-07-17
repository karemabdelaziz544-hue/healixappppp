import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, Image, LayoutAnimation, Platform, RefreshControl, StyleSheet, UIManager, View, Modal, TouchableOpacity } from 'react-native';
import { Text } from '@/components/AppText';
import { useFocusEffect, useRouter } from 'expo-router';
import { AnimatedButton } from '../animations/AnimatedButton';

// 🔴 AUDIT FIX: تفعيل LayoutAnimation على أندرويد
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import NotificationBell from '../NotificationBell';
import Skeleton from '../Skeleton';
import { AppColors, NutritionalColors, AppFontFamily } from '../../constants/AppTheme';
import { Strings } from '../../constants/strings';
import { useFamily } from '../../src/context/FamilyContext';
import { supabase } from '../../src/lib/supabase';
import { executeQuery } from '../../src/lib/apiClient';
import { logger } from '../../src/lib/logger';
import type { Plan, PlanTask } from '../../src/types';
import { AppCache } from '../../src/lib/cache';
import { OfflineQueue } from '../../src/lib/offlineQueue';

// timezone-safe date extraction in local time (e.g. Egypt date without UTC shifts)
const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

// Helper function to split meal description into a clean bullet list array
const parseMealComponents = (content: string): string[] => {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const items: string[] = [];
  lines.forEach(line => {
    let cleaned = line.trim();
    if (!cleaned) return;
    // Remove bullets •, -, *, +, or numbers like 1., 2.
    cleaned = cleaned.replace(/^([•\-\*\+]\s*|\d+[\.\)\-]\s*)/, '');
    cleaned = cleaned.trim();
    if (cleaned) {
      items.push(cleaned);
    }
  });
  if (items.length === 1 && content.includes(',')) {
    return content.split(',').map(s => s.trim().replace(/^([•\-\*\+]\s*|\d+[\.\)\-]\s*)/, '').trim()).filter(Boolean);
  }
  return items;
};

const AccountSwitcherHeader = React.memo(({
  currentProfile,
  familyMembers,
  switchProfile,
  userName
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [displayProfile, setDisplayProfile] = useState(currentProfile);
  const [displayUserName, setDisplayUserName] = useState(userName);

  const dropdownOpacity = useRef(new Animated.Value(0)).current;
  const dropdownScale = useRef(new Animated.Value(0.9)).current;
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAvatars = async () => {
      const urls: Record<string, string> = {};
      const profilesToFetch = [...(familyMembers || [])];
      if (currentProfile && !profilesToFetch.find(m => m.id === currentProfile.id)) {
        profilesToFetch.push(currentProfile);
      }

      for (const p of profilesToFetch) {
        if (p.avatar_url) {
          if (p.avatar_url.startsWith('http')) {
            urls[p.id] = p.avatar_url;
          } else {
            const { data } = await supabase.storage.from('avatars').createSignedUrl(p.avatar_url, 3600);
            if (data?.signedUrl) urls[p.id] = data.signedUrl;
          }
        }
      }
      setAvatarUrls(urls);
    };

    fetchAvatars();
  }, [familyMembers, currentProfile]);

  // Crossfade transition when profile changes
  useEffect(() => {
    if (currentProfile?.id !== displayProfile?.id) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setDisplayProfile(currentProfile);
        setDisplayUserName(currentProfile?.full_name?.split(' ')[0] || Strings.dashboard.defaultName);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    } else {
      setDisplayProfile(currentProfile);
      setDisplayUserName(currentProfile?.full_name?.split(' ')[0] || Strings.dashboard.defaultName);
      fadeAnim.setValue(1);
    }
  }, [currentProfile?.id]);

  const hasSubAccounts = familyMembers && familyMembers.length > 1;

  const openDropdown = () => {
    if (!hasSubAccounts) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(true);
    Animated.parallel([
      Animated.timing(dropdownOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(dropdownScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  const closeDropdown = () => {
    Animated.parallel([
      Animated.timing(dropdownOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.spring(dropdownScale, { toValue: 0.9, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start(() => setIsOpen(false));
  };

  const handleSwitch = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    closeDropdown();
    if (id !== currentProfile?.id) {
      switchProfile(id);
    }
  };

  return (
    <View style={{ zIndex: 100 }}>
      <View style={styles.header}>
        <AnimatedButton style={styles.iconCircle}>
          <NotificationBell />
        </AnimatedButton>

        <Animated.View style={[styles.headerTextWrap, { opacity: fadeAnim }]}>
          <Text style={styles.greeting}>صباح الخير، {displayUserName}</Text>
          <Text style={styles.subGreeting}>لنكمل رحلتك الغذائية اليوم.</Text>
        </Animated.View>

        <AnimatedButton
          activeOpacity={hasSubAccounts ? 0.7 : 1}
          onPress={openDropdown}
          style={[styles.avatarButton, !hasSubAccounts && { opacity: 0.6 }]}
        >
          <Animated.View style={[styles.avatarPlaceholder, { opacity: fadeAnim }]}>
            {displayProfile?.id && avatarUrls[displayProfile.id] ? (
              <Image source={{ uri: avatarUrls[displayProfile.id] }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>{displayUserName?.charAt(0)}</Text>
            )}
          </Animated.View>
          {hasSubAccounts && (
            <View style={styles.dropdownBadge}>
              <Ionicons name="chevron-down" size={10} color="#FFFFFF" />
            </View>
          )}
        </AnimatedButton>
      </View>

      <Modal visible={isOpen} transparent animationType="none">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeDropdown}>
          <Animated.View style={[
            styles.dropdownMenu,
            { opacity: dropdownOpacity, transform: [{ scale: dropdownScale }] }
          ]}>
            <Text style={styles.dropdownTitle}>تبديل الحساب</Text>
            {familyMembers?.map((member: any) => {
              const isActive = member.id === currentProfile?.id;
              const isMain = !member.manager_id;
              const roleText = isMain ? "الحساب الرئيسي" : "حساب تابع";
              return (
                <AnimatedButton
                  key={member.id}
                  style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                  onPress={() => handleSwitch(member.id)}
                >
                  <View style={styles.dropdownAvatarWrap}>
                    {avatarUrls[member.id] ? (
                      <Image source={{ uri: avatarUrls[member.id] }} style={styles.dropdownAvatar} />
                    ) : (
                      <View style={styles.dropdownAvatarPlaceholder}>
                        <Text style={styles.dropdownAvatarInitial}>{member.full_name?.charAt(0)}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.dropdownItemContent}>
                    <Text style={styles.dropdownItemName}>{member.full_name}</Text>
                    <Text style={styles.dropdownItemRole}>{roleText}</Text>
                  </View>
                  {isActive && <View style={styles.activeProfileBadge} />}
                </AnimatedButton>
              );
            })}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

export default function MainDashboardView() {
  const router = useRouter();
  const { currentProfile, familyMembers, switchProfile } = useFamily();
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
      const todayStr = getLocalDateString(today);

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
          .neq('plan_type', 'workout')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        { isIdempotent: true }
      );



      let finalTasks: PlanTask[] = [];

      if (activePlan) {
        setPlan(activePlan as Plan);

        // 🚀 Parallelize Tasks & Logs fetching
        // daily_task_logs uses raw Supabase (no timeout wrapper) — executeQuery's 15s timeout
        // causes false empty results on slow Expo Go / debug network connections.
        const [tasksRes, logsRaw] = await Promise.all([
          executeQuery<PlanTask[]>(
            supabase.from('plan_tasks')
              .select('id, plan_id, day_name, content, task_type, is_completed, order_index')
              .eq('plan_id', activePlan.id)
              .order('order_index', { ascending: true }),
            { isIdempotent: true }
          ),
          supabase.from('daily_task_logs')
            .select('task_id, is_completed')
            .eq('user_id', userId)
            .eq('log_date', todayStr),
        ]);

        const allTasks = (tasksRes.data || []).filter(t => t.task_type !== 'workout');
        const logData = logsRaw.data;

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
  }, [userId]);

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

  // ✅ Synchronize screen when focused
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchDashboardData();
      }
    }, [userId, fetchDashboardData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Clear stale cache so old is_completed values don't flash during fetch
    await AppCache.invalidate(`dashboard_${userId}`);
    await fetchDashboardData();
    setRefreshing(false);
  }, [fetchDashboardData, userId]);

  const pendingTaskIds = useRef(new Set<string>());

  const toggleTask = useCallback(async (taskId: string, currentStatus: boolean) => {
    if (pendingTaskIds.current.has(taskId)) return;
    pendingTaskIds.current.add(taskId);

    const newStatus = !currentStatus;
    const todayStr = getLocalDateString();

    // Trigger LayoutAnimation for smooth UI transitions
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // Optimistic UI update
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, is_completed: newStatus } : t);
    setTasks(updatedTasks);

    await Haptics.impactAsync(newStatus ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);

    try {
      // Write to daily_task_logs via OfflineQueue (uses executeQuery internally)
      await OfflineQueue.addMutation('task_toggle', userId!, {
        taskId,
        isCompleted: newStatus,
        logDate: todayStr
      });

      // Only persist cache AFTER the mutation is queued/synced so cache matches DB
      await AppCache.set(`dashboard_${userId}`, {
        plan,
        tasks: updatedTasks,
        streak
      });
    } catch (err) {
      // Revert optimistic update on failure
      logger.error('[toggleTask] Failed:', err);
      setTasks(tasks);
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

  // Purely sequential meal extraction directly from backend tasks data
  const uncompletedTasks = tasks.filter(t => !t.is_completed);
  const currentMealTask = uncompletedTasks.length > 0 ? uncompletedTasks[0] : null;
  const nextMealTask = uncompletedTasks.length > 1 ? uncompletedTasks[1] : null;

  const renderAICard = () => (
    <View style={styles.aiCard}>
      <View style={styles.aiCardHeader}>
        <View style={styles.aiCardTitleRow}>
          <Ionicons name="sparkles" size={20} color={AppColors.accent} style={{ marginLeft: 6 }} />
          <Text style={styles.aiCardTitle}>Healix AI</Text>
        </View>
        <Text style={styles.aiCardSubtitle}>اسأل عن التغذية، السعرات الحرارية، أو أي استفسار صحي عام.</Text>
      </View>

      <View style={styles.aiBulletsContainer}>
        <View style={styles.aiBulletRow}>
          <View style={styles.aiBulletDot} />
          <Text style={styles.aiBulletText}>التغذية والسعرات الحرارية</Text>
        </View>
        <View style={styles.aiBulletRow}>
          <View style={styles.aiBulletDot} />
          <Text style={styles.aiBulletText}>الأنظمة الغذائية والأكل الصحي</Text>
        </View>
        <View style={styles.aiBulletRow}>
          <View style={styles.aiBulletDot} />
          <Text style={styles.aiBulletText}>العادات الصحية اليومية</Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.aiCardButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/healix-ai' as any);
        }}
      >
        <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" style={{ marginLeft: 8 }} />
        <Text style={styles.aiCardButtonText}>ابدأ المحادثة</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* sub-account banner */}
      {currentProfile?.manager_id && (
        <View style={styles.subAccountBanner}>
          <Ionicons name="swap-horizontal" size={16} color="#FFF" />
          <Text style={styles.subAccountBannerText}>{Strings.dashboard.subAccountViewing(currentProfile.full_name)}</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.primary]} />}
      >
        {/* 1. Header with Account Switcher */}
        <AccountSwitcherHeader
          currentProfile={currentProfile}
          familyMembers={familyMembers}
          switchProfile={switchProfile}
          userName={userName}
        />

        {tasks.length > 0 ? (
          <>
            {/* 2. Daily Progress Card */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View style={styles.progressHeaderLeft}>
                  <Text style={styles.progressTitle}>رحلة اليوم</Text>
                  <Text style={styles.progressSubtitle}>
                    {completedCount} من {tasks.length} وجبات مكتملة
                  </Text>
                </View>
                <Text style={styles.progressPercent}>{progress}%</Text>
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

            {/* 3. Current Meal Card / Celebration Card */}
            {currentMealTask ? (
              <View style={styles.currentMealCard}>
                <View style={styles.currentMealHeader}>
                  <Ionicons name="restaurant" size={16} color="#FD761C" style={{ marginLeft: 6 }} />
                  <Text style={styles.currentMealSubtitle}>الوجبة الحالية</Text>
                </View>

                <Text style={styles.currentMealTitle}>
                  {getTaskMeta(currentMealTask).title}
                </Text>

                {/* Max-height scrollable bullet list of components (Simple bullets, no checkboxes) */}
                <View style={styles.mealScrollWrapper}>
                  <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
                    {parseMealComponents(currentMealTask.content).map((component, idx) => (
                      <View key={idx} style={styles.bulletRow}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.bulletText}>{component}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                {/* Fixed CTA button */}
                <AnimatedButton
                  activeOpacity={0.9}
                  onPress={() => toggleTask(currentMealTask.id, currentMealTask.is_completed)}
                  style={styles.ctaButton}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                  <Text style={styles.ctaButtonText}>تم تناول الوجبة</Text>
                </AnimatedButton>
              </View>
            ) : (
              // 4. Celebration Card when all meals completed
              <View style={styles.celebrationCard}>
                <Ionicons name="trophy-outline" size={48} color="#10B981" style={{ marginBottom: 12 }} />
                <Text style={styles.celebrationTitle}>أحسنت!</Text>
                <Text style={styles.celebrationSubtitle}>لقد أنهيت جميع وجبات اليوم.</Text>
                <View style={styles.celebrationDivider} />
                <Text style={styles.celebrationMotivational}>{randomQuote}</Text>
              </View>
            )}

            {/* 5. Next Meal / Streak Grid */}
            <View style={styles.gridRow}>
              {/* Next Meal Card */}
              <View style={[styles.gridCard, styles.nextMealCard]}>
                <Text style={styles.gridLabel}>التالي</Text>
                <Text style={styles.gridValue} numberOfLines={1}>
                  {nextMealTask ? getTaskMeta(nextMealTask).title : 'لا يوجد وجبات متبقية'}
                </Text>
              </View>

              {/* Streak Card */}
              <View style={styles.gridCard}>
                <View style={styles.streakHeader}>
                  <Ionicons name="flame" size={18} color="#FD761C" style={{ marginLeft: 4 }} />
                  <Text style={styles.gridLabel}>الالتزام</Text>
                </View>
                <Text style={styles.gridValue}>
                  {streak} أيام متتالية
                </Text>
              </View>
            </View>

            {/* 6. Today's Journey Grouped Card */}
            <View style={styles.journeyWrapper}>
              <Text style={styles.journeySectionTitle}>خريطة اليوم</Text>
              <View style={styles.journeyGroupCard}>
                {tasks.map((task, idx) => {
                  const meta = getTaskMeta(task);
                  const isCurrent = currentMealTask?.id === task.id;

                  return (
                    <View key={task.id}>
                      <AnimatedButton
                        activeOpacity={0.8}
                        onPress={() => toggleTask(task.id, task.is_completed)}
                        style={styles.journeyRow}
                      >
                        {/* 1. Active Orange Bar indicator on the rightmost edge of the row */}
                        {isCurrent && <View style={styles.activeSideBar} />}

                        {/* 2. Meal Name (aligned to the right) */}
                        <View style={styles.journeyContentWrap}>
                          <Text
                            style={[
                              styles.journeyMealName,
                              task.is_completed && styles.journeyMealNameCompleted,
                              isCurrent && styles.journeyMealNameActive
                            ]}
                          >
                            {meta.title}
                          </Text>
                        </View>

                        {/* 3. Badge "الوجبة الحالية" */}
                        {isCurrent && (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>الوجبة الحالية</Text>
                          </View>
                        )}

                        {/* 4. Checkbox Circle on the far left */}
                        <View style={styles.journeyCheckWrap}>
                          {task.is_completed ? (
                            <Ionicons name="checkmark-circle" size={24} color={AppColors.success} />
                          ) : (
                            <Ionicons name="ellipse-outline" size={24} color="#D1D5DB" />
                          )}
                        </View>
                      </AnimatedButton>

                      {/* Divider */}
                      {idx < tasks.length - 1 && <View style={styles.journeyDivider} />}
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        ) : (
          // Empty State
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIconWrap}>
              <Ionicons name="cafe-outline" size={50} color="#12362E" />
            </View>
            <Text style={styles.emptyTitle}>{Strings.dashboard.restDay}</Text>
            <Text style={styles.emptySub}>{randomQuote}</Text>
          </View>
        )}

        {/* Healix AI Premium Entry Card */}
        {renderAICard()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  scrollContent: { paddingHorizontal: 24, paddingTop: 10 },

  // Header Styles
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  avatarButton: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2A4D44',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  dropdownBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#F26E11',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AppColors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 100 : 70,
    paddingHorizontal: 24,
  },
  dropdownMenu: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  dropdownTitle: {
    fontSize: 14,
    color: '#717975',
    fontWeight: '600',
    textAlign: 'left', // Aligns physically to the right in RTL mode
    marginBottom: 12,
    paddingRight: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  dropdownItemActive: {
    backgroundColor: '#F9F8F3',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#121C2A',
    textAlign: 'left', // Aligns physically to the right in RTL mode
  },
  dropdownItemRole: {
    fontSize: 12,
    color: '#717975',
    textAlign: 'left', // Aligns physically to the right in RTL mode
    marginTop: 2,
  },
  dropdownAvatarWrap: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  dropdownAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  dropdownAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2A4D44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  activeProfileBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  headerTextWrap: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#121C2A',
    textAlign: 'left', // Aligns physically to the right in RTL mode
  },
  subGreeting: {
    fontSize: 13,
    color: '#717975',
    marginTop: 2,
    textAlign: 'left', // Aligns physically to the right in RTL mode
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // Progress Card Styles
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressHeaderLeft: {
    alignItems: 'flex-start',
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#717975',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121C2A',
    marginTop: 4,
  },
  progressPercent: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FD761C',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#EFF4FF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FD761C',
    borderRadius: 4,
  },

  // Current Meal Card Styles (Dark Green Palette)
  currentMealCard: {
    backgroundColor: '#2A4D44',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  currentMealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentMealSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#97BDB1',
  },
  currentMealTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'left', // Aligns physically to the right in RTL mode
    marginBottom: 16,
  },
  mealScrollWrapper: {
    maxHeight: 140,
    marginBottom: 24,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingRight: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FD761C',
    marginHorizontal: 10,
  },
  bulletText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'left', // Aligns physically to the right in RTL mode
    flex: 1,
  },
  ctaButton: {
    height: 54,
    borderRadius: 20,
    backgroundColor: '#FD761C',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Celebration Card Styles
  celebrationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
  },
  celebrationTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 6,
  },
  celebrationSubtitle: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '600',
    textAlign: 'center',
  },
  celebrationDivider: {
    width: 60,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  celebrationMotivational: {
    fontSize: 13,
    color: '#717975',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // Next Meal / Streak Grid Styles
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    alignItems: 'flex-start',
  },
  nextMealCard: {
    borderRightWidth: 4,
    borderRightColor: '#FD761C',
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  gridLabel: {
    fontSize: 12,
    color: '#717975',
    fontWeight: '600',
  },
  gridValue: {
    fontSize: 16,
    color: '#121C2A',
    fontWeight: '700',
    marginTop: 6,
  },

  // Today's Journey Card Styles
  journeyWrapper: {
    marginBottom: 24,
  },
  journeySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121C2A',
    textAlign: 'left', // Aligns physically to the right in RTL mode
    marginBottom: 12,
    paddingRight: 4,
  },
  journeyGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    position: 'relative',
  },
  journeyRowActive: {
    backgroundColor: '#F9FAFB',
  },
  activeSideBar: {
    position: 'absolute',
    right: 0,
    top: '25%',
    bottom: '25%',
    width: 4,
    backgroundColor: '#FD761C',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  journeyContentWrap: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  journeyMealName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#121C2A',
    textAlign: 'left', // Aligns physically to the right in RTL mode
  },
  journeyMealNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
    opacity: 0.6,
  },
  journeyMealNameActive: {
    fontWeight: '700',
    color: '#12362E',
  },
  activeBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFE0C2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 12,
  },
  activeBadgeText: {
    color: '#FD761C',
    fontSize: 11,
    fontWeight: '700',
  },
  journeyCheckWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  journeyDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },

  // Empty State Styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 24,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyStateIconWrap: {
    width: 80,
    height: 80,
    backgroundColor: '#E8F3F1',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#121C2A',
  },
  emptySub: {
    fontSize: 14,
    color: '#717975',
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },

  // sub-account banner
  subAccountBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FD761C',
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  subAccountBannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  aiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(42, 75, 70, 0.08)',
    shadowColor: '#2A4B46',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  aiCardHeader: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  aiCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiCardTitle: {
    fontSize: 18,
    fontFamily: AppFontFamily.bold,
    color: AppColors.primary,
  },
  aiCardSubtitle: {
    fontSize: 14,
    fontFamily: AppFontFamily.medium,
    color: AppColors.textSecondary,
    textAlign: 'left',
  },
  aiBulletsContainer: {
    marginBottom: 24,
    gap: 10,
  },
  aiBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppColors.accent,
  },
  aiBulletText: {
    fontSize: 14,
    fontFamily: AppFontFamily.regular,
    color: AppColors.textPrimary,
    flex: 1,
    textAlign: 'left',
  },
  aiCardButton: {
    height: 52,
    borderRadius: 20,
    backgroundColor: AppColors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2A4B46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  aiCardButtonText: {
    fontSize: 15,
    fontFamily: AppFontFamily.bold,
    color: '#FFFFFF',
  },
});

