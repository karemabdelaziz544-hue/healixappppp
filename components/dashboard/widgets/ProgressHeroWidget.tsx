import { Text } from '@/components/AppText';
import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { AppColors } from '../../../constants/AppTheme';
import { WalkIcon, StreakIcon, WaterIcon, SyncIcon } from '../../../components/icons';

interface ProgressHeroWidgetProps {
  score?: number;
  compliance?: number;
  summaryText?: string;
  onContinueDayPress?: () => void;
  steps?: number;
  calories?: number;
  waterGlasses?: number;
  activeMinutes?: number;
  weightKg?: number;
}

export const ProgressHeroWidget: React.FC<ProgressHeroWidgetProps> = React.memo(({
  score = 78,
  compliance = 78,
  summaryText,
  onContinueDayPress,
  steps = 0,
  calories = 0,
  waterGlasses = 0,
  activeMinutes = 0,
  weightKg = 70.0
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
  const displayScore = hasData ? score : 78;
  const displayCompliance = hasData ? `${compliance}%` : '٧٨٪';
  const displaySummary = summaryText || 'أداء ممتاز اليوم! واصل الالتزام بخطتك الغذائية.';

  // SVG Gauge constants
  const size = 110;
  const strokeWidth = 8;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validCompliance = Math.min(Math.max(compliance || 78, 0), 100);
  const strokeDashoffset = circumference - (circumference * validCompliance) / 100;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <LinearGradient
        colors={['#2A4D44', '#3A6D61']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        {/* Top Info & Circular Gauge Row */}
        <View style={styles.topRow}>
          <View style={styles.leftColumn}>
            <View style={styles.scoreTitleRow}>
              <View style={styles.iconCircle}>
                <SyncIcon size={18} color="#F26E11" />
              </View>
              <Text style={styles.scoreTitleText}>درجة الصحة</Text>
            </View>

            <Text style={styles.scoreBigNumber}>{displayScore}</Text>

            <Text style={styles.summaryText}>{displaySummary}</Text>
          </View>

          {/* SVG Circular Progress Gauge */}
          <View style={styles.gaugeWrap}>
            <Svg width={size} height={size}>
              {/* Background Track */}
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Active Progress Arc */}
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#10B981"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                transform={`rotate(-90 ${center} ${center})`}
              />
            </Svg>

            <View style={styles.gaugeCenterContent}>
              <Text style={styles.gaugePercentText}>{displayCompliance}</Text>
              <Text style={styles.gaugeLabelText}>الالتزام</Text>
            </View>
          </View>
        </View>

        {/* Swipeable Metrics Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
        >
          {/* Card 1: Steps */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <WalkIcon size={16} color="#F26E11" />
              <Text style={styles.metricLabel}>الخطوات</Text>
            </View>
            <Text style={styles.metricValue}>{steps.toLocaleString()}</Text>
            <TouchableOpacity onPress={onContinueDayPress}>
              <Text style={styles.metricBtnText}>عرض التفاصيل</Text>
            </TouchableOpacity>
          </View>

          {/* Card 2: Calories */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <StreakIcon size={16} color="#F26E11" />
              <Text style={styles.metricLabel}>السعرات</Text>
            </View>
            <Text style={styles.metricValue}>{calories}</Text>
            <TouchableOpacity onPress={onContinueDayPress}>
              <Text style={styles.metricBtnText}>عرض التفاصيل</Text>
            </TouchableOpacity>
          </View>

          {/* Card 3: Water */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <WaterIcon size={16} color="#F26E11" />
              <Text style={styles.metricLabel}>الماء</Text>
            </View>
            <Text style={styles.metricValue}>{waterGlasses} <Text style={styles.metricUnit}>أكواب</Text></Text>
            <TouchableOpacity onPress={onContinueDayPress}>
              <Text style={styles.metricBtnText}>عرض التفاصيل</Text>
            </TouchableOpacity>
          </View>

          {/* Card 4: Active Mins */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <SyncIcon size={16} color="#F26E11" />
              <Text style={styles.metricLabel}>نشاط</Text>
            </View>
            <Text style={styles.metricValue}>{activeMinutes} <Text style={styles.metricUnit}>دقيقة</Text></Text>
            <TouchableOpacity onPress={onContinueDayPress}>
              <Text style={styles.metricBtnText}>عرض التفاصيل</Text>
            </TouchableOpacity>
          </View>

          {/* Card 5: Weight */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <SyncIcon size={16} color="#F26E11" />
              <Text style={styles.metricLabel}>الوزن</Text>
            </View>
            <Text style={styles.metricValue}>{weightKg} <Text style={styles.metricUnit}>كجم</Text></Text>
            <TouchableOpacity onPress={onContinueDayPress}>
              <Text style={styles.metricBtnText}>عرض التفاصيل</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </Animated.View>
  );
});

ProgressHeroWidget.displayName = 'ProgressHeroWidget';

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 4,
  },
  heroGradient: {
    padding: 20,
    borderRadius: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  leftColumn: {
    flex: 1,
    paddingLeft: 12,
    alignItems: 'flex-start',
  },
  scoreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(242, 110, 17, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreTitleText: {
    fontSize: 13,
    fontFamily: 'Thmanyah-Bold',
    color: 'rgba(255, 255, 255, 0.9)',
    writingDirection: 'rtl',
  },
  scoreBigNumber: {
    fontSize: 48,
    fontFamily: 'Thmanyah-Black',
    color: '#FFFFFF',
    lineHeight: 52,
    marginBottom: 4,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  streakPillText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Bold',
    color: 'rgba(255, 255, 255, 0.9)',
    writingDirection: 'rtl',
  },
  summaryText: {
    fontSize: 13,
    fontFamily: 'Thmanyah-Regular',
    color: '#FFFFFF',
    lineHeight: 20,
    maxWidth: 210,
    writingDirection: 'rtl',
  },
  gaugeWrap: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gaugeCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugePercentText: {
    fontSize: 20,
    fontFamily: 'Thmanyah-Bold',
    color: '#FFFFFF',
    writingDirection: 'rtl',
  },
  gaugeLabelText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    writingDirection: 'rtl',
  },
  carouselContainer: {
    gap: 12,
    paddingVertical: 4,
  },
  metricCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    padding: 12,
    minWidth: 130,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    writingDirection: 'rtl',
  },
  metricValue: {
    fontSize: 22,
    fontFamily: 'Thmanyah-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
    writingDirection: 'rtl',
  },
  metricUnit: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Regular',
  },
  metricBtnText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Bold',
    color: '#F26E11',
    writingDirection: 'rtl',
  },
});
