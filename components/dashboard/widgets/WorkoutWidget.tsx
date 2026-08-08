import { Text } from '@/components/AppText';
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AppColors } from '../../../constants/AppTheme';
import type { PlanTask } from '../../../src/types';
import {
  DumbbellIcon,
  CheckmarkIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InfoIcon
} from '../../../components/icons';
import { useEntitlements } from '../../../src/features/subscriptions/useEntitlements';

interface WorkoutWidgetProps {
  tasks?: PlanTask[];
  onToggleTask?: (taskId: string, currentStatus: boolean) => void;
}

export const WorkoutWidget: React.FC<WorkoutWidgetProps> = React.memo(({
  tasks = [],
  onToggleTask
}) => {
  const router = useRouter();
  const { canUse, userRole } = useEntitlements();
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(true);

  const isPremium = userRole === 'admin' || userRole === 'doctor' || canUse('WORKOUT_PLAN');

  // 🔒 Locked Workout Card for Free Tier matching CurrentMealWidget 100%
  if (!isPremium) {
    return (
      <View style={styles.workoutContainer}>
        <LinearGradient
          colors={['#2A4D44', '#3A6D61']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.lockedCardGradient}
        >
          {/* Lock Badge */}
          <View style={styles.lockBadgeHeader}>
            <SparklesIcon size={12} color="#FFFFFF" />
            <Text style={styles.lockBadgeTextHeader}>Premium</Text>
          </View>

          <View style={styles.lockedCardContent}>
            <View style={styles.lockedIconBox}>
              <DumbbellIcon size={22} color="#FFFFFF" />
            </View>
            <View style={styles.lockedTextWrap}>
              <Text style={styles.lockedTitle}>برنامج تمارينك المخصص جاهز</Text>
              <Text style={styles.lockedSubtitle}>
                اشترك الآن لعرض خطة التمارين الرياضية اليومية التي أعدها لك مدربك وخبير التمارين.
              </Text>
              <TouchableOpacity
                style={styles.upgradeBtnOrange}
                onPress={() => router.push('/subscriptions?returnUrl=/(tabs)&featureId=WORKOUT_PLAN' as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.upgradeBtnOrangeText}>اشترك الآن</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const workouts = tasks.filter(t => t.task_type === 'workout');

  if (workouts.length === 0) {
    return (
      <View style={styles.workoutContainer}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.titleGroup}>
            <View style={styles.iconBox}>
              <DumbbellIcon size={22} color="#F26E11" />
            </View>
            <View style={styles.titleTextWrap}>
              <Text style={styles.sectionTitle}>تمارين اليوم</Text>
              <Text style={styles.sectionSubtitle}>خطة التمارين اليومية المخصصة لك</Text>
            </View>
          </View>
        </View>
        <View style={styles.emptyStateCard}>
          <InfoIcon size={24} color="#9CA3AF" />
          <Text style={{ fontSize: 14, fontFamily: 'Thmanyah-Medium', color: '#6B7280', marginTop: 8, textAlign: 'center' }}>
            لا توجد تمارين مخصصة لليوم. اطلب من طبيبك أو مدربك إضافة خطة تمارين.
          </Text>
        </View>
      </View>
    );
  }

  const activeIndex = selectedWorkoutId
    ? workouts.findIndex(w => w.id === selectedWorkoutId)
    : 0;

  const currentWorkout = workouts[activeIndex >= 0 ? activeIndex : 0];
  const completedCount = workouts.filter(w => w.is_completed).length;

  return (
    <View style={styles.workoutContainer}>
      {/* Header */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconBox}>
            <DumbbellIcon size={22} color="#F26E11" />
          </View>
          <View style={styles.titleTextWrap}>
            <Text style={styles.sectionTitle}>تمارين اليوم</Text>
            <Text style={styles.sectionSubtitle}>خطة التمارين اليومية المخصصة لك</Text>
          </View>
        </View>
        <View style={styles.progressPill}>
          <Text style={styles.progressPillText}>
            إنجاز {completedCount} من {workouts.length}
          </Text>
        </View>
      </View>

      {/* Horizontal Workout Chips matching CurrentMealWidget */}
      <View style={styles.tabsRow}>
        {workouts.map((workout, index) => {
          const isSelected = workout.id === currentWorkout?.id;
          const chipLabel = `تمرين ${index + 1}`;

          return (
            <TouchableOpacity
              key={workout.id}
              style={[
                styles.tabChip,
                isSelected && styles.tabChipActive,
                workout.is_completed && styles.tabChipDone,
              ]}
              onPress={() => setSelectedWorkoutId(workout.id)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabChipText,
                  isSelected && styles.tabChipTextActive,
                  workout.is_completed && styles.tabChipTextDone,
                ]}
              >
                {chipLabel}
              </Text>
              {workout.is_completed && <CheckmarkIcon size={12} color={AppColors.success} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active Workout Card matching CurrentMealWidget */}
      {currentWorkout && (
        <View style={styles.activeWorkoutCard}>
          <TouchableOpacity
            style={styles.workoutMainRow}
            onPress={() => onToggleTask && onToggleTask(currentWorkout.id, currentWorkout.is_completed)}
            activeOpacity={0.85}
          >
            <View style={styles.workoutTitleWrap}>
              <View
                style={[
                  styles.checkCircle,
                  currentWorkout.is_completed && styles.checkCircleDone,
                ]}
              >
                {currentWorkout.is_completed && (
                  <CheckmarkIcon size={14} color={AppColors.white} />
                )}
              </View>

              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <Text
                  style={[
                    styles.workoutTitleText,
                    currentWorkout.is_completed && styles.workoutTitleDoneText,
                  ]}
                >
                  {currentWorkout.title}
                </Text>
                {currentWorkout.scheduled_time && (
                  <Text style={styles.workoutTimeText}>
                    المدة الموصى بها: {currentWorkout.scheduled_time}
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.expandIconBtn}
              onPress={() => setShowDetails(!showDetails)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {showDetails ? (
                <ChevronUpIcon size={20} color={AppColors.primary} />
              ) : (
                <ChevronDownIcon size={20} color={AppColors.primary} />
              )}
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Details Collapsible */}
          {showDetails && (
            <View style={styles.workoutDetailsSection}>
              {currentWorkout.content && (
                <View style={styles.detailRow}>
                  <InfoIcon size={16} color="#F26E11" />
                  <Text style={styles.detailText}>
                    <Text style={{ fontFamily: 'Thmanyah-Bold' }}>تفاصيل التمرين: </Text>
                    {currentWorkout.content}
                  </Text>
                </View>
              )}

              {(currentWorkout.metadata as any)?.notes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>
                    توجيهات المدرب: {(currentWorkout.metadata as any).notes}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
});

WorkoutWidget.displayName = 'WorkoutWidget';

const styles = StyleSheet.create({
  workoutContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  lockedCardGradient: {
    borderRadius: 24,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  lockBadgeHeader: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
  },
  lockBadgeTextHeader: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Bold',
    color: '#FFFFFF',
  },
  lockedCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginTop: 20,
  },
  lockedIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTextWrap: {
    flex: 1,
  },
  lockedTitle: {
    fontSize: 18,
    fontFamily: 'Thmanyah-Bold',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  lockedSubtitle: {
    fontSize: 13,
    fontFamily: 'Thmanyah-Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 19,
    marginBottom: 16,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  upgradeBtnOrange: {
    backgroundColor: '#F26E11',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  upgradeBtnOrangeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Thmanyah-Bold',
    writingDirection: 'rtl',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(242, 110, 17, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(242, 110, 17, 0.2)',
  },
  titleTextWrap: {
    alignItems: 'flex-start',
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    marginTop: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  progressPill: {
    backgroundColor: AppColors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressPillText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.outline,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppColors.surfaceContainerLow,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  tabChipActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  tabChipDone: {
    borderColor: '#A7F3D0',
  },
  tabChipText: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.outline,
    writingDirection: 'rtl',
  },
  tabChipTextActive: {
    color: AppColors.white,
  },
  tabChipTextDone: {
    color: AppColors.primary,
  },
  activeWorkoutCard: {
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  workoutMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workoutTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: AppColors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkCircleDone: {
    backgroundColor: AppColors.success,
    borderColor: AppColors.success,
  },
  workoutTitleText: {
    fontSize: 15,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  workoutTitleDoneText: {
    textDecorationLine: 'line-through',
    color: AppColors.outline,
  },
  workoutTimeText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  expandIconBtn: {
    padding: 4,
  },
  workoutDetailsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderSubtle,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.primary,
    lineHeight: 18,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  notesBox: {
    backgroundColor: 'rgba(242, 110, 17, 0.08)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(242, 110, 17, 0.15)',
  },
  notesText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: '#D95B03',
    lineHeight: 16,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  emptyStateCard: {
    backgroundColor: AppColors.white,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(62, 92, 82, 0.08)',
  },
});
