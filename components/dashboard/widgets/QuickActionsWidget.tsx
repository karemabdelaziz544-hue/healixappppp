import { Text } from '@/components/AppText';
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { AppColors } from '../../../constants/AppTheme';
import { GridIcon, SparklesIcon, UploadIcon, MessageIcon, WorkoutIcon } from '../../../components/icons';

interface QuickActionsWidgetProps {
  onContactDoctorPress?: () => void;
  onAICoachPress: () => void;
  onUploadLabsPress?: () => void;
  onWorkoutsPress?: () => void;
  onMorePress: () => void;

  // Backward compatibility aliases
  onLogWaterPress?: () => void;
  onDietPlanPress?: () => void;
  onProgressPress?: () => void;
}

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = React.memo(({
  onContactDoctorPress,
  onAICoachPress,
  onUploadLabsPress,
  onWorkoutsPress,
  onMorePress,
  onProgressPress,
  onDietPlanPress
}) => {
  const router = useRouter();

  const handleDoctor = onContactDoctorPress || (() => router.push('/chat' as any));
  const handleUpload = onUploadLabsPress || onProgressPress || (() => router.push('/(tabs)/medical' as any));
  const handleWorkout = onWorkoutsPress || (() => router.push('/(tabs)/workouts' as any));

  return (
    <View style={styles.quickGridContainer}>
      <TouchableOpacity style={styles.quickActionItem} onPress={onMorePress} activeOpacity={0.85}>
        <View style={styles.quickIconBox}>
          <GridIcon size={20} color={AppColors.primary} />
        </View>
        <Text style={styles.quickLabel}>فتح النظام</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.quickActionItem} onPress={handleDoctor} activeOpacity={0.85}>
        <View style={styles.quickIconBox}>
          <MessageIcon size={20} color={AppColors.primary} />
        </View>
        <Text style={styles.quickLabel}>تواصل مع الدكتور</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.quickActionItem} onPress={onAICoachPress} activeOpacity={0.85}>
        <View style={styles.quickIconBoxFilled}>
          <SparklesIcon size={20} color={AppColors.white} />
        </View>
        <Text style={styles.quickLabelHighlight}>Healix AI</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.quickActionItem} onPress={handleUpload} activeOpacity={0.85}>
        <View style={styles.quickIconBox}>
          <UploadIcon size={20} color={AppColors.primary} />
        </View>
        <Text style={styles.quickLabel}>رفع تحليل</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.quickActionItem} onPress={handleWorkout} activeOpacity={0.85}>
        <View style={styles.quickIconBox}>
          <WorkoutIcon size={20} color={AppColors.primary} />
        </View>
        <Text style={styles.quickLabel}>التمارين</Text>
      </TouchableOpacity>
    </View>
  );
});

QuickActionsWidget.displayName = 'QuickActionsWidget';

const styles = StyleSheet.create({
  quickGridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  quickActionItem: {
    alignItems: 'center',
    gap: 6,
  },
  quickIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  quickIconBoxFilled: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    textAlign: 'center',
  },
  quickLabelHighlight: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    textAlign: 'center',
  },
});
