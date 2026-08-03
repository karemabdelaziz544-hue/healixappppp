import { Text } from '@/components/AppText';
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppColors } from '../../../constants/AppTheme';
import type { PlanTask } from '../../../src/types';
import { WorkoutIcon, CheckmarkIcon } from '../../../components/icons';

interface WorkoutWidgetProps {
  tasks: PlanTask[];
  onToggleTask: (taskId: string, currentStatus: boolean) => void;
}

export const WorkoutWidget: React.FC<WorkoutWidgetProps> = React.memo(({
  tasks,
  onToggleTask
}) => {
  const workouts = tasks.filter(t => t.task_type === 'workout');
  const completedCount = workouts.filter(w => w.is_completed).length;

  if (workouts.length === 0) {
    return (
      <View style={styles.workoutCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>تمرين اليوم</Text>
        </View>
        <View style={styles.emptyWrap}>
          <WorkoutIcon size={28} color={AppColors.outline} />
          <Text style={styles.emptyTitle}>لا يوجد تمارين رياضية موصوفة اليوم</Text>
          <Text style={styles.emptySub}>استغل اليوم في الراحة الإيجابية أو المشي خفيف الحجم.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.workoutCard}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>تمرين اليوم</Text>
        <Text style={styles.workoutHeaderBadge}>إنجاز {completedCount} من {workouts.length}</Text>
      </View>

      <View style={styles.workoutListWrap}>
        {workouts.map((workout) => (
          <TouchableOpacity
            key={workout.id}
            style={[styles.workoutRow, workout.is_completed && styles.workoutRowDone]}
            onPress={() => onToggleTask(workout.id, workout.is_completed)}
            activeOpacity={0.85}
          >
            <View style={styles.workoutRowLeft}>
              <View style={[styles.checkCircle, workout.is_completed && styles.checkCircleDone]}>
                {workout.is_completed && <CheckmarkIcon size={12} color={AppColors.white} />}
              </View>
              <Text style={[styles.workoutTitle, workout.is_completed && styles.workoutTitleDone]}>
                {workout.content || workout.title}
              </Text>
            </View>
            {workout.scheduled_time && (
              <Text style={styles.workoutDuration}>{workout.scheduled_time}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

WorkoutWidget.displayName = 'WorkoutWidget';

const styles = StyleSheet.create({
  workoutCard: {
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 28,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  workoutHeaderBadge: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
  },
  emptyWrap: {
    backgroundColor: AppColors.surfaceContainerLow,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 13,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  emptySub: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    textAlign: 'center',
  },
  workoutListWrap: {
    gap: 8,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.surfaceContainerLow,
    padding: 12,
    borderRadius: 16,
  },
  workoutRowDone: {
    opacity: 0.6,
  },
  workoutRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: AppColors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: AppColors.success,
    borderColor: AppColors.success,
  },
  workoutTitle: {
    fontSize: 14,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.primary,
  },
  workoutTitleDone: {
    textDecorationLine: 'line-through',
  },
  workoutDuration: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
  },
});
