import { Text } from '@/components/AppText';
import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { AppColors } from '../../../constants/AppTheme';
import { ChevronLeftIcon } from '../../../components/icons';

interface ProgressHeroWidgetProps {
  score?: number;
  compliance?: number;
  summaryText?: string;
  onContinueDayPress?: () => void;
}

export const ProgressHeroWidget: React.FC<ProgressHeroWidgetProps> = React.memo(({
  score,
  compliance,
  summaryText,
  onContinueDayPress
}) => {
  const scale = useSharedValue(0.96);

  useEffect(() => {
    if (compliance !== undefined) {
      scale.value = withSpring(1, { damping: 14 });
    }
  }, [compliance, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const hasData = compliance !== undefined && score !== undefined;
  const displayCompliance = hasData ? `${compliance}%` : '--';
  const displaySummary = summaryText || (hasData ? 'مستوى رائع، استمر في الحفاظ على هذا الإيقاع المتميز' : 'جاري تحميل مؤشراتك اليومية...');

  // SVG Gauge constants
  const size = 88;
  const strokeWidth = 7;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validCompliance = Math.min(Math.max(compliance || 0, 0), 100);
  const strokeDashoffset = circumference - (circumference * validCompliance) / 100;

  return (
    <Animated.View style={[styles.heroCard, animatedStyle]}>
      {/* Right Info Section */}
      <View style={styles.heroLeftSection}>
        <View style={styles.heroHeaderBadge}>
          <Text style={styles.heroSubLabel}>النتيجة الصحية اليوم</Text>
        </View>

        <View style={styles.heroScoreRow}>
          <Text style={styles.heroBigNumber}>{hasData ? score : '--'}</Text>
          <Text style={styles.heroScoreMax}>/100</Text>
        </View>

        <Text style={styles.heroDescription}>{displaySummary}</Text>

        <TouchableOpacity style={styles.heroActionBtn} onPress={onContinueDayPress} activeOpacity={0.85}>
          <Text style={styles.heroActionBtnText}>أكمل يومك</Text>
          <ChevronLeftIcon size={14} color={AppColors.white} />
        </TouchableOpacity>
      </View>

      {/* SVG Circular Progress Gauge */}
      <View style={styles.heroRingWrap}>
        <Svg width={size} height={size}>
          {/* Background Track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={AppColors.primaryLight}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Active Progress Arc */}
          {hasData && (
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={AppColors.primary}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              transform={`rotate(-90 ${center} ${center})`}
            />
          )}
        </Svg>

        <View style={styles.heroRingCenterContent}>
          <Text style={styles.heroRingNumber}>{displayCompliance}</Text>
          <Text style={styles.heroRingLabel}>الالتزام</Text>
        </View>
      </View>
    </Animated.View>
  );
});

ProgressHeroWidget.displayName = 'ProgressHeroWidget';

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  heroLeftSection: {
    flex: 1,
    paddingLeft: 12,
    alignItems: 'flex-start',
  },
  heroHeaderBadge: {
    backgroundColor: AppColors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  heroSubLabel: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    writingDirection: 'rtl',
  },
  heroScoreRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 2,
    marginBottom: 6,
  },
  heroBigNumber: {
    fontSize: 44,
    fontFamily: 'Thmanyah-Black',
    color: AppColors.primary,
    lineHeight: 48,
  },
  heroScoreMax: {
    fontSize: 16,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.outline,
  },
  heroDescription: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 14,
    writingDirection: 'rtl',
  },
  heroActionBtn: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  heroActionBtnText: {
    color: AppColors.white,
    fontSize: 12,
    fontFamily: 'Thmanyah-Bold',
    writingDirection: 'rtl',
  },
  heroRingWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroRingCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRingNumber: {
    fontSize: 16,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    writingDirection: 'rtl',
  },
  heroRingLabel: {
    fontSize: 10,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    marginTop: 1,
    writingDirection: 'rtl',
  },
});
