import { Text } from '@/components/AppText';
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppColors } from '../../../constants/AppTheme';
import { WaterIcon, UndoIcon } from '../../../components/icons';

interface WaterWidgetProps {
  consumedGlasses?: number;
  targetGlasses?: number;
  onAddWater?: (cups: number) => void;
  onUndoWater?: () => void;
}

export const WaterWidget: React.FC<WaterWidgetProps> = React.memo(({
  consumedGlasses = 0,
  targetGlasses = 8,
  onAddWater,
  onUndoWater
}) => {
  const consumedLiters = (consumedGlasses * 0.25).toFixed(1);
  const targetLiters = (targetGlasses * 0.25).toFixed(1);
  const remainingLiters = Math.max(0, targetGlasses * 0.25 - consumedGlasses * 0.25).toFixed(1);
  const percent = targetGlasses > 0 ? Math.min(Math.round((consumedGlasses / targetGlasses) * 100), 100) : 0;

  // Dynamic Soulful Encouragement Message
  const getMotivationalMessage = () => {
    if (consumedGlasses === 0) return 'انتعش بكوب ماء لبداية يوم حيوية وربط نشاطك ';
    if (percent >= 100) return 'إنجاز رائع! حققت هدف المياه بالكامل لليوم ';
    if (percent >= 75) return 'قربت جداً! خطوة واحدة وتكتمل التزامات اليوم ';
    if (percent >= 50) return 'أداء رائع! عديت نصف هدفك اليومي بنجاح ';
    return 'بداية ممتازة.. جسمك بيشكرك مع كل كوب 🌱';
  };

  return (
    <View style={styles.waterCard}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconBox}>
            <WaterIcon size={22} color="#F26E11" />
          </View>
          <View>
            <Text style={styles.sectionTitle}>متابع المياه</Text>
            <Text style={styles.sectionSubtitle}>الترطيب اليومي لصحتك</Text>
          </View>
        </View>

        <View style={styles.goalBadge}>
          <Text style={styles.goalBadgeText}>{targetLiters} لتر ({targetGlasses} أكواب)</Text>
        </View>
      </View>

      {/* Soulful Encouragement Banner */}
      <View style={styles.motivationBanner}>
        <Text style={styles.motivationText}>{getMotivationalMessage()}</Text>
      </View>

      {/* Main Hydration Stats */}
      <View style={styles.statsRow}>
        <View style={styles.volumeWrap}>
          <Text style={styles.consumedLitersText}>
            {consumedLiters} <Text style={styles.unitText}>/ {targetLiters} لتر</Text>
          </Text>
          <Text style={styles.remainingText}>
            {consumedGlasses >= targetGlasses
              ? 'تم تحقيق الترطيب المطلوب '
              : `متبقي ${remainingLiters} لتر للوصول للهدف`}
          </Text>
        </View>

        <View style={styles.percentageBadge}>
          <Text style={styles.percentageText}>{percent}%</Text>
        </View>
      </View>

      {/* Brand Emerald Progress Bar */}
      <View style={styles.progressTrack}>
        <LinearGradient
          colors={['#2A4D44', '#3A6D61']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${percent}%` }]}
        />
      </View>

      {/* Interactive Glass Indicators Grid */}
      <View style={styles.glassesGrid}>
        {Array.from({ length: targetGlasses }).map((_, index) => {
          const isFilled = index < consumedGlasses;
          const isCurrent = index === consumedGlasses;
          return (
            <View
              key={index}
              style={[
                styles.glassIndicator,
                isFilled ? styles.glassFilled : styles.glassEmpty,
                isCurrent && styles.glassCurrent,
              ]}
            >
              <WaterIcon size={14} color={isFilled ? '#F26E11' : AppColors.primary} />
            </View>
          );
        })}
      </View>

      {/* Action Controls Footer */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.undoBtn}
          onPress={onUndoWater}
          activeOpacity={0.75}
        >
          <UndoIcon size={16} color={AppColors.outline} />
          <Text style={styles.undoBtnText}>تراجع</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addBtnWrap}
          onPress={() => onAddWater && onAddWater(1)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#2A4D44', '#1E3831']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addBtnGradient}
          >
            <WaterIcon size={18} color="#F26E11" />
            <Text style={styles.addBtnText}>+ إضافة كوب ماء (250ml)</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
});

WaterWidget.displayName = 'WaterWidget';

const styles = StyleSheet.create({
  waterCard: {
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  headerRow: {
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
    borderColor: 'rgba(242, 110, 17, 0.25)',
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
  goalBadge: {
    backgroundColor: 'rgba(42, 77, 68, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(42, 77, 68, 0.18)',
  },
  goalBadgeText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  motivationBanner: {
    backgroundColor: '#F9FAF8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(42, 77, 68, 0.06)',
    marginBottom: 14,
  },
  motivationText: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  volumeWrap: {
    flex: 1,
    alignItems: 'flex-start',
  },
  consumedLitersText: {
    fontSize: 26,
    fontFamily: 'Thmanyah-Black',
    color: AppColors.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  unitText: {
    fontSize: 14,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  remainingText: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  percentageBadge: {
    backgroundColor: 'rgba(242, 110, 17, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  percentageText: {
    fontSize: 14,
    fontFamily: 'Thmanyah-Bold',
    color: '#F26E11',
  },
  progressTrack: {
    height: 10,
    backgroundColor: 'rgba(42, 77, 68, 0.08)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  glassesGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 6,
  },
  glassIndicator: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassFilled: {
    backgroundColor: 'rgba(242, 110, 17, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(242, 110, 17, 0.3)',
  },
  glassEmpty: {
    backgroundColor: 'rgba(42, 77, 68, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(42, 77, 68, 0.18)',
  },
  glassCurrent: {
    borderWidth: 1.5,
    borderColor: '#F26E11',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  undoBtnText: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.outline,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  addBtnWrap: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  addBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: 'Thmanyah-Bold',
    color: '#FFFFFF',
    writingDirection: 'rtl',
  },
});
