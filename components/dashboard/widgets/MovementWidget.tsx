import { Text } from '@/components/AppText';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppColors } from '../../../constants/AppTheme';
import { StreakIcon, SyncIcon, WalkIcon, WaterIcon } from '../../../components/icons';
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
  steps = 4250,
  goalSteps = 10000,
  calories = 450,
  distanceKm = 3.2,
  activeMinutes = 45,
  sourceName = 'Apple Health'
}) => {
  const percent = goalSteps > 0 ? Math.min(Math.round((steps / goalSteps) * 100), 100) : 42;
  const displayProvider = ActivityService.getDisplayName(sourceName);

  return (
    <View style={styles.activityCard}>
      {/* Section Header */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>النشاط اليومي</Text>
        <View style={styles.syncBadge}>
          <SyncIcon size={12} color={AppColors.primary} />
          <Text style={styles.syncBadgeText}>متصل بـ {displayProvider}</Text>
        </View>
      </View>

      {/* 2x2 Grid for Calories & Active Mins */}
      <View style={styles.activityTwoGrid}>
        {/* Calories */}
        <View style={styles.statBox}>
          <View style={styles.iconBox}>
            <StreakIcon size={20} color="#F26E11" />
          </View>
          <View>
            <Text style={styles.statLabel}>السعرات</Text>
            <Text style={styles.statValue}>
              {calories} <Text style={styles.unitText}>كالوري</Text>
            </Text>
          </View>
        </View>

        {/* Active Mins / Walk */}
        <View style={styles.statBox}>
          <View style={styles.iconBox}>
            <SyncIcon size={20} color="#F26E11" />
          </View>
          <View>
            <Text style={styles.statLabel}>المشي</Text>
            <Text style={styles.statValue}>
              {activeMinutes} <Text style={styles.unitText}>دقيقة</Text>
            </Text>
          </View>
        </View>
      </View>

      {/* Full Width Card for Distance & Progress Graph */}
      <View style={styles.distanceBox}>
        <View style={styles.iconBox}>
          <WalkIcon size={20} color="#F26E11" />
        </View>
        <View style={styles.distanceRightWrap}>
          <View>
            <Text style={styles.statLabel}>المسافة</Text>
            <Text style={styles.statValue}>
              {distanceKm} <Text style={styles.unitText}>كم</Text>
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percent}%` }]} />
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
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    gap: 6,
  },
  syncBadgeText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
  },
  activityTwoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(242, 110, 17, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    marginTop: 2,
  },
  unitText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
  },
  distanceBox: {
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  distanceRightWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTrack: {
    width: 96,
    height: 8,
    backgroundColor: AppColors.surfaceContainerHigh,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: AppColors.primary,
    borderRadius: 4,
  },
});
