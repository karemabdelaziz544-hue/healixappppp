import { Text } from '@/components/AppText';
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppColors } from '../../../constants/AppTheme';
import { UndoIcon } from '../../../components/icons';

interface WaterWidgetProps {
  consumedGlasses: number;
  targetGlasses: number;
  onAddWater: (cups: number) => void;
  onUndoWater: () => void;
}

export const WaterWidget: React.FC<WaterWidgetProps> = React.memo(({
  consumedGlasses = 0,
  targetGlasses = 10,
  onAddWater,
  onUndoWater
}) => {
  const consumedLiters = (consumedGlasses * 0.25).toFixed(1);
  const targetLiters = (targetGlasses * 0.25).toFixed(1);
  const remainingLiters = Math.max(0, targetGlasses * 0.25 - consumedGlasses * 0.25).toFixed(1);
  const percent = targetGlasses > 0 ? Math.min(Math.round((consumedGlasses / targetGlasses) * 100), 100) : 0;

  return (
    <View style={styles.waterCard}>
      <View style={styles.waterHeaderRow}>
        <Text style={styles.waterTitle}>تتبع المياه</Text>
        <View style={styles.waterHeaderRight}>
          <Text style={styles.waterVolumeMain}>{consumedLiters}</Text>
          <Text style={styles.waterVolumeSub}>/ {targetLiters} لتر (متبقي {remainingLiters}L)</Text>
        </View>
      </View>

      {/* Wave Visualization Container */}
      <View style={styles.waveVisualContainer}>
        <View style={[styles.waveFillLayer, { height: `${percent}%` }]} />
        <View style={styles.waveCenterInfo}>
          <Text style={styles.wavePercentText}>{percent}%</Text>
        </View>
      </View>

      {/* Quick Logging Buttons */}
      <View style={styles.waterBtnRow}>
        <TouchableOpacity style={styles.waterAddBtn} onPress={() => onAddWater(0.4)} activeOpacity={0.8}>
          <Text style={styles.waterAddBtnText}>+100ml</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.waterAddBtn} onPress={() => onAddWater(1.0)} activeOpacity={0.8}>
          <Text style={styles.waterAddBtnText}>+250ml</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.waterAddBtn} onPress={() => onAddWater(2.0)} activeOpacity={0.8}>
          <Text style={styles.waterAddBtnText}>+500ml</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.waterAddBtn} onPress={() => onAddWater(4.0)} activeOpacity={0.8}>
          <Text style={styles.waterAddBtnText}>+1L</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.waterUndoBtn} onPress={onUndoWater} activeOpacity={0.8}>
          <UndoIcon size={16} color={AppColors.outline} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

WaterWidget.displayName = 'WaterWidget';

const styles = StyleSheet.create({
  waterCard: {
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 28,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  waterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  waterTitle: {
    fontSize: 18,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  waterHeaderRight: {
    alignItems: 'flex-end',
  },
  waterVolumeMain: {
    fontSize: 22,
    fontFamily: 'Thmanyah-Black',
    color: AppColors.primary,
  },
  waterVolumeSub: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
  },
  waveVisualContainer: {
    height: 70,
    backgroundColor: AppColors.surfaceContainerLow,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    position: 'relative',
    marginBottom: 14,
  },
  waveFillLayer: {
    backgroundColor: AppColors.primaryLight,
    width: '100%',
  },
  waveCenterInfo: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wavePercentText: {
    fontSize: 20,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  waterBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  waterAddBtn: {
    flex: 1,
    backgroundColor: AppColors.surfaceContainerLow,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  waterAddBtnText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  waterUndoBtn: {
    width: 36,
    backgroundColor: AppColors.surfaceContainerLow,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
});
