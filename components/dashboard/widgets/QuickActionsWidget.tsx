import { Text } from '@/components/AppText';
import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AppColors } from '../../../constants/AppTheme';
import { GridIcon, SparklesIcon, UploadIcon, MessageIcon, WorkoutIcon, LockIcon } from '../../../components/icons';
import { useEntitlements } from '../../../src/features/subscriptions/useEntitlements';

interface QuickActionsWidgetProps {
  onContactDoctorPress?: () => void;
  onAICoachPress: () => void;
  onUploadLabsPress?: () => void;
  onWorkoutsPress?: () => void;
  onMorePress: () => void;
  onProgressPress?: () => void;
}

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = React.memo(({
  onContactDoctorPress,
  onAICoachPress,
  onUploadLabsPress,
  onWorkoutsPress,
  onMorePress,
  onProgressPress,
}) => {
  const router = useRouter();
  const { canUse, userRole } = useEntitlements();

  const isPremium = userRole === 'admin' || userRole === 'doctor' || canUse('NUTRITION_PLAN');

  // Lock status per feature
  const isDoctorLocked = !isPremium && !canUse('DOCTOR_CHAT');
  const isAILocked = !isPremium && !canUse('AI_CHAT');
  const isWorkoutLocked = !isPremium && !canUse('WORKOUT_PLAN');

  const handleDoctor = () => {
    if (isDoctorLocked) {
      router.push('/subscriptions?returnUrl=/(tabs)&featureId=DOCTOR_CHAT' as any);
    } else {
      (onContactDoctorPress || (() => router.push('/chat' as any)))();
    }
  };

  const handleAI = () => {
    if (isAILocked) {
      router.push('/subscriptions?returnUrl=/(tabs)&featureId=AI_CHAT' as any);
    } else {
      onAICoachPress();
    }
  };

  const handleUpload = onUploadLabsPress || onProgressPress || (() => router.push('/(tabs)/medical' as any));

  const handleWorkout = () => {
    if (isWorkoutLocked) {
      router.push('/subscriptions?returnUrl=/(tabs)&featureId=WORKOUT_PLAN' as any);
    } else {
      (onWorkoutsPress || (() => router.push('/(tabs)/workouts' as any)))();
    }
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>إجراءات سريعة</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickGridContainer}
      >
        {/* Action 1: Doctor */}
        <TouchableOpacity style={styles.quickActionItem} onPress={handleDoctor} activeOpacity={0.85}>
          <View style={[styles.quickIconBox, isDoctorLocked && styles.quickIconBoxLocked]}>
            <MessageIcon size={24} color="#F26E11" />
            {isDoctorLocked && (
              <View style={styles.lockBadgeIcon}>
                <LockIcon size={10} color={AppColors.outline} />
              </View>
            )}
          </View>
          <Text style={[styles.quickLabel, isDoctorLocked && styles.quickLabelLocked]}>الطبيب</Text>
        </TouchableOpacity>

        {/* Action 2: Healix AI */}
        <TouchableOpacity style={styles.quickActionItem} onPress={handleAI} activeOpacity={0.85}>
          <View style={[styles.quickIconBox, isAILocked && styles.quickIconBoxLocked]}>
            <SparklesIcon size={24} color="#F26E11" />
            {isAILocked && (
              <View style={styles.lockBadgeIcon}>
                <LockIcon size={10} color={AppColors.outline} />
              </View>
            )}
          </View>
          <Text style={[styles.quickLabel, isAILocked && styles.quickLabelLocked]}>هيليكس AI</Text>
        </TouchableOpacity>

        {/* Action 3: Upload Documents */}
        <TouchableOpacity style={styles.quickActionItem} onPress={handleUpload} activeOpacity={0.85}>
          <View style={styles.quickIconBox}>
            <UploadIcon size={24} color="#F26E11" />
          </View>
          <Text style={styles.quickLabel}>رفع</Text>
        </TouchableOpacity>

        {/* Action 4: Workouts */}
        <TouchableOpacity style={styles.quickActionItem} onPress={handleWorkout} activeOpacity={0.85}>
          <View style={[styles.quickIconBox, isWorkoutLocked && styles.quickIconBoxLocked]}>
            <WorkoutIcon size={24} color="#F26E11" />
            {isWorkoutLocked && (
              <View style={styles.lockBadgeIcon}>
                <LockIcon size={10} color={AppColors.outline} />
              </View>
            )}
          </View>
          <Text style={[styles.quickLabel, isWorkoutLocked && styles.quickLabelLocked]}>تماريني</Text>
        </TouchableOpacity>

        {/* Action 5: More */}
        <TouchableOpacity style={styles.quickActionItem} onPress={onMorePress} activeOpacity={0.85}>
          <View style={styles.quickIconBox}>
            <GridIcon size={24} color="#F26E11" />
          </View>
          <Text style={styles.quickLabel}>المزيد</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
});

QuickActionsWidget.displayName = 'QuickActionsWidget';

const styles = StyleSheet.create({
  sectionContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  titleRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  quickGridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 4,
    minWidth: '100%',
  },
  quickActionItem: {
    alignItems: 'center',
    gap: 6,
    minWidth: 64,
  },
  quickIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(242, 110, 17, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    position: 'relative',
  },
  quickIconBoxLocked: {
    opacity: 0.7,
  },
  lockBadgeIcon: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppColors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    textAlign: 'center',
  },
  quickLabelLocked: {
    color: AppColors.outline,
  },
});
