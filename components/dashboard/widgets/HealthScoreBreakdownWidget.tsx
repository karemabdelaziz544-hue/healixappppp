import { Text } from '@/components/AppText';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppColors } from '../../../constants/AppTheme';

interface HealthScoreBreakdownWidgetProps {
  score?: number;
  contributors?: {
    nutrition: number;
    water: number;
    activity: number;
    sleep: number;
  };
}

export const HealthScoreBreakdownWidget: React.FC<HealthScoreBreakdownWidgetProps> = React.memo(({
  score,
  contributors = { nutrition: 0, water: 0, activity: 0, sleep: 0 }
}) => {
  const displayScore = score !== undefined ? `${score}/100` : '--';

  return (
    <View style={styles.breakdownCard}>
      <Text style={styles.breakdownCardTitle}>تفاصيل الدرجة الصحية ({displayScore})</Text>

      <View style={styles.contribRow}>
        <View style={styles.contribItem}>
          <Text style={styles.contribName}>التغذية</Text>
          <Text style={styles.contribVal}>{contributors.nutrition}%</Text>
        </View>
        <View style={styles.contribItem}>
          <Text style={styles.contribName}>المياه</Text>
          <Text style={styles.contribVal}>{contributors.water}%</Text>
        </View>
        <View style={styles.contribItem}>
          <Text style={styles.contribName}>الحركة</Text>
          <Text style={styles.contribVal}>{contributors.activity}%</Text>
        </View>
        <View style={styles.contribItem}>
          <Text style={styles.contribName}>النوم</Text>
          <Text style={styles.contribVal}>{contributors.sleep}%</Text>
        </View>
      </View>
    </View>
  );
});

HealthScoreBreakdownWidget.displayName = 'HealthScoreBreakdownWidget';

const styles = StyleSheet.create({
  breakdownCard: {
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  breakdownCardTitle: {
    fontSize: 14,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    marginBottom: 10,
  },
  contribRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contribItem: {
    alignItems: 'center',
  },
  contribName: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    marginBottom: 2,
  },
  contribVal: {
    fontSize: 14,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
});
