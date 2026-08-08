import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { 
  ScrollView, 
  Platform, 
  RefreshControl, 
  StyleSheet, 
  UIManager, 
  View 
} from 'react-native';
import { Text } from '@/components/AppText';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors } from '../../constants/AppTheme';
import { useFamily } from '../../src/context/FamilyContext';
import Skeleton from '../Skeleton';
import { PermissionBottomSheet } from './PermissionBottomSheet';
import { ActivitySyncManager } from '../../src/features/activity/services/ActivitySyncManager';
import { ActivityService } from '../../src/features/activity/services/ActivityService';
import { AppCache } from '../../src/lib/cache';
import { useHealthCommandCenterViewModel } from '../../src/features/health/hooks/useHealthCommandCenterViewModel';
import { SwapIcon } from '../../components/icons';
import { 
  DashboardHeaderWidget,
  ProgressHeroWidget,
  CurrentMealWidget as ActionableCurrentMealWidget,
  HealixAICardWidget as ContextualAICoachWidget,
  QuickActionsWidget,
  IndicatorsWidget as TodayIndicatorsWidget,
  WaterWidget as WaterTrackerWidget,
  WorkoutWidget as WorkoutSectionWidget,
  MovementWidget as DailyActivityWidget,
  TimelineWidget as LiveTimelineWidget,
  MoreBottomSheetModal
} from './widgets';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function MainDashboardView() {
  const router = useRouter();
  const { currentProfile, familyMembers, switchProfile, accountProfileId } = useFamily();
  const userId = currentProfile?.id;
  const insets = useSafeAreaInsets();

  const todayStr = getLocalDateString();
  const vm = useHealthCommandCenterViewModel({ userId: userId || '', todayStr });

  const [isMoreModalVisible, setIsMoreModalVisible] = useState(false);
  const [isPermissionSheetVisible, setIsPermissionSheetVisible] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const [mealsSectionY, setMealsSectionY] = useState(0);

  // Synchronize on focus
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        ActivitySyncManager.start(userId, todayStr);
        vm.actions.onRefresh();
      }
    }, [userId, todayStr])
  );

  // Pedometer Permission Dialog logic on mount
  useEffect(() => {
    if (!userId || currentProfile?.role !== 'client') return;

    const checkMotionPermissions = async () => {
      const isSensorAvail = await ActivityService.isAvailable();
      if (isSensorAvail) {
        const check = await ActivityService.getPermissions();
        if (check.granted) {
          await ActivitySyncManager.start(userId, todayStr);
        } else {
          // Auto request permissions so iOS pops up native Motion & Fitness prompt
          const request = await ActivityService.requestPermissions();
          if (request.granted) {
            await ActivitySyncManager.start(userId, todayStr);
          } else {
            setIsPermissionSheetVisible(true);
          }
        }
      }
    };
    checkMotionPermissions();
  }, [userId, currentProfile, todayStr]);

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
      scrollViewRef.current.scrollTo({ y: mealsSectionY, animated: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [mealsSectionY]);

  if (vm.loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.skeletonContainer}>
          <Skeleton width="100%" height={60} borderRadius={20} style={{ marginBottom: 15 }} />
          <Skeleton width="100%" height={160} borderRadius={28} style={{ marginBottom: 20 }} />
          <Skeleton width="100%" height={220} borderRadius={28} style={{ marginBottom: 15 }} />
          <Skeleton width="100%" height={120} borderRadius={28} style={{ marginBottom: 15 }} />
          <Skeleton width="100%" height={180} borderRadius={28} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {currentProfile?.manager_id && (
        <View style={styles.subAccountBanner}>
          <SwapIcon size={14} color={AppColors.white} />
          <Text style={styles.subAccountBannerText}>
            أنت تستعرض حالياً حساب العائلة التابع: {currentProfile.full_name}
          </Text>
        </View>
      )}

      {/* 1. Header (Profile, Avatar, Notifications, Daily Streak) */}
      <DashboardHeaderWidget
        fullName={currentProfile?.full_name}
        greeting={vm.greeting}
        avatarUrl={currentProfile?.avatar_url}
        streakDays={vm.streakDays}
        onNotificationPress={() => router.push('/notifications' as any)}
        onProfilePress={() => router.push('/(tabs)/profile' as any)}
        familyMembers={familyMembers}
        currentProfile={currentProfile}
        accountProfileId={accountProfileId}
        onSwitchProfile={switchProfile}
      />

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
        {/* 2. Today's Progress Hero */}
        <ProgressHeroWidget
          score={vm.analysis?.score}
          compliance={vm.analysis?.compliance}
          summaryText={vm.heroSummary}
          onContinueDayPress={handleScrollToMeals}
          steps={vm.activitySteps}
          calories={vm.dhr?.activity?.calories ?? Math.round(vm.activitySteps * 0.04)}
          waterGlasses={vm.waterGlasses}
          activeMinutes={vm.dhr?.activity?.active_minutes ?? Math.round(vm.activitySteps / 100)}
          weightKg={currentProfile?.weight ?? vm.dhr?.inbody?.weight ?? vm.dhr?.profile?.weight ?? 70.0}
        />

        {/* 3. Quick Actions Grid (Immediately After Hero) */}
        <QuickActionsWidget
          onContactDoctorPress={() => router.push('/chat' as any)}
          onAICoachPress={() => router.push('/healix-ai' as any)}
          onUploadLabsPress={() => router.push('/(tabs)/medical' as any)}
          onWorkoutsPress={() => router.push('/(tabs)/workouts' as any)}
          onMorePress={() => setIsMoreModalVisible(true)}
        />

        {/* 4. Current Meal (Highest Priority) */}
        <View 
          onLayout={(e) => {
            const layout = e.nativeEvent.layout;
            setMealsSectionY(layout.y);
          }}
        >
          <ActionableCurrentMealWidget
            tasks={vm.tasks}
            expandedMealId={vm.expandedMealId}
            onSelectMeal={vm.actions.setExpandedMealId}
            onToggleTask={vm.actions.onToggleTask}
          />
        </View>

        {/* 5. Healix AI Coach Tip */}
        <ContextualAICoachWidget
          recommendation={vm.aiRecommendation || undefined}
          onChatPress={() => router.push('/healix-ai' as any)}
        />

        {/* 6. Today's Key Indicators */}
        <TodayIndicatorsWidget
          compliance={vm.analysis?.compliance}
          waterLiters={vm.waterGlasses * 0.25}
          targetWaterLiters={vm.dhr?.water.targetLiters}
          steps={vm.activitySteps}
        />

        {/* 7. Hydration Water Card */}
        <WaterTrackerWidget
          consumedGlasses={vm.waterGlasses}
          targetGlasses={vm.dhr?.water.targetGlasses || 10}
          onAddWater={vm.actions.onLogWater}
          onUndoWater={vm.actions.onUndoWater}
        />

        {/* 8. Workout Section */}
        <WorkoutSectionWidget
          tasks={vm.tasks}
          onToggleTask={vm.actions.onToggleTask}
        />

        {/* 9. Daily Activity & Movement */}
        <DailyActivityWidget
          steps={vm.activitySteps}
          goalSteps={vm.dhr?.goals.activity.daily_steps || 10000}
          calories={Math.round(vm.activitySteps * 0.04)}
          distanceKm={Number(((vm.activitySteps * 0.76) / 1000).toFixed(1))}
          activeMinutes={Math.round(vm.activitySteps / 100)}
          syncTime={vm.activitySyncTime}
          sourceName={ActivityService.getActiveProviderName()}
        />

        {/* 10. Live Activity Timeline Log */}
        <LiveTimelineWidget
          timeline={vm.timeline}
        />
      </ScrollView>

      {/* Permission Bottom Sheet for Activity sensors */}
      <PermissionBottomSheet
        visible={isPermissionSheetVisible}
        onConfirm={handlePermissionConfirm}
        onCancel={handlePermissionCancel}
      />

      {/* More Tools Modal */}
      <MoreBottomSheetModal
        visible={isMoreModalVisible}
        onClose={() => setIsMoreModalVisible(false)}
        onLogWaterPress={() => vm.actions.onLogWater(1.0)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  skeletonContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  subAccountBanner: {
    backgroundColor: AppColors.primary,
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  subAccountBannerText: {
    color: AppColors.white,
    fontSize: 12,
    fontFamily: 'Thmanyah-Medium',
  },
  scrollContent: {
    paddingTop: 6,
  },
});
