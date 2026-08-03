import { Text } from '@/components/AppText';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../../constants/AppTheme';
import { SyncIcon, StreakIcon } from '../../../components/icons';

import { ActivityService } from '../../../src/features/activity/services/ActivityService';

interface MovementWidgetProps {
  steps?: number;
  goalSteps?: number;
  calories?: number;
  distanceKm?: number;
  activeMinutes?: number;
  syncTime?: string;
  sourceName?: string;
}

export const MovementWidget: React.FC<MovementWidgetProps> = React.memo(({
  steps = 0,
  goalSteps = 10000,
  calories = 0,
  distanceKm = 0,
  activeMinutes = 0,
  syncTime = 'تمت المزامنة للتو',
  sourceName = 'Pedometer'
}) => {
  const percent = goalSteps > 0 ? Math.min(Math.round((steps / goalSteps) * 100), 100) : 0;
  const displayProvider = ActivityService.getDisplayName(sourceName);

  return (
    <View style={styles.activityCard}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>النشاط اليومي</Text>
        <View style={styles.syncBadge}>
          <SyncIcon size={12} color={AppColors.primary} />
          <Text style={styles.syncBadgeText}>متصل بـ {displayProvider}</Text>
        </View>
      </View>

      <View style={styles.activityTwoGrid}>
        <View style={styles.activityStatBox}>
          <Ionicons name="footsteps" size={22} color={AppColors.accent} />
          <View>
            <Text style={styles.activityStatValue}>{steps.toLocaleString()}</Text>
            <Text style={styles.activityStatLabel}>خطوة ({syncTime})</Text>
          </View>
        </View>

        <View style={[styles.activityStatBox, styles.leftAlignCard]}>
          <StreakIcon size={24} color={AppColors.accent} />
          <View style={styles.leftStatTextGroup}>
            <Text style={styles.leftStatValue}>{calories}</Text>
            <Text style={styles.leftStatLabel}>سعرة نشطة</Text>
          </View>
        </View>
      </View>

      {/* Movement Breakdown Card */}
      <View style={styles.breakdownBox}>
        <View style={styles.breakdownHeaderRow}>
          <Text style={styles.breakdownTitle}>تحليل الحركة</Text>
          <Text style={styles.breakdownSub}>{percent}% من الهدف</Text>
        </View>

        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
        </View>

        <View style={styles.breakdownThreeCols}>
          <View style={styles.colItem}>
            <Text style={styles.colValue}>{activeMinutes}</Text>
            <Text style={styles.colLabel}>دقيقة حركة</Text>
          </View>
          <View style={styles.colDivider} />
          <View style={styles.colItem}>
            <Text style={styles.colValue}>{distanceKm} كم</Text>
            <Text style={styles.colLabel}>المسافة</Text>
          </View>
          <View style={styles.colDivider} />
          <View style={styles.colItem}>
            <Text style={styles.colValue}>--/12</Text>
            <Text style={styles.colLabel}>ساعة وقوف</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

MovementWidget.displayName = 'MovementWidget';

const styles = StyleSheet.create({
  activityCard: {
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
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  syncBadgeText: {
    fontSize: 10,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  activityTwoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  activityStatBox: {
    flex: 1,
    backgroundColor: AppColors.surfaceContainerLow,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  leftAlignCard: {
    justifyContent: 'space-between',
  },
  leftStatTextGroup: {
    alignItems: 'flex-start',
  },
  leftStatValue: {
    fontSize: 16,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    textAlign: 'left',
  },
  leftStatLabel: {
    fontSize: 10,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    textAlign: 'left',
  },
  activityStatValue: {
    fontSize: 16,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  activityStatLabel: {
    fontSize: 10,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
  },
  breakdownBox: {
    backgroundColor: AppColors.surfaceContainerLow,
    borderRadius: 16,
    padding: 12,
  },
  breakdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  breakdownTitle: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  breakdownSub: {
    fontSize: 10,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: AppColors.borderSubtle,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: AppColors.primary,
    borderRadius: 3,
  },
  breakdownThreeCols: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  colItem: {
    alignItems: 'center',
  },
  colValue: {
    fontSize: 13,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  colLabel: {
    fontSize: 10,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
  },
  colDivider: {
    width: 1,
    height: 24,
    backgroundColor: AppColors.borderSubtle,
  },
});
