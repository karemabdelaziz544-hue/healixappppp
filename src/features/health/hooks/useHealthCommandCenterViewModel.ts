import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LayoutAnimation } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../lib/supabase';
import { AppCache } from '../../../lib/cache';
import { logger } from '../../../lib/logger';
import { HealthDataProvider } from '../services/HealthDataProvider';
import { HealthAnalyticsEngine, HealthAnalysis } from '../services/HealthAnalyticsEngine';
import { HealthLogger } from '../services/HealthLogger';
import { HealixAIContextBuilder } from '../services/HealixAIContextBuilder';
import { HealixAITriggerManager } from '../services/HealixAITriggerManager';
import { OfflineQueue } from '../../../lib/offlineQueue';
import { ActivityEventEmitter } from '../../activity/services/ActivityEventEmitter';
import type { DigitalHealthRecord, TimelineEvent } from '../../../types/digitalHealthRecord';
import type { PlanTask } from '../../../types';
import { AppColors } from '../../../../constants/AppTheme';

interface UseHealthCommandCenterViewModelProps {
  userId: string;
  todayStr: string;
}

export function useHealthCommandCenterViewModel({ userId, todayStr }: UseHealthCommandCenterViewModelProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core Data States
  const [dhr, setDhr] = useState<DigitalHealthRecord | null>(null);
  const [analysis, setAnalysis] = useState<HealthAnalysis | null>(null);

  // Local Reactive States (Optimistic UI binds)
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [activitySteps, setActivitySteps] = useState(0);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [localTimelineEvents, setLocalTimelineEvents] = useState<TimelineEvent[]>([]);

  // Guided Journey & Presentation States
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const [streakDays, setStreakDays] = useState(1);
  const [heroSummary, setHeroSummary] = useState('');
  const [greeting, setGreeting] = useState('يسعدنا رؤيتك اليوم.');
  const [activitySyncTime, setActivitySyncTime] = useState('تمت المزامنة منذ ثوانٍ');

  const pendingTaskIds = useRef(new Set<string>());

  // 1. Fetch Complete Digital Health Record on mount/refresh
  const loadDashboardData = useCallback(async (clearCache = false) => {
    if (!userId) return;
    setLoading(true);

    try {
      const cacheKey = `dashboard_${userId}`;
      const timelineCacheKey = `timeline_${userId}_${todayStr}`;
      const streakKey = `user_streak_${userId}`;
      const lastDateKey = `user_last_active_date_${userId}`;

      // Calculate dynamic commitment streak for active profile
      const cachedStreak = (await AppCache.get<number>(streakKey)) || 0;
      const lastActiveDate = await AppCache.get<string>(lastDateKey);

      let currentStreak = 1;
      if (!lastActiveDate) {
        currentStreak = 1;
      } else if (lastActiveDate === todayStr) {
        currentStreak = cachedStreak || 1;
      } else {
        const todayDate = new Date(todayStr);
        const lastDate = new Date(lastActiveDate);
        const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentStreak = (cachedStreak || 0) + 1;
        } else {
          currentStreak = 1;
        }
      }

      await AppCache.set(streakKey, currentStreak);
      await AppCache.set(lastDateKey, todayStr);
      setStreakDays(currentStreak);

      if (clearCache) {
        await AppCache.invalidate(cacheKey);
      }

      // Load persisted timeline events for today
      const savedTimeline = await AppCache.get<TimelineEvent[]>(timelineCacheKey);
      if (savedTimeline) {
        setLocalTimelineEvents(savedTimeline);
      }

      // Check cache first
      const cached = await AppCache.get<any>(cacheKey);
      if (cached && !clearCache) {
        setDhr(cached.dhr);
        setTasks(cached.tasks);
        setWaterGlasses(cached.waterGlasses);
        setActivitySteps(cached.activitySteps);
        setLoading(false);
      }

      const fetchedDhr = await HealthDataProvider.fetchDigitalHealthRecord(userId, todayStr);
      if (fetchedDhr) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setDhr(fetchedDhr);
        
        // Merge meals and workouts into a single checklists registry
        const allTasks = [
          ...fetchedDhr.meals.todayMeals,
          ...(fetchedDhr.workouts?.todayWorkouts || [])
        ];
        setTasks(allTasks);
        setWaterGlasses(fetchedDhr.water.consumedGlasses);
        setActivitySteps(fetchedDhr.activity.steps);

        // Save to cache
        await AppCache.set(cacheKey, {
          dhr: fetchedDhr,
          tasks: allTasks,
          waterGlasses: fetchedDhr.water.consumedGlasses,
          activitySteps: fetchedDhr.activity.steps
        });
      }
    } catch (e) {
      logger.error('[useHealthCommandCenterViewModel] load failed:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, todayStr]);

  // Reset local states on profile change to prevent stale data cross-contamination
  useEffect(() => {
    setDhr(null);
    setAnalysis(null);
    setTasks([]);
    setWaterGlasses(0);
    setActivitySteps(0);
    setAiRecommendation(null);
    setLocalTimelineEvents([]);

    if (userId) {
      const cacheKey = `healix_ai_dashboard_${userId}_${todayStr}`;
      AppCache.get<string>(cacheKey).then(cached => {
        if (cached && !cached.includes('حاول المشي') && !cached.includes('الدورة الدموية')) {
          setAiRecommendation(cached);
        }
      });
    }
  }, [userId, todayStr]);

  // Initial load on mount or profile change
  useEffect(() => {
    loadDashboardData();
  }, [userId, loadDashboardData]);

  // Sync expanded meal state to first uncompleted meal when tasks change
  useEffect(() => {
    const mealsList = tasks.filter(t => t.task_type !== 'workout');
    if (mealsList.length > 0) {
      if (!expandedMealId || !mealsList.some(m => m.id === expandedMealId)) {
        const firstUncompleted = mealsList.find(m => !m.is_completed);
        setExpandedMealId(firstUncompleted ? firstUncompleted.id : mealsList[0].id);
      }
    }
  }, [tasks]);

  // Pedometer Watcher logic inside hook — uses ActivityEventEmitter instead of
  // a direct sensor subscription so it respects the ActivitySyncManager batching logic.
  useEffect(() => {
    if (!userId || !dhr || dhr.profile.role !== 'client') return;

    const unsub = ActivityEventEmitter.subscribe('ActivityUpdated', (payload: { steps: number }) => {
      const steps = payload.steps;
      setActivitySteps(steps);
      setActivitySyncTime('تمت المزامنة للتو');

        // Prepend achievement event if steps hit goal milestones
        const goal = dhr.goals.activity.daily_steps || 10000;
        if (steps >= goal && activitySteps < goal) {
          const nowTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
          const newEvent: TimelineEvent = {
            id: `steps_goal_${Date.now()}`,
            title: 'إنجاز الحركة اليومية',
            subtitle: `أحسنت! حققت هدف المشي اليوم بالكامل بتجاوزك ${goal.toLocaleString()} خطوة.`,
            time: nowTime,
            icon: 'trophy',
            color: AppColors.accent,
            type: 'AchievementEvent'
          };
          setLocalTimelineEvents(prev => [newEvent, ...prev]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    });

    return () => {
      unsub();
    };
  }, [userId, dhr, activitySteps]);

  // 2. Dynamic Client-Side Presentation Recalculations (Instant updates on action)
  const activeDhr = useMemo<DigitalHealthRecord | null>(() => {
    if (!dhr) return null;
    const todayMeals = tasks.filter(t => t.task_type !== 'workout');
    const todayWorkouts = tasks.filter(t => t.task_type === 'workout');

    return {
      ...dhr,
      activity: {
        ...dhr.activity,
        steps: activitySteps,
        distance: Number(((activitySteps * 0.76) / 1000).toFixed(2)),
        active_minutes: Math.round(activitySteps / 100),
        calories: Number((activitySteps * 0.04).toFixed(1)),
        walking_minutes: Math.round(activitySteps / 100)
      },
      meals: {
        ...dhr.meals,
        todayMeals,
        completedCount: todayMeals.filter(t => t.is_completed).length,
        totalCount: todayMeals.length,
        compliancePercent: todayMeals.length > 0
          ? Math.round((todayMeals.filter(t => t.is_completed).length / todayMeals.length) * 100)
          : 0
      },
      workouts: {
        todayWorkouts,
        completedCount: todayWorkouts.filter(t => t.is_completed).length,
        totalCount: todayWorkouts.length
      },
      water: {
        ...dhr.water,
        consumedGlasses: waterGlasses,
        consumedLiters: waterGlasses * 0.25
      }
    };
  }, [dhr, tasks, waterGlasses, activitySteps]);

  useEffect(() => {
    if (!activeDhr) return;

    // Calculate dynamic analysis values
    const report = HealthAnalyticsEngine.analyze(activeDhr, streakDays);
    setAnalysis(report);

    // Dynamic greeting & summary builders
    const hour = new Date().getHours();
    let greet = 'مرحباً بك';
    if (hour >= 5 && hour < 12) greet = 'صباح الخير';
    else if (hour >= 12 && hour < 17) greet = 'طاب يومك';
    else if (hour >= 17 && hour < 22) greet = 'مساء الخير';
    else greet = 'طاب مساؤك';

    const clientName = activeDhr.profile.full_name?.split(' ')[0] || '';
    setGreeting(`${greet}، ${clientName}`);

    // Summary calculation for Hero
    const todayMeals = activeDhr.meals.todayMeals;
    const remainingMealsCount = todayMeals.filter((t: any) => !t.is_completed).length;
    const targetLiters = activeDhr.water.targetLiters || 2.5;
    const consumedLiters = waterGlasses * 0.25;
    const remainingLiters = Math.max(0, targetLiters - consumedLiters).toFixed(1);

    if (remainingMealsCount > 0 && Number(remainingLiters) > 0) {
      setHeroSummary(`فاضلك ${remainingMealsCount} وجبة ومتبقي ${remainingLiters} لتر مياه`);
    } else if (remainingMealsCount > 0) {
      setHeroSummary(`فاضلك ${remainingMealsCount} وجبة لإكمال الخطة اليومية`);
    } else if (Number(remainingLiters) > 0) {
      setHeroSummary(`متبقي ${remainingLiters} لتر مياه للوصول للهدف`);
    } else {
      setHeroSummary('ممتاز! تم تحقيق التزامات اليوم بالكامل 🏆');
    }
  }, [activeDhr, waterGlasses, streakDays]);

  // 3. User Hydration Actions
  const handleLogWater = useCallback(async (amount: number) => {
    if (!userId || !dhr) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Optimistic UI updates
    const newGlasses = waterGlasses + amount;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setWaterGlasses(newGlasses);

    const nowTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const addedMl = Math.round(amount * 250);
    const newEvent: TimelineEvent = {
      id: `water_${Date.now()}`,
      title: `شربت ${addedMl}ml مياه`,
      subtitle: `إجمالي المستهلك الان: ${(newGlasses * 0.25).toFixed(1)} لتر.`,
      time: nowTime,
      icon: 'water',
      color: AppColors.primary,
      type: 'WaterEvent'
    };
    setLocalTimelineEvents(prev => {
      const updated = [newEvent, ...prev];
      AppCache.set(`timeline_${userId}_${todayStr}`, updated);
      return updated;
    });

    // Async write through unified logger
    await HealthLogger.log(userId, 'water', amount, { target: dhr.water.targetGlasses });
  }, [userId, dhr, waterGlasses, todayStr]);

  const handleUndoWater = useCallback(async () => {
    if (!userId || !dhr || waterGlasses <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newGlasses = Math.max(waterGlasses - 1.0, 0);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setWaterGlasses(newGlasses);

    // Pop the latest local water timeline event
    setLocalTimelineEvents(prev => {
      const idx = prev.findIndex(e => e.type === 'WaterEvent');
      if (idx !== -1) {
        const cpy = [...prev];
        cpy.splice(idx, 1);
        AppCache.set(`timeline_${userId}_${todayStr}`, cpy);
        return cpy;
      }
      return prev;
    });

    await HealthLogger.undo(userId, 'water', { target: dhr.water.targetGlasses });
  }, [userId, dhr, waterGlasses]);

  // 4. Checklist Item Toggles
  const handleToggleTask = useCallback(async (taskId: string, currentStatus: boolean) => {
    if (!userId) return;
    if (pendingTaskIds.current.has(taskId)) return;
    pendingTaskIds.current.add(taskId);

    const newStatus = !currentStatus;
    Haptics.impactAsync(newStatus ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updated = tasks.map(t => t.id === taskId ? { ...t, is_completed: newStatus } : t);
    setTasks(updated);

    // Auto-advance expanded meal to next uncompleted meal if completing current meal
    const mealsList = updated.filter(t => t.task_type !== 'workout');
    if (newStatus) {
      const nextUncompleted = mealsList.find(m => !m.is_completed);
      if (nextUncompleted) {
        setExpandedMealId(nextUncompleted.id);
      }
    }

    // Prepend timeline item locally
    const matched = tasks.find(t => t.id === taskId);
    if (matched) {
      const isWorkout = matched.task_type === 'workout';
      const nowTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      const eventTitle = newStatus 
        ? (isWorkout ? `أنهيت ${matched.content || 'التمرين'}` : `أنهيت ${matched.title || matched.content || 'الوجبة'}`)
        : (isWorkout ? `تراجعت عن ${matched.content}` : `تراجعت عن ${matched.title || matched.content}`);
      
      const newEvent: TimelineEvent = {
        id: `task_${taskId}_${Date.now()}`,
        title: eventTitle,
        subtitle: newStatus ? 'تم التوثيق والارسال للطبيب المعالج' : 'تم إلغاء التوثيق',
        time: nowTime,
        icon: isWorkout ? 'barbell' : 'restaurant',
        color: AppColors.primary,
        type: isWorkout ? 'WorkoutEvent' : 'MealEvent'
      };
      setLocalTimelineEvents(prev => {
        const updated = [newEvent, ...prev];
        AppCache.set(`timeline_${userId}_${todayStr}`, updated);
        return updated;
      });
    }

    try {
      const isValidUuid = typeof taskId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
      if (isValidUuid) {
        await OfflineQueue.addMutation('task_toggle', userId, {
          taskId,
          isCompleted: newStatus,
          logDate: todayStr
        });
      } else {
        logger.warn(`[useHealthCommandCenterViewModel] Skipping OfflineQueue mutation for non-UUID taskId: ${taskId}`);
      }
    } catch (e) {
      logger.error('[useHealthCommandCenterViewModel] task toggle mutation failed:', e);
      // Revert UI on failure
      setTasks(tasks);
    } finally {
      pendingTaskIds.current.delete(taskId);
    }
  }, [userId, tasks, todayStr]);

  // Instant profile switch cache swap
  useEffect(() => {
    setAiRecommendation(null);
    if (userId) {
      const cacheKey = `healix_ai_dashboard_${userId}_${todayStr}`;
      AppCache.get<string>(cacheKey).then(cached => {
        if (cached && !cached.includes('حاول المشي') && !cached.includes('الدورة الدموية')) {
          setAiRecommendation(cached);
        }
      });
    }
  }, [userId, todayStr]);

  // 5. Refetch AI coach recommendations with dynamic prompt & event-driven trigger manager
  const handleFetchAIRecommendation = useCallback(async (force = false) => {
    const currentDhr = activeDhr || dhr;
    if (!userId || !currentDhr || !analysis) return;

    // Guard against stale DHR from previous profile during profile switch transition
    if (currentDhr.profile.id !== userId) {
      logger.log(`[useHealthCommandCenterViewModel] Stale DHR profile ID (${currentDhr.profile.id}) does not match active userId (${userId}). Skipping AI call.`);
      return;
    }

    const cacheKey = `healix_ai_dashboard_${userId}_${todayStr}`;
    const cachedTip = await AppCache.get<string>(cacheKey);
    const firstFirstName = currentDhr.profile.full_name?.split(' ')[0] || '';
    const isStaleFallback = !!cachedTip && (cachedTip.includes('حاول المشي') || cachedTip.includes('الدورة الدموية'));
    const isWrongName = !!cachedTip && !!firstFirstName && !cachedTip.includes(firstFirstName);
    const effectiveForce = force || isStaleFallback || isWrongName;

    // Evaluate if a meaningful change event occurred on activeDhr
    const { shouldCall, reason } = await HealixAITriggerManager.shouldTriggerAICall(userId, todayStr, currentDhr, effectiveForce);

    if (!shouldCall && cachedTip && !isStaleFallback && !isWrongName) {
      logger.log(`[useHealthCommandCenterViewModel] Using cached AI tip. Reason: ${reason}`);
      setAiRecommendation(cachedTip);
      return;
    }

    try {
      const contextPrompt = HealixAIContextBuilder.buildContext(currentDhr, analysis);
      const isSameUserTip = !!cachedTip && !isWrongName && !isStaleFallback;
      const previousTipContext = isSameUserTip ? `\n\nالرسالة السابقة التي قلتها للمستخدم: "${cachedTip}". ابدأ من حيث انتهيت بدون تكرار التحية أو الجمل المكررة.` : '';

      const session = (await supabase.auth.getSession()).data.session;
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const { data, error } = await supabase.functions.invoke('healix-ai', {
        headers,
        body: {
          mode: 'dashboard_coach',
          profileId: userId,
          messages: [
            {
              role: 'user',
              content: `أنت كوتش الصفحة الرئيسية لـ Healix للمستخدم ${firstFirstName}. اكتب رسالة مصرية قصيرة جداً ومشجعة ومحددة (بين 30 إلى 50 كلمة فقط). خاطبه باسمه الأول فقط. لا تصف أدوية ولا دايت ولا تأخذ دور الطبيب.\n\nالسياق الشامل للتقدم اليومي:\n${contextPrompt}${previousTipContext}`
            }
          ]
        }
      });

      if (error) throw error;
      const tip = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text;
      if (tip) {
        const cleaned = tip.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim();
        
        setAiRecommendation(cleaned);
        await HealixAITriggerManager.recordAICall(userId, todayStr, currentDhr, cleaned);
      }
    } catch (e) {
      logger.warn('[useHealthCommandCenterViewModel] AI Edge Function offline/unavailable, using dynamic local fallback:', e);
      if (cachedTip && !cachedTip.includes('حاول المشي') && !cachedTip.includes('الدورة الدموية')) {
        setAiRecommendation(cachedTip);
      } else {
        const firstName = currentDhr.profile.full_name?.split(' ')[0] || 'يا بطل';
        const todayMeals = currentDhr.meals.todayMeals || [];
        const uncompleted = todayMeals.filter(m => !m.is_completed);
        const consumedW = currentDhr.water.consumedLiters || 0;
        const targetW = currentDhr.water.targetLiters || 2.5;

        // Rich soulful Egyptian phrases pool
        const mealPhrases = [
          `يا ${firstName} يا غالي! قدامك ${uncompleted[0]?.content || 'الوجبة القادمة'}، جاهز تاكلها ونكمل اليوم بحماس وطاقة عالية؟ 🥗`,
          `عاش يا ${firstName}! متبقي ${uncompleted[0]?.content || 'الوجبة القادمة'}، التزامك بيها هو اللبنة اللي بتبني بيها صحتك ورشاقتك اليوم! ✨`,
          `يا ${firstName}، ${uncompleted[0]?.content || 'وجبتك الجاية'} مستنياك، خليك مستمر بنفس القوة والروح الجميلة دي! 💪`,
        ];

        const waterPhrases = [
          `يا ${firstName}، أداءك في الأكل ممتاز! متبقي ${(targetW - consumedW).toFixed(1)} لتر مياه، اشرب بوق مياه دلوقتي عشان جسمك يجدد نشاطه 💧`,
          `عاش يا ${firstName}! الترطيب الصافي هو سر الصفاء والتركيز، اشرب كوباية مياه كبيرة دلوقتي وخليك دايماً رويان 🌊`,
        ];

        const donePhrases = [
          `إيه الحلاوة والجمال ده يا ${firstName}! قفلت كافة التزامات اليوم بنجاح باهر، أنا ككوتش فخور بيك جداً 🏆`,
          `يا ${firstName} يا بطل، 100% التزام اليوم! استمتع براحة استثنائية ونوم عميق ورائع الليلة ✨`,
        ];

        let dynamicFallback = `عاش يا ${firstName}! واصل الالتزام بالخطة اليومية لتحقيق أهدافك الصحية 🌟`;
        if (uncompleted.length > 0) {
          dynamicFallback = mealPhrases[Math.floor(Math.random() * mealPhrases.length)];
        } else if (consumedW < targetW) {
          dynamicFallback = waterPhrases[Math.floor(Math.random() * waterPhrases.length)];
        } else {
          dynamicFallback = donePhrases[Math.floor(Math.random() * donePhrases.length)];
        }
        setAiRecommendation(dynamicFallback);
      }
    }
  }, [userId, activeDhr, dhr, analysis, todayStr]);

  // Auto trigger AI recommendation evaluation on data changes
  useEffect(() => {
    if (analysis && activeDhr) {
      handleFetchAIRecommendation();
    }
  }, [analysis, activeDhr, handleFetchAIRecommendation]);

  // Pull to refresh handler — preserves AI tip cache unless event trigger fires
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData(true);
    setRefreshing(false);
  }, [loadDashboardData]);

  // Merged Timeline events getter (dynamic prepends + DB timeline logs)
  // Strictly profile-isolated and excludes AI Coach recommendation messages
  const compiledTimeline = [...localTimelineEvents, ...(dhr?.timeline || [])].filter(
    event => event.type !== 'AIEvent' && !event.id.startsWith('ai_tip_') && !event.title.includes('كوتش')
  );

  return {
    loading,
    refreshing,
    dhr,
    analysis,
    tasks,
    expandedMealId,
    streakDays,
    heroSummary,
    waterGlasses,
    activitySteps,
    aiRecommendation,
    timeline: compiledTimeline,
    greeting,
    activitySyncTime,
    actions: {
      setExpandedMealId,
      onLogWater: handleLogWater,
      onUndoWater: handleUndoWater,
      onToggleTask: handleToggleTask,
      onRefresh: handleRefresh,
      onTriggerAI: () => handleFetchAIRecommendation(true)
    }
  };
}
