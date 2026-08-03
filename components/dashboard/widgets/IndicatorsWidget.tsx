import { Text } from '@/components/AppText';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../../constants/AppTheme';
import { PieChartIcon, WaterIcon } from '../../../components/icons';

interface IndicatorsWidgetProps {
  compliance?: number;
  waterLiters?: number;
  targetWaterLiters?: number;
  steps?: number;
}

export const IndicatorsWidget: React.FC<IndicatorsWidgetProps> = React.memo(({
  compliance,
  waterLiters,
  targetWaterLiters = 2.5,
  steps
}) => {
  const displayCompliance = compliance !== undefined ? `${compliance}%` : '--';
  const displayWater = waterLiters !== undefined ? `${waterLiters.toFixed(1)} L` : '--';
  const displaySteps = steps !== undefined ? steps.toLocaleString() : '--';

  return (
    <View style={styles.indicatorsRow}>
      <View style={styles.indicatorCard}>
        <PieChartIcon size={22} color={AppColors.accent} />
        <Text style={styles.indicatorValue}>{displayCompliance}</Text>
        <Text style={styles.indicatorLabel}>الالتزام اليومي</Text>
      </View>

      <View style={styles.indicatorCard}>
        <WaterIcon size={22} color={AppColors.accent} />
        <Text style={styles.indicatorValue}>{displayWater}</Text>
        <Text style={styles.indicatorLabel}>المياه (هدف {targetWaterLiters}L)</Text>
      </View>

      <View style={styles.indicatorCard}>
        <Ionicons name="footsteps" size={22} color={AppColors.accent} />
        <Text style={styles.indicatorValue}>{displaySteps}</Text>
        <Text style={styles.indicatorLabel}>الحركة (خطوة)</Text>
      </View>
    </View>
  );
});

IndicatorsWidget.displayName = 'IndicatorsWidget';

const styles = StyleSheet.create({
  indicatorsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  indicatorCard: {
    flex: 1,
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  indicatorValue: {
    fontSize: 16,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  indicatorLabel: {
    fontSize: 10,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    textAlign: 'center',
  },
});
