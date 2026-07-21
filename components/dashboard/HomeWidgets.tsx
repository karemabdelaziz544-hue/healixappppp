import { Text } from '@/components/AppText';
import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring, 
  withRepeat, 
  withSequence,
  Easing 
} from 'react-native-reanimated';
import { AppColors } from '../../constants/AppTheme';
import type { PlanTask } from '../../src/types';
import type { TimelineEvent } from '../../src/types/digitalHealthRecord';

const { width } = Dimensions.get('window');

// 1. HealthScoreWidget
// ------------------------------------------------
interface HealthScoreWidgetProps {
  score: number;
  compliance: number;
  contributors: {
    nutrition: number;
    water: number;
    activity: number;
    sleep: number;
  };
  warnings: string[];
  achievements: string[];
  onPressDetails?: () => void;
}

export const HealthScoreWidget: React.FC<HealthScoreWidgetProps> = ({
  score = 75,
  compliance = 0,
  contributors = { nutrition: 0, water: 0, activity: 0, sleep: 0 },
  warnings = [],
  achievements = [],
  onPressDetails
}) => {
  const scale = useSharedValue(0.9);
  const ringAnim = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 15 });
    ringAnim.value = withTiming(score / 100, { duration: 1000, easing: Easing.out(Easing.quad) });
  }, [score]);

  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View style={[styles.scoreCard, animatedCircleStyle]}>
      <View style={styles.scoreHeader}>
        <View style={styles.scoreInfo}>
          <Text style={styles.scoreTitle}>درجة الصحة العامّة</Text>
          <View style={styles.improvementBadge}>
            <Ionicons name="trending-up" size={14} color="#10B981" />
            <Text style={styles.improvementText}>+{compliance}% الالتزام اليومي</Text>
          </View>
        </View>

        <View style={styles.scoreCircleContainer}>
          <View style={styles.scoreCircleInner}>
            <Text style={styles.scoreNumber}>{score}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
        </View>
      </View>

      {/* Contributors Segment */}
      <View style={styles.contributorsRow}>
        <View style={styles.contributorItem}>
          <Text style={styles.contributorLabel}>🥗 تغذية</Text>
          <View style={styles.contributorBarBg}>
            <View style={[styles.contributorBarFill, { width: `${contributors.nutrition}%`, backgroundColor: '#10B981' }]} />
          </View>
        </View>

        <View style={styles.contributorItem}>
          <Text style={styles.contributorLabel}>💧 ترطيب</Text>
          <View style={styles.contributorBarBg}>
            <View style={[styles.contributorBarFill, { width: `${contributors.water}%`, backgroundColor: '#3B82F6' }]} />
          </View>
        </View>

        <View style={styles.contributorItem}>
          <Text style={styles.contributorLabel}>🏃 حركة</Text>
          <View style={styles.contributorBarBg}>
            <View style={[styles.contributorBarFill, { width: `${contributors.activity}%`, backgroundColor: '#8B5CF6' }]} />
          </View>
        </View>

        <View style={styles.contributorItem}>
          <Text style={styles.contributorLabel}>😴 نوم</Text>
          <View style={styles.contributorBarBg}>
            <View style={[styles.contributorBarFill, { width: `${contributors.sleep}%`, backgroundColor: '#EC4899' }]} />
          </View>
        </View>
      </View>

      {warnings.length > 0 && (
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={16} color="#EF4444" />
          <Text style={styles.warningText}>{warnings[0]}</Text>
        </View>
      )}

      <TouchableOpacity 
        style={styles.detailsBtn} 
        onPress={onPressDetails}
        activeOpacity={0.8}
      >
        <Text style={styles.detailsBtnText}>عرض التحليلات والملف الطبي</Text>
        <Ionicons name="arrow-back" size={16} color={AppColors.primary} />
      </TouchableOpacity>
    </Animated.View>
  );
};


// 2. AIInsightWidget
// ------------------------------------------------
interface AIInsightWidgetProps {
  recommendation?: string;
  onChatPress?: () => void;
}

export const AIInsightWidget: React.FC<AIInsightWidgetProps> = ({
  recommendation = 'جاري تحليل مؤشراتك الحيوية وصياغة توصيات مخصصة لك...',
  onChatPress
}) => {
  return (
    <View style={styles.coachCard}>
      <View style={styles.coachHeader}>
        <View style={styles.coachTitleRow}>
          <View style={styles.coachIconBox}>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.coachTitle}>كوتش هيليكس الذكي</Text>
        </View>
        <Text style={styles.coachBadge}>ذكاء اصطناعي</Text>
      </View>

      <Text style={styles.coachText}>{recommendation}</Text>

      <TouchableOpacity 
        style={styles.coachBtn} 
        onPress={onChatPress}
        activeOpacity={0.9}
      >
        <Ionicons name="chatbubbles-outline" size={18} color="#FFFFFF" />
        <Text style={styles.coachBtnText}>تحدث مع الكوتش للاستفسار</Text>
      </TouchableOpacity>
    </View>
  );
};


// 3. QuickActionsWidget
// ------------------------------------------------
interface QuickActionsWidgetProps {
  onLogWaterPress: () => void;
  onAICoachPress: () => void;
  onDietPlanPress: () => void;
  onProgressPress: () => void;
  onMorePress: () => void;
}

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({
  onLogWaterPress,
  onAICoachPress,
  onDietPlanPress,
  onProgressPress,
  onMorePress
}) => {
  return (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>التحكم السريع</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity style={styles.actionBtn} onPress={onLogWaterPress} activeOpacity={0.85}>
          <View style={[styles.actionIconWrap, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="water-outline" size={20} color="#3B82F6" />
          </View>
          <Text style={styles.actionLabel}>تسجيل مياه</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onAICoachPress} activeOpacity={0.85}>
          <View style={[styles.actionIconWrap, { backgroundColor: '#FDF2F8' }]}>
            <Ionicons name="sparkles-outline" size={20} color="#EC4899" />
          </View>
          <Text style={styles.actionLabel}>كوتش AI</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onDietPlanPress} activeOpacity={0.85}>
          <View style={[styles.actionIconWrap, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="restaurant-outline" size={20} color="#10B981" />
          </View>
          <Text style={styles.actionLabel}>البرنامج</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onProgressPress} activeOpacity={0.85}>
          <View style={[styles.actionIconWrap, { backgroundColor: '#F5F3FF' }]}>
            <Ionicons name="trending-up-outline" size={20} color="#8B5CF6" />
          </View>
          <Text style={styles.actionLabel}>تقدمي</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onMorePress} activeOpacity={0.85}>
          <View style={[styles.actionIconWrap, { backgroundColor: '#FFF7ED' }]}>
            <Ionicons name="grid-outline" size={20} color="#F97316" />
          </View>
          <Text style={styles.actionLabel}>المزيد</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};


// 4. ProgressGridWidget
// ------------------------------------------------
interface ProgressGridWidgetProps {
  mealsCount: number;
  totalMeals: number;
  workoutsCount: number;
  totalWorkouts: number;
  activitySteps: number;
  activityGoalSteps: number;
  syncTime: string;
  sourceName: string;
  onCardPress: (key: string) => void;
}

export const ProgressGridWidget: React.FC<ProgressGridWidgetProps> = ({
  mealsCount = 0,
  totalMeals = 0,
  workoutsCount = 0,
  totalWorkouts = 0,
  activitySteps = 0,
  activityGoalSteps = 10000,
  syncTime = 'تمت المزامنة',
  sourceName = 'Pedometer',
  onCardPress
}) => {
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.ease }),
        withTiming(0.4, { duration: 800, easing: Easing.ease })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 1.1 }]
  }));

  const mealsPercent = totalMeals > 0 ? Math.round((mealsCount / totalMeals) * 100) : 0;
  const workoutsPercent = totalWorkouts > 0 ? Math.round((workoutsCount / totalWorkouts) * 100) : 0;
  const activityPercent = activityGoalSteps > 0 ? Math.min(Math.round((activitySteps / activityGoalSteps) * 100), 100) : 0;

  return (
    <View style={styles.progressSection}>
      <Text style={styles.sectionTitle}>مؤشرات اليوم</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        <TouchableOpacity style={styles.progressCard} onPress={() => onCardPress('meals')} activeOpacity={0.9}>
          <View style={[styles.progressIconBox, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="restaurant-outline" size={20} color="#10B981" />
          </View>
          <Text style={styles.progressCardTitle}>وجبات التغذية</Text>
          <Text style={styles.progressCardVal}>{mealsCount} / {totalMeals} وجبات</Text>
          <View style={styles.barContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${mealsPercent}%`, backgroundColor: '#10B981' }]} />
            </View>
            <Text style={[styles.percentageText, { color: '#10B981' }]}>{mealsPercent}%</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.progressCard} onPress={() => onCardPress('workouts')} activeOpacity={0.9}>
          <View style={[styles.progressIconBox, { backgroundColor: '#FFF7ED' }]}>
            <Ionicons name="barbell-outline" size={20} color="#F97316" />
          </View>
          <Text style={styles.progressCardTitle}>التمارين والأنشطة</Text>
          <Text style={styles.progressCardVal}>{workoutsCount} / {totalWorkouts} تمارين</Text>
          <View style={styles.barContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${workoutsPercent}%`, backgroundColor: '#F97316' }]} />
            </View>
            <Text style={[styles.percentageText, { color: '#F97316' }]}>{workoutsPercent}%</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.progressCard}>
          <View style={styles.movementCardHeader}>
            <View style={[styles.progressIconBox, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="walk-outline" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.pulseContainer}>
              <Animated.View style={[styles.pulseDot, pulseStyle]} />
              <View style={styles.pulseDotCore} />
            </View>
          </View>
          <Text style={styles.progressCardTitle}>الحركة اليومية</Text>
          <Text style={styles.progressCardVal}>{activitySteps.toLocaleString('ar-EG')} خطوة</Text>
          <View style={styles.barContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${activityPercent}%`, backgroundColor: '#8B5CF6' }]} />
            </View>
            <Text style={[styles.percentageText, { color: '#8B5CF6' }]}>{activityPercent}%</Text>
          </View>
          <View style={styles.pedometerMetaRow}>
            <Text style={styles.pedometerMetaText}>{sourceName}</Text>
            <Text style={styles.pedometerMetaText}>• {syncTime}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};


// 5. WaterWidget
// ------------------------------------------------
interface WaterWidgetProps {
  consumedGlasses: number;
  targetGlasses: number;
  onAddWater: (amount: number) => void;
  onUndoWater: () => void;
}

export const WaterWidget: React.FC<WaterWidgetProps> = ({
  consumedGlasses = 0,
  targetGlasses = 8,
  onAddWater,
  onUndoWater
}) => {
  const fillHeight = useSharedValue(0);

  useEffect(() => {
    const percentage = Math.min((consumedGlasses / targetGlasses) * 100, 100);
    fillHeight.value = withTiming(percentage, { duration: 600, easing: Easing.bezier(0.4, 0, 0.2, 1) });
  }, [consumedGlasses, targetGlasses]);

  const animatedWaveStyle = useAnimatedStyle(() => ({
    height: `${fillHeight.value}%`
  }));

  const litersConsumed = (consumedGlasses * 0.25).toFixed(2);
  const litersTarget = (targetGlasses * 0.25).toFixed(1);

  return (
    <View style={styles.waterCard}>
      <Text style={styles.sectionTitle}>الترطيب اليومي</Text>
      
      <View style={styles.waterPanel}>
        <View style={styles.waveContainer}>
          <Animated.View style={[styles.waveFill, animatedWaveStyle]} />
          <View style={styles.waveOverlay}>
            <Text style={styles.waterVolumeText}>{litersConsumed} لتر</Text>
            <Text style={styles.waterVolumeSub}>الهدف: {litersTarget} لتر ({targetGlasses} أكواب)</Text>
          </View>
        </View>

        <View style={styles.waterControls}>
          <View style={styles.waterQuickGrid}>
            <TouchableOpacity style={styles.waterQuickBtn} onPress={() => onAddWater(0.4)}>
              <Text style={styles.waterQuickBtnText}>+100 مل</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.waterQuickBtn} onPress={() => onAddWater(1.0)}>
              <Text style={styles.waterQuickBtnText}>+250 مل</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.waterQuickBtn} onPress={() => onAddWater(2.0)}>
              <Text style={styles.waterQuickBtnText}>+500 مل</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.waterQuickBtn} onPress={() => onAddWater(4.0)}>
              <Text style={styles.waterQuickBtnText}>+1 لتر</Text>
            </TouchableOpacity>
          </View>

          {consumedGlasses > 0 && (
            <TouchableOpacity style={styles.waterUndoBtn} onPress={onUndoWater}>
              <Ionicons name="refresh-outline" size={14} color="#6B7280" />
              <Text style={styles.waterUndoBtnText}>تراجع عن آخر إضافة</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};


// 6. MealsWidget
// ------------------------------------------------
interface MealsWidgetProps {
  tasks: PlanTask[];
  onToggleTask: (id: string, completed: boolean) => void;
}

export const MealsWidget: React.FC<MealsWidgetProps> = ({
  tasks = [],
  onToggleTask
}) => {
  return (
    <View style={styles.journeyWrapper}>
      <Text style={styles.journeySectionTitle}>خريطة الوجبات اليومية</Text>
      {tasks.length > 0 ? (
        <View style={styles.journeyGroupCard}>
          {tasks.map((task, idx) => {
            const isCompleted = task.is_completed;
            const hourText = task.scheduled_time || '';

            return (
              <View key={task.id}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onToggleTask(task.id, !!isCompleted)}
                  style={[styles.journeyRow, isCompleted && styles.journeyRowCompleted]}
                >
                  <View style={styles.journeyContentWrap}>
                    <Text style={[styles.journeyMealName, isCompleted && styles.journeyMealNameCompleted]}>
                      {task.title || 'وجبة غذائية'}
                    </Text>
                    <Text style={styles.journeyMealDetail} numberOfLines={2}>
                      {task.content}
                    </Text>
                    {hourText ? <Text style={styles.journeyMealTime}>{hourText}</Text> : null}
                  </View>

                  <View style={styles.journeyCheckWrap}>
                    {isCompleted ? (
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={24} color="#D1D5DB" />
                    )}
                  </View>
                </TouchableOpacity>
                {idx < tasks.length - 1 && <View style={styles.journeyDivider} />}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="cafe-outline" size={28} color="#6B7280" />
          <Text style={styles.emptyTitle}>يوم راحة أو لا توجد وجبات موصوفة</Text>
        </View>
      )}
    </View>
  );
};


// 7. WorkoutWidget
// ------------------------------------------------
interface WorkoutWidgetProps {
  tasks: PlanTask[];
  onToggleTask: (id: string, completed: boolean) => void;
}

export const WorkoutWidget: React.FC<WorkoutWidgetProps> = ({
  tasks = [],
  onToggleTask
}) => {
  return (
    <View style={styles.journeyWrapper}>
      <Text style={styles.journeySectionTitle}>خريطة التمارين اليومية</Text>
      {tasks.length > 0 ? (
        <View style={styles.journeyGroupCard}>
          {tasks.map((task, idx) => {
            const isCompleted = task.is_completed;
            const duration = task.metadata?.duration || task.metadata?.default_duration || '15 دقيقة';

            return (
              <View key={task.id}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onToggleTask(task.id, !!isCompleted)}
                  style={[styles.journeyRow, isCompleted && styles.journeyRowCompleted]}
                >
                  <View style={styles.journeyContentWrap}>
                    <Text style={[styles.journeyMealName, isCompleted && styles.journeyMealNameCompleted]}>
                      🏋️ {task.title || 'تمرين رياضي'}
                    </Text>
                    <Text style={styles.journeyMealDetail} numberOfLines={2}>
                      {task.content}
                    </Text>
                    <Text style={styles.workoutDurationTag}>{duration}</Text>
                  </View>

                  <View style={styles.journeyCheckWrap}>
                    {isCompleted ? (
                      <Ionicons name="checkmark-circle" size={24} color="#F97316" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={24} color="#D1D5DB" />
                    )}
                  </View>
                </TouchableOpacity>
                {idx < tasks.length - 1 && <View style={styles.journeyDivider} />}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={28} color="#6B7280" />
          <Text style={styles.emptyTitle}>يوم راحة نشطة للتعافي البدني 🧘</Text>
        </View>
      )}
    </View>
  );
};


// 8. DoctorWidget
// ------------------------------------------------
interface DoctorWidgetProps {
  doctorName?: string;
  avatarUrl?: string | null;
  specialty?: string;
  isOnline?: boolean;
  lastReviewText?: string;
  onChatPress?: () => void;
  onBookPress?: () => void;
}

export const DoctorWidget: React.FC<DoctorWidgetProps> = ({
  doctorName,
  avatarUrl,
  specialty = 'أخصائي التغذية الخاص بك',
  isOnline = true,
  lastReviewText = 'آخر مراجعة للبرنامج منذ يومين',
  onChatPress,
  onBookPress
}) => {
  if (!doctorName) {
    return (
      <View style={styles.doctorFallbackCard}>
        <View style={styles.fallbackIconBox}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#6B7280" />
        </View>
        <Text style={styles.fallbackTitle}>بانتظار تعيين طبيبك المخصص</Text>
        <Text style={styles.fallbackSub}>سيتم تعيين طبيب تغذية للإشراف على نظامك الصحي ومراجعة قياسات الـ InBody قريباً.</Text>
        <TouchableOpacity style={styles.fallbackBtn} onPress={onBookPress}>
          <Text style={styles.fallbackBtnText}>احجز موعد استشارة الآن</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.doctorCard}>
      <Text style={styles.sectionTitle}>طاقمك الطبي</Text>
      <View style={styles.doctorContent}>
        <View style={styles.doctorAvatarBox}>
          {avatarUrl ? (
            <Animated.Image source={{ uri: avatarUrl }} style={styles.doctorAvatar} />
          ) : (
            <View style={styles.doctorAvatarPlaceholder}>
              <Text style={styles.doctorAvatarInitial}>{doctorName.charAt(0)}</Text>
            </View>
          )}
          {isOnline && <View style={styles.onlineBadge} />}
        </View>

        <View style={styles.doctorDetails}>
          <Text style={styles.doctorName}>د. {doctorName}</Text>
          <Text style={styles.doctorSpecialty}>{specialty}</Text>
          <View style={styles.lastReviewRow}>
            <Ionicons name="calendar-outline" size={12} color="#6B7280" />
            <Text style={styles.lastReviewText}>{lastReviewText}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.doctorChatBtn} onPress={onChatPress} activeOpacity={0.8}>
        <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
        <Text style={styles.doctorChatBtnText}>راسل الطبيب المعالج</Text>
      </TouchableOpacity>
    </View>
  );
};


// 9. TimelineWidget (Activity Feed)
// ------------------------------------------------
interface TimelineItemProps {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  icon: string;
  color: string;
  isLast?: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ title, subtitle, time, icon, color, isLast }) => {
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineIconBox, { backgroundColor: color }]}>
          <Ionicons name={icon as any} size={14} color="#FFFFFF" />
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineRight}>
        <View style={styles.timelineHeaderRow}>
          <Text style={styles.timelineTitle}>{title}</Text>
          <Text style={styles.timelineTime}>{time}</Text>
        </View>
        <Text style={styles.timelineSub}>{subtitle}</Text>
      </View>
    </View>
  );
};

interface TimelineWidgetProps {
  activities?: TimelineEvent[];
  onViewJourney?: () => void;
}

export const TimelineWidget: React.FC<TimelineWidgetProps> = ({
  activities = [],
  onViewJourney
}) => {
  return (
    <View style={styles.timelineSection}>
      <View style={styles.timelineHeader}>
        <Text style={styles.sectionTitle}>شريط النشاط اليومي</Text>
        <TouchableOpacity onPress={onViewJourney}>
          <Text style={styles.timelineLink}>السجل الكامل</Text>
        </TouchableOpacity>
      </View>

      {activities.length > 0 ? (
        <View style={styles.timelineFeedCard}>
          {activities.map((item, idx) => (
            <TimelineItem
              key={item.id}
              id={item.id}
              title={item.title}
              subtitle={item.subtitle}
              time={item.time}
              icon={item.icon}
              color={item.color}
              isLast={idx === activities.length - 1}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="pulse-outline" size={28} color="#6B7280" />
          <Text style={styles.emptyTitle}>لا توجد نشاطات مسجلة اليوم بعد</Text>
        </View>
      )}
    </View>
  );
};


// 10. MoreBottomSheetModal
// ------------------------------------------------
interface MoreBottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
}

export const MoreBottomSheetModal: React.FC<MoreBottomSheetModalProps> = ({
  visible,
  onClose,
  onNavigate
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.bottomSheetContent}>
          <View style={styles.bottomSheetHeader}>
            <View style={styles.bottomSheetKnob} />
            <Text style={styles.bottomSheetTitle}>الخدمات الصحية والمزيد</Text>
          </View>

          <View style={styles.moreOptionsGrid}>
            <TouchableOpacity style={styles.moreActionBtn} onPress={() => { onClose(); onNavigate('/inquiry/new'); }}>
              <View style={[styles.moreActionIcon, { backgroundColor: '#FDF2F8' }]}>
                <Ionicons name="document-text-outline" size={22} color="#EC4899" />
              </View>
              <Text style={styles.moreActionLabel}>رفع تحاليل طبية</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.moreActionBtn} onPress={() => { onClose(); onNavigate('/events'); }}>
              <View style={[styles.moreActionIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="calendar-outline" size={22} color="#3B82F6" />
              </View>
              <Text style={styles.moreActionLabel}>حجز موعد استشارة</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.moreActionBtn} onPress={() => { onClose(); onNavigate('/(tabs)/medical'); }}>
              <View style={[styles.moreActionIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="heart-outline" size={22} color="#10B981" />
              </View>
              <Text style={styles.moreActionLabel}>الملف الطبي</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.moreActionBtn} onPress={() => { onClose(); onNavigate('/family'); }}>
              <View style={[styles.moreActionIcon, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="people-outline" size={22} color="#8B5CF6" />
              </View>
              <Text style={styles.moreActionLabel}>أفراد العائلة</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.moreActionBtn} onPress={() => { onClose(); onNavigate('/subscriptions'); }}>
              <View style={[styles.moreActionIcon, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="card-outline" size={22} color="#F97316" />
              </View>
              <Text style={styles.moreActionLabel}>إدارة اشتراكي</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.moreActionBtn} onPress={() => { onClose(); onNavigate('/(tabs)/profile'); }}>
              <View style={[styles.moreActionIcon, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="settings-outline" size={22} color="#4B5563" />
              </View>
              <Text style={styles.moreActionLabel}>الإعدادات العامة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};


// STYLES
// ------------------------------------------------
const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#12362E',
    marginBottom: 12,
    textAlign: 'right',
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  scoreHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreInfo: {
    alignItems: 'flex-end',
  },
  scoreTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  improvementBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  improvementText: {
    fontSize: 11,
    color: '#10B981',
    marginRight: 4,
    fontWeight: 'bold',
  },
  scoreCircleContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
  scoreCircleInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  scoreMax: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: -2,
  },
  contributorsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  contributorItem: {
    width: '46%',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  contributorLabel: {
    fontSize: 11,
    color: '#4B5563',
    marginBottom: 4,
  },
  contributorBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  contributorBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  warningBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  warningText: {
    fontSize: 11,
    color: '#EF4444',
    marginRight: 6,
    textAlign: 'right',
    flex: 1,
  },
  detailsBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 6,
  },
  detailsBtnText: {
    fontSize: 13,
    color: AppColors.primary,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  coachCard: {
    backgroundColor: '#1E3A34',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  coachHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  coachTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  coachIconBox: {
    backgroundColor: '#FD761C',
    padding: 6,
    borderRadius: 10,
    marginLeft: 8,
  },
  coachTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  coachBadge: {
    fontSize: 10,
    color: '#FD761C',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: 'bold',
  },
  coachText: {
    fontSize: 13,
    color: '#E5E7EB',
    lineHeight: 20,
    textAlign: 'right',
    marginBottom: 16,
  },
  coachBtn: {
    flexDirection: 'row-reverse',
    backgroundColor: '#FD761C',
    borderRadius: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginRight: 8,
  },
  quickActionsContainer: {
    marginBottom: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
  },
  actionBtn: {
    alignItems: 'center',
    width: '18%',
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 10,
    color: '#4B5563',
    fontWeight: 'bold',
  },
  progressSection: {
    marginBottom: 20,
  },
  horizontalScroll: {
    paddingLeft: 12,
    flexDirection: 'row-reverse',
  },
  progressCard: {
    width: 156,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginLeft: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  movementCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pulseContainer: {
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    position: 'absolute',
  },
  pulseDotCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  progressIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressCardTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'right',
  },
  progressCardVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'right',
  },
  barContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
    marginLeft: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentageText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  pedometerMetaRow: {
    flexDirection: 'row-reverse',
    marginTop: 6,
    justifyContent: 'flex-start',
  },
  pedometerMetaText: {
    fontSize: 9,
    color: '#9CA3AF',
    marginLeft: 3,
  },
  waterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  waterPanel: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  waveContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#EFF6FF',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#93C5FD',
  },
  waveFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#3B82F6',
    opacity: 0.85,
  },
  waveOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  waterVolumeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  waterVolumeSub: {
    fontSize: 8,
    color: '#1E3A8A',
    opacity: 0.7,
    marginTop: 2,
    textAlign: 'center',
  },
  waterControls: {
    flex: 1,
    marginRight: 16,
    alignItems: 'flex-end',
  },
  waterQuickGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    width: '100%',
  },
  waterQuickBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 8,
    marginBottom: 8,
  },
  waterQuickBtnText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: 'bold',
  },
  waterUndoBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
  },
  waterUndoBtnText: {
    fontSize: 10,
    color: '#6B7280',
    marginRight: 4,
  },
  journeyWrapper: {
    marginBottom: 20,
  },
  journeySectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#12362E',
    marginBottom: 10,
    textAlign: 'right',
  },
  journeyGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  journeyRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 14,
  },
  journeyRowCompleted: {
    opacity: 0.65,
  },
  journeyContentWrap: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 12,
  },
  journeyMealName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  journeyMealNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  journeyMealDetail: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'right',
    lineHeight: 18,
  },
  journeyMealTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
  workoutDurationTag: {
    fontSize: 10,
    color: '#F97316',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    fontWeight: 'bold',
  },
  journeyCheckWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  journeyDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  emptyState: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  doctorFallbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fallbackIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  fallbackTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
  },
  fallbackSub: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  fallbackBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  fallbackBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  doctorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  doctorContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
  },
  doctorAvatarBox: {
    position: 'relative',
    marginLeft: 12,
  },
  doctorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  doctorAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1E3A34',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorAvatarInitial: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    left: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  doctorDetails: {
    flex: 1,
    alignItems: 'flex-end',
  },
  doctorName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  doctorSpecialty: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  lastReviewRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 6,
  },
  lastReviewText: {
    fontSize: 10,
    color: '#6B7280',
    marginRight: 4,
  },
  doctorChatBtn: {
    flexDirection: 'row-reverse',
    backgroundColor: '#1E3A34',
    borderRadius: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorChatBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginRight: 8,
  },
  timelineSection: {
    marginBottom: 20,
  },
  timelineHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timelineLink: {
    fontSize: 12,
    color: AppColors.primary,
    fontWeight: 'bold',
  },
  timelineFeedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  timelineItem: {
    flexDirection: 'row-reverse',
    marginBottom: 18,
  },
  timelineLeft: {
    alignItems: 'center',
    marginLeft: 12,
  },
  timelineIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#F3F4F6',
    marginTop: 4,
    marginBottom: -18,
  },
  timelineRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  timelineHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
  },
  timelineTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  timelineSub: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 16,
    textAlign: 'right',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    paddingTop: 14,
  },
  bottomSheetHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bottomSheetKnob: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  moreOptionsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  moreActionBtn: {
    width: '33.3%',
    alignItems: 'center',
    marginBottom: 24,
  },
  moreActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  moreActionLabel: {
    fontSize: 11,
    color: '#374151',
    fontWeight: 'bold',
    textAlign: 'center',
  }
});
