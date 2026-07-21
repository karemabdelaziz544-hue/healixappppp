import { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutAnimation } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../lib/supabase';
import { AppCache } from '../../../lib/cache';
import { logger } from '../../../lib/logger';
import { HealthDataProvider } from '../services/HealthDataProvider';
import { HealthAnalyticsEngine, HealthAnalysis } from '../services/HealthAnalyticsEngine';
import { HealthLogger } from '../services/HealthLogger';
import { HealixAIContextBuilder } from '../services/HealixAIContextBuilder';
import { OfflineQueue } from '../../../lib/offlineQueue';
import { ActivityEventEmitter } from '../../activity/services/ActivityEventEmitter';
import type { DigitalHealthRecord, TimelineEvent } from '../../../types/digitalHealthRecord';
import type { PlanTask } from '../../../types';

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

  // Presentation State Binds (Calculated by ViewModel)
  const [greeting, setGreeting] = useState('يسعدنا رؤيتك اليوم.');
  const [activitySyncTime, setActivitySyncTime] = useState('تمت المزامنة منذ ثوانٍ');

  const pendingTaskIds = useRef(new Set<string>());

  // 1. Fetch Complete Digital Health Record on mount/refresh
  const loadDashboardData = useCallback(async (clearCache = false) => {
    if (!userId) return;
    setLoading(true);

    try {
      const cacheKey = `dashboard_${userId}`;
      if (clearCache) {
        await AppCache.invalidate(cacheKey);
      }

      // Check cache first
      const cached = await AppCache.get<any>(cacheKey);
      if (cached && !clearCache) {
        setDhr(cached.dhr);
        setTasks(cached.tasks);
        setWaterGlasses(cached.waterGlasses);
        setActivitySteps(cached.activitySteps);
        setLocalTimelineEvents([]);
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
        setLocalTimelineEvents([]);

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

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Pedometer Watcher logic inside hook — uses ActivityEventEmitter instead of
  // a direct sensor subscription so it respects the ActivitySyncManager batching logic.
  useEffect(() => {
    if (!userId || !dhr || dhr.profile.role !== 'client') return;

    const unsub = ActivityEventEmitter.subscribe('ActivityUpdated', (payload: { steps: number }) => {
      const steps = payload.steps;
      if (steps > activitySteps) {
        setActivitySteps(steps);
        setActivitySyncTime('تمت المزامنة للتو');

        // Prepend achievement event if steps hit goal milestones
        const goal = dhr.goals.activity.daily_steps || 10000;
        if (steps >= goal && activitySteps < goal) {
          const newEvent: TimelineEvent = {
            id: `steps_goal_${Date.now()}`,
            title: 'إنجاز الحركة اليومية 🏃',
            subtitle: `أحسنت! حققت هدف المشي اليوم بالكامل بتجاوزك ${goal.toLocaleString()} خطوة.`,
            time: 'الآن',
            icon: 'trophy',
            color: '#10B981',
            type: 'AchievementEvent'
          };
          setLocalTimelineEvents(prev => [newEvent, ...prev]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    });

    return () => {
      unsub();
    };
  }, [userId, dhr, activitySteps]);

  // 2. Dynamic Client-Side Presentation Recalculations (Instant updates on action)
  useEffect(() => {
    if (!dhr) return;

    // Construct local snapshot DHR containing modified values
    const todayMeals = tasks.filter(t => t.task_type !== 'workout');
    const todayWorkouts = tasks.filter(t => t.task_type === 'workout');

    const localDhr: DigitalHealthRecord = {
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

    // Calculate dynamic analysis values
    // streak_days is not stored on Profile — always recalculate from 0; the engine
    // uses compliance data from the DHR itself to gauge weekly performance.
    const streak = 0;
    const report = HealthAnalyticsEngine.analyze(localDhr, streak);
    setAnalysis(report);

    // Dynamic greeting builder
    const hour = new Date().getHours();
    let greet = 'مرحباً بك';
    if (hour >= 5 && hour < 12) greet = 'صباح الخير';
    else if (hour >= 12 && hour < 17) greet = 'طاب يومك';
    else if (hour >= 17 && hour < 22) greet = 'مساء الخير';
    else greet = 'طاب مساؤك';

    const clientName = dhr.profile.full_name?.split(' ')[0] || '';
    if (report.compliance === 100) {
      setGreeting(`${greet}، ${clientName}! يوم مثالي كامل الالتزام اليوم! 🏆`);
    } else if (report.compliance >= 60) {
      setGreeting(`${greet}، ${clientName}! خطوت خطوات ممتازة اليوم. 🌟`);
    } else if (report.compliance > 0) {
      setGreeting(`${greet}، ${clientName}! واصل تقديم نشاطات صحية اليوم. 🔥`);
    } else {
      setGreeting(`${greet}، ${clientName}! ابدأ يومك بنشاط صحي الآن. ☀️`);
    }
  }, [tasks, waterGlasses, activitySteps, dhr]);

  // 3. User Hydration Actions
  const handleLogWater = useCallback(async (amount: number) => {
    if (!userId || !dhr) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Optimistic UI updates
    const newGlasses = waterGlasses + amount;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setWaterGlasses(newGlasses);

    // Prepend timeline event locally
    const newEvent: TimelineEvent = {
      id: `water_${Date.now()}`,
      title: 'تسجيل كوب مياه 💧',
      subtitle: `أضفت ${(amount * 250)} مل إلى كمية المياه المكتملة لليوم.`,
      time: 'الآن',
      icon: 'water',
      color: '#3B82F6',
      type: 'WaterEvent'
    };
    setLocalTimelineEvents(prev => [newEvent, ...prev]);

    // Async write through unified logger
    await HealthLogger.log(userId, 'water', amount, { target: dhr.water.targetGlasses });
  }, [userId, dhr, waterGlasses]);

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

    // Prepend timeline item locally
    const matched = tasks.find(t => t.id === taskId);
    if (matched) {
      const isWorkout = matched.task_type === 'workout';
      const eventTitle = isWorkout ? 'أنجزت تدريباً رياضياً 🏋️' : 'تناولت وجبة صحية 🥗';
      const eventSub = newStatus 
        ? `تم إكمال: ${matched.content}` 
        : `تراجعت عن إكمال: ${matched.content}`;
      
      const newEvent: TimelineEvent = {
        id: `task_${taskId}_${Date.now()}`,
        title: eventTitle,
        subtitle: eventSub,
        time: 'الآن',
        icon: isWorkout ? 'barbell' : 'restaurant',
        color: isWorkout ? '#8B5CF6' : '#10B981',
        type: isWorkout ? 'WorkoutEvent' : 'MealEvent'
      };
      setLocalTimelineEvents(prev => [newEvent, ...prev]);
    }

    try {
      await OfflineQueue.addMutation('task_toggle', userId, {
        taskId,
        isCompleted: newStatus,
        logDate: todayStr
      });
    } catch (e) {
      logger.error('[useHealthCommandCenterViewModel] task toggle mutation failed:', e);
      // Revert UI on failure
      setTasks(tasks);
    } finally {
      pendingTaskIds.current.delete(taskId);
    }
  }, [userId, tasks, todayStr]);

  // 5. Refetch AI coach recommendations with dynamic prompt
  const handleFetchAIRecommendation = useCallback(async (force = false) => {
    if (!userId || !dhr || !analysis) return;
    
    const cacheKey = `ai_tip_${userId}_${todayStr}`;
    if (!force) {
      const cached = await AppCache.get<string>(cacheKey);
      if (cached) {
        setAiRecommendation(cached);
        return;
      }
    }

    try {
      const contextPrompt = HealixAIContextBuilder.buildContext(dhr, analysis);
      const { data, error } = await supabase.functions.invoke('healix-ai', {
        body: {
          messages: [
            {
              role: 'user',
              content: `أعطني نصيحة وتوجيه مخصص ومحفز جداً لليوم بناءً على سياق التقرير الصحي المرفق أدناه بحد أقصى سطرين باللغة العربية الفصحى بدون استخدام إيموجي.\n\nالسياق الحالي:\n${contextPrompt}`
            }
          ]
        }
      });

      if (error) throw error;
      const tip = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text;
      if (tip) {
        const cleaned = tip.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim();
        setAiRecommendation(cleaned);
        await AppCache.set(cacheKey, cleaned);

        // Prepend timeline AI event
        const newEvent: TimelineEvent = {
          id: `ai_tip_${Date.now()}`,
          title: 'توصية ذكية من هيليكس 🤖',
          subtitle: cleaned,
          time: 'الآن',
          icon: 'sparkles',
          color: '#FD761C',
          type: 'AIEvent'
        };
        setLocalTimelineEvents(prev => [newEvent, ...prev]);
      }
    } catch (e) {
      logger.error('[useHealthCommandCenterViewModel] AI tip generation error:', e);
    }
  }, [userId, dhr, analysis, todayStr]);

  // Auto trigger AI recommendation when analysis finishes compiling
  useEffect(() => {
    if (analysis && !aiRecommendation) {
      handleFetchAIRecommendation();
    }
  }, [analysis, aiRecommendation, handleFetchAIRecommendation]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData(true);
    if (userId) {
      const cacheKey = `ai_tip_${userId}_${todayStr}`;
      await AppCache.invalidate(cacheKey);
      setAiRecommendation(null);
    }
    setRefreshing(false);
  }, [loadDashboardData, userId, todayStr]);

  // Merged Timeline events getter (dynamic prepends + DB timeline logs)
  const compiledTimeline = [...localTimelineEvents, ...(dhr?.timeline || [])];

  return {
    loading,
    refreshing,
    dhr,
    analysis,
    tasks,
    waterGlasses,
    activitySteps,
    aiRecommendation,
    timeline: compiledTimeline,
    greeting,
    activitySyncTime,
    actions: {
      onLogWater: handleLogWater,
      onUndoWater: handleUndoWater,
      onToggleTask: handleToggleTask,
      onRefresh: handleRefresh,
      onTriggerAI: () => handleFetchAIRecommendation(true)
    }
  };
}
