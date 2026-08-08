import { Text } from '@/components/AppText';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppColors } from '../../../constants/AppTheme';
import { PieChartIcon, WaterIcon, WalkIcon } from '../../../components/icons';

interface IndicatorsWidgetProps {
  compliance?: number;
  waterLiters?: number;
  targetWaterLiters?: number;
  steps?: number;
}

export const IndicatorsWidget: React.FC<IndicatorsWidgetProps> = React.memo(({
  compliance = 78,
  waterLiters = 1.25,
  steps = 4250
}) => {
  const displayCompliance = compliance !== undefined ? `${compliance}%` : '٧٨٪';
  const displayWater = waterLiters !== undefined ? `${waterLiters.toFixed(2)} لتر` : '١.٢٥ لتر';
  const displaySteps = steps !== undefined ? steps.toLocaleString() : '٤,٢٥٠';

  return (
    <View style={styles.indicatorsRow}>
      <View style={styles.indicatorCard}>
        <View style={styles.iconBox}>
          <PieChartIcon size={18} color="#F26E11" />
        </View>
        <Text style={styles.indicatorLabel}>الالتزام</Text>
        <Text style={styles.indicatorValue}>{displayCompliance}</Text>
      </View>

      <View style={styles.indicatorCard}>
        <View style={styles.iconBox}>
          <WaterIcon size={18} color="#F26E11" />
        </View>
        <Text style={styles.indicatorLabel}>الماء</Text>
        <Text style={styles.indicatorValue}>{displayWater}</Text>
      </View>

      <View style={styles.indicatorCard}>
        <View style={styles.iconBox}>
          <WalkIcon size={18} color="#F26E11" />
        </View>
        <Text style={styles.indicatorLabel}>الخطوات</Text>
        <Text style={styles.indicatorValue}>{displaySteps}</Text>
      </View>
    </View>
  );
});

IndicatorsWidget.displayName = 'IndicatorsWidget';

const styles = StyleSheet.create({
  indicatorsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  indicatorCard: {
    flex: 1,
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(242, 110, 17, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  indicatorLabel: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    textAlign: 'center',
  },
  indicatorValue: {
    fontSize: 15,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
});
