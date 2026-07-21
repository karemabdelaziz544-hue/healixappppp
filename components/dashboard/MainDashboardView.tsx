import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { 
  ScrollView, 
  LayoutAnimation, 
  Platform, 
  RefreshControl, 
  StyleSheet, 
  UIManager, 
  View 
} from 'react-native';
import { Text } from '@/components/AppText';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { AppColors } from '../../constants/AppTheme';
import { useFamily } from '../../src/context/FamilyContext';
import Skeleton from '../Skeleton';
import { AnimatedButton } from '../animations/AnimatedButton';
import NotificationBell from '../NotificationBell';
import { PermissionBottomSheet } from './PermissionBottomSheet';
import { ActivitySyncManager } from '../../src/features/activity/services/ActivitySyncManager';
import { ActivityService } from '../../src/features/activity/services/ActivityService';
import { AppCache } from '../../src/lib/cache';
import { useHealthCommandCenterViewModel } from '../../src/features/health/hooks/useHealthCommandCenterViewModel';
import { 
  HealthScoreWidget, 
  AIInsightWidget, 
  QuickActionsWidget, 
  ProgressGridWidget, 
  WaterWidget, 
  MealsWidget, 
  WorkoutWidget, 
  DoctorWidget, 
  TimelineWidget,
  MoreBottomSheetModal
} from './HomeWidgets';

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function MainDashboardView() {
  const router = useRouter();
  const { currentProfile, familyMembers, switchProfile } = useFamily();
  const userId = currentProfile?.id;
  const insets = useSafeAreaInsets();

  const todayStr = getLocalDateString();
  const vm = useHealthCommandCenterViewModel({ userId: userId || '', todayStr });

  const [isMoreModalVisible, setIsMoreModalVisible] = useState(false);
  const [isPermissionSheetVisible, setIsPermissionSheetVisible] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const [mealsListY, setMealsListY] = useState(0);

  // Synchronize on focus
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        vm.actions.onRefresh();
      }
    }, [userId])
  );

  // Pedometer Permission Dialog logic on mount
  useEffect(() => {
    if (!userId || currentProfile?.role !== 'client') return;

    const checkMotionPermissions = async () => {
      const isSensorAvail = await ActivityService.isAvailable();
      if (isSensorAvail) {
        const check = await ActivityService.getPermissions();
        if (check.status === 'undetermined') {
          const dismissedTime = await AppCache.get<number>(`dismissed_motion_permission_${userId}`);
          const oneWeek = 7 * 24 * 60 * 60 * 1000;
          if (!dismissedTime || (Date.now() - dismissedTime) > oneWeek) {
            setIsPermissionSheetVisible(true);
          }
        }
      }
    };
    checkMotionPermissions();
  }, [userId, currentProfile]);

  const handlePermissionConfirm = useCallback(async () => {
    setIsPermissionSheetVisible(false);
    const request = await ActivityService.requestPermissions();
    if (request.granted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await ActivitySyncManager.start(userId!, todayStr);
      vm.actions.onRefresh();
    }
  }, [userId, todayStr]);

  const handlePermissionCancel = useCallback(async () => {
    setIsPermissionSheetVisible(false);
    if (userId) {
      await AppCache.set(`dismissed_motion_permission_${userId}`, Date.now());
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [userId]);

  const handleScrollToMeals = useCallback(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: mealsListY, animated: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [mealsListY]);

  const handleCardPress = useCallback((key: string) => {
    if (key === 'meals') {
      handleScrollToMeals();
    } else if (key === 'workouts') {
      router.push('/(tabs)/workouts' as any);
    }
  }, [handleScrollToMeals, router]);

  if (vm.loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.skeletonContainer}>
          <Skeleton width="100%" height={160} borderRadius={24} style={{ marginBottom: 20 }} />
          <Skeleton width="100%" height={100} borderRadius={20} style={{ marginBottom: 15 }} />
          <Skeleton width="100%" height={120} borderRadius={20} style={{ marginBottom: 15 }} />
          <Skeleton width="100%" height={180} borderRadius={24} />
        </View>
      </SafeAreaView>
    );
  }

  // Split meals and workouts checklists
  const mealsList = vm.tasks.filter(t => t.task_type !== 'workout');
  const workoutsList = vm.tasks.filter(t => t.task_type === 'workout');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {currentProfile?.manager_id && (
        <View style={styles.subAccountBanner}>
          <Ionicons name="swap-horizontal" size={14} color="#FFF" />
          <Text style={styles.subAccountBannerText}>
            أنت تستعرض حالياً حساب العائلة التابع: {currentProfile.full_name}
          </Text>
        </View>
      )}

      {/* Greeting Header */}
      <View style={styles.header}>
        <AnimatedButton style={styles.iconCircle}>
          <NotificationBell />
        </AnimatedButton>
        <View style={styles.headerTextWrap}>
          <Text style={styles.greetingTitle}>{vm.greeting}</Text>
          <Text style={styles.greetingSub}>مرحباً بك في مركز قيادتك الصحي</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl 
            refreshing={vm.refreshing} 
            onRefresh={vm.actions.onRefresh} 
            colors={[AppColors.primary]} 
          />
        }
      >
        {/* 1. Health Score Widget */}
        <HealthScoreWidget
          score={vm.analysis?.score || 75}
          compliance={vm.analysis?.compliance || 0}
          contributors={vm.analysis?.contributors || { nutrition: 0, water: 0, activity: 0, sleep: 0 }}
          warnings={vm.analysis?.warnings || []}
          achievements={vm.analysis?.achievements || []}
          onPressDetails={() => router.push('/(tabs)/medical' as any)}
        />

        {/* 2. AI Coach Insights */}
        <AIInsightWidget
          recommendation={vm.aiRecommendation || undefined}
          onChatPress={() => router.push('/healix-ai' as any)}
        />

        {/* 3. Quick Actions */}
        <QuickActionsWidget
          onLogWaterPress={() => vm.actions.onLogWater(1.0)}
          onAICoachPress={() => router.push('/healix-ai' as any)}
          onDietPlanPress={handleScrollToMeals}
          onProgressPress={() => router.push('/(tabs)/medical' as any)}
          onMorePress={() => setIsMoreModalVisible(true)}
        />

        {/* 4. Progress Indicators */}
        <ProgressGridWidget
          mealsCount={vm.dhr?.meals.completedCount || 0}
          totalMeals={vm.dhr?.meals.totalCount || 0}
          workoutsCount={vm.dhr?.workouts?.completedCount || 0}
          totalWorkouts={vm.dhr?.workouts?.totalCount || 0}
          activitySteps={vm.activitySteps}
          activityGoalSteps={vm.dhr?.goals.activity.daily_steps || 10000}
          syncTime={vm.activitySyncTime}
          sourceName={ActivityService.getActiveProviderName()}
          onCardPress={handleCardPress}
        />

        {/* 5. Hydration Water Tracker */}
        <WaterWidget
          consumedGlasses={vm.waterGlasses}
          targetGlasses={vm.dhr?.water.targetGlasses || 8}
          onAddWater={vm.actions.onLogWater}
          onUndoWater={vm.actions.onUndoWater}
        />

        {/* 6. Daily Meals checklist */}
        <View 
          onLayout={(e) => {
            const layout = e.nativeEvent.layout;
            setMealsListY(layout.y);
          }}
        >
          <MealsWidget
            tasks={mealsList}
            onToggleTask={vm.actions.onToggleTask}
          />
        </View>

        {/* 7. Daily Workouts checklist */}
        <WorkoutWidget
          tasks={workoutsList}
          onToggleTask={vm.actions.onToggleTask}
        />

        {/* 8. Doctor Details Card */}
        <DoctorWidget
          doctorName={vm.dhr?.doctorInfo?.name}
          avatarUrl={vm.dhr?.doctorInfo?.avatarUrl}
          specialty={vm.dhr?.doctorInfo?.specialty}
          isOnline={vm.dhr?.doctorInfo?.isOnline}
          lastReviewText={
            vm.dhr?.doctorNotes && vm.dhr.doctorNotes.length > 0 
              ? `آخر مراجعة: ${vm.dhr.doctorNotes[0]}` 
              : 'تمت مراجعة خطتك التدريبية والغذائية بالأمس'
          }
          onChatPress={() => router.push('/(tabs)/chat' as any)}
          onBookPress={() => router.push('/events' as any)}
        />

        {/* 9. Timeline Activity Feed */}
        <TimelineWidget
          activities={vm.timeline}
          onViewJourney={() => router.push('/(tabs)/medical' as any)}
        />
      </ScrollView>

      {/* Services Bottom Sheet Modal */}
      <MoreBottomSheetModal
        visible={isMoreModalVisible}
        onClose={() => setIsMoreModalVisible(false)}
        onNavigate={(route) => router.push(route as any)}
      />

      {/* Sensor Permission sheet */}
      <PermissionBottomSheet
        visible={isPermissionSheetVisible}
        onConfirm={handlePermissionConfirm}
        onCancel={handlePermissionCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  subAccountBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A34',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  subAccountBannerText: {
    fontSize: 12,
    color: '#FFF',
    marginRight: 6,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  headerTextWrap: {
    alignItems: 'flex-end',
  },
  greetingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  greetingSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  }
});
