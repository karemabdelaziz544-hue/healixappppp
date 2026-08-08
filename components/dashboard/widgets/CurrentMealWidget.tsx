import { Text } from '@/components/AppText';
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AppColors } from '../../../constants/AppTheme';
import type { PlanTask } from '../../../src/types';
import { MealIcon, CheckmarkIcon, ChevronDownIcon, ChevronUpIcon, InfoIcon, SparklesIcon } from '../../../components/icons';
import { useEntitlements } from '../../../src/features/subscriptions/useEntitlements';

interface CurrentMealWidgetProps {
  tasks: PlanTask[];
  expandedMealId: string | null;
  onSelectMeal: (id: string) => void;
  onToggleTask: (taskId: string, currentStatus: boolean) => void;
}

export const CurrentMealWidget: React.FC<CurrentMealWidgetProps> = React.memo(({
  tasks = [],
  expandedMealId,
  onSelectMeal,
  onToggleTask
}) => {
  const router = useRouter();
  const { canUse, userRole } = useEntitlements();
  const [showDetails, setShowDetails] = useState(true);

  const isPremium = canUse('NUTRITION_PLAN') || userRole === 'admin' || userRole === 'doctor';

  // 🔒 If user is NOT subscribed yet, show locked teaser card matching stitch_healix_free_dashboard_design
  if (!isPremium) {
    return (
      <View style={styles.mealsContainer}>
        <LinearGradient
          colors={['#2A4D44', '#3A6D61']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.lockedCardGradient}
        >
          {/* Lock Badge */}
          <View style={styles.lockBadgeHeader}>
            <SparklesIcon size={12} color="#FFFFFF" />
            <Text style={styles.lockBadgeTextHeader}>Premium</Text>
          </View>

          <View style={styles.lockedCardContent}>
            <View style={styles.lockedIconBox}>
              <MealIcon size={22} color="#FFFFFF" />
            </View>
            <View style={styles.lockedTextWrap}>
              <Text style={styles.lockedTitle}>نظام وجباتك المخصص جاهز</Text>
              <Text style={styles.lockedSubtitle}>
                اشترك الآن لعرض خطة التغذية اليومية التي أعدها طبيبك خصيصًا لك.
              </Text>
              <TouchableOpacity
                style={styles.upgradeBtnOrange}
                onPress={() => router.push('/subscriptions?returnUrl=/(tabs)&featureId=NUTRITION_PLAN' as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.upgradeBtnOrangeText}>اشترك الآن</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Check if today is a Free Day
  const isFreeDay = tasks.some(t =>
    t.task_type === 'free_day' ||
    (t.metadata as any)?.is_free_day === true ||
    (t.day_name && t.day_name.includes('فري')) ||
    (t.content && t.content.includes('فري'))
  );

  if (isFreeDay) {
    return (
      <View style={styles.mealsContainer}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.titleWithIcon}>
            <View style={styles.iconBox}>
              <MealIcon size={20} color="#F26E11" />
            </View>
            <Text style={styles.sectionTitle}>وجبات اليوم</Text>
          </View>
          <View style={styles.freeBadgePill}>
            <Text style={styles.freeBadgePillText}>يوم فري 🍕🎉</Text>
          </View>
        </View>

        <View style={styles.freeDayCard}>
          <View style={styles.freeDayIconWrap}>
            <MealIcon size={28} color="#F26E11" />
          </View>
          <Text style={styles.freeDayTitle}>استمتع بيومك المفتوح اليوم 🎉</Text>
          <Text style={styles.freeDaySubtitle}>
            اليوم هو يومك المفتوح المخصص من طبيبك المعالج. يمكنك تناول وجباتك المفضلة باعتدال والاستمتاع باليوم.
          </Text>
        </View>
      </View>
    );
  }

  // Filter real nutrition meals from database tasks
  const meals = tasks.filter(t => t.task_type !== 'workout');

  // Empty state if no meals assigned today in database
  if (meals.length === 0) {
    return (
      <View style={styles.mealsContainer}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.titleWithIcon}>
            <View style={styles.iconBox}>
              <MealIcon size={20} color="#F26E11" />
            </View>
            <Text style={styles.sectionTitle}>وجبات اليوم</Text>
          </View>
        </View>
        <View style={styles.emptyWrap}>
          <MealIcon size={28} color={AppColors.outline} />
          <Text style={styles.emptyTitle}>لا توجد خطة تغذية موصوفة اليوم</Text>
          <Text style={styles.emptySub}>تواصل مع طبيبك أو الكوتش لإضافة وجباتك اليومية.</Text>
        </View>
      </View>
    );
  }

  const activeMealIndex = expandedMealId
    ? meals.findIndex(m => m.id === expandedMealId)
    : 0;

  const currentMeal = meals[activeMealIndex >= 0 ? activeMealIndex : 0];
  const completedCount = meals.filter(m => m.is_completed).length;

  return (
    <View style={styles.mealsContainer}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.titleWithIcon}>
          <View style={styles.iconBox}>
            <MealIcon size={20} color="#F26E11" />
          </View>
          <Text style={styles.sectionTitle}>وجبات اليوم</Text>
        </View>
        <View style={styles.progressPill}>
          <Text style={styles.progressPillText}>
            إنجاز {completedCount} من {meals.length}
          </Text>
        </View>
      </View>

      {/* Horizontal Meal Chips */}
      <View style={styles.tabsRow}>
        {meals.map((meal, index) => {
          const isSelected = meal.id === currentMeal?.id;
          const chipLabel = meal.title?.includes('الإفطار') ? 'الإفطار' :
                            meal.title?.includes('الغداء') ? 'الغداء' :
                            meal.title?.includes('العشاء') ? 'العشاء' :
                            meal.title?.includes('سناك') ? 'سناك' : `وجبة ${index + 1}`;

          return (
            <TouchableOpacity
              key={meal.id}
              style={[
                styles.tabChip,
                isSelected && styles.tabChipActive,
                meal.is_completed && styles.tabChipDone,
              ]}
              onPress={() => onSelectMeal(meal.id)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabChipText,
                  isSelected && styles.tabChipTextActive,
                  meal.is_completed && styles.tabChipTextDone,
                ]}
              >
                {chipLabel}
              </Text>
              {meal.is_completed && <CheckmarkIcon size={12} color={AppColors.success} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active Meal Card */}
      {currentMeal && (
        <View style={styles.activeMealCard}>
          <TouchableOpacity
            style={styles.mealMainRow}
            onPress={() => onToggleTask(currentMeal.id, currentMeal.is_completed)}
            activeOpacity={0.85}
          >
            <View style={styles.mealTitleWrap}>
              <View
                style={[
                  styles.checkCircle,
                  currentMeal.is_completed && styles.checkCircleDone,
                ]}
              >
                {currentMeal.is_completed && (
                  <CheckmarkIcon size={14} color={AppColors.white} />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.mealTitleText,
                    currentMeal.is_completed && styles.mealTitleDoneText,
                  ]}
                >
                  {currentMeal.title}
                </Text>
                {currentMeal.scheduled_time && (
                  <Text style={styles.mealTimeText}>الوقت الموصى به: {currentMeal.scheduled_time}</Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.expandIconBtn}
              onPress={() => setShowDetails(!showDetails)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {showDetails ? (
                <ChevronUpIcon size={20} color={AppColors.primary} />
              ) : (
                <ChevronDownIcon size={20} color={AppColors.primary} />
              )}
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Details Collapsible */}
          {showDetails && (
            <View style={styles.mealDetailsSection}>
              {currentMeal.content && (
                <View style={styles.detailRow}>
                  <InfoIcon size={16} color="#F26E11" />
                  <Text style={styles.detailText}>
                    <Text style={{ fontFamily: 'Thmanyah-Bold' }}>المكونات والكميات: </Text>
                    {currentMeal.content}
                  </Text>
                </View>
              )}

              {(currentMeal.metadata as any)?.notes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>
                    ملاحظة الطبيب: {(currentMeal.metadata as any).notes}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
});

CurrentMealWidget.displayName = 'CurrentMealWidget';

const styles = StyleSheet.create({
  mealsContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  lockedCardGradient: {
    borderRadius: 24,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  lockBadgeHeader: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
  },
  lockBadgeTextHeader: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Bold',
    color: '#FFFFFF',
  },
  lockedCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginTop: 20,
  },
  lockedIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTextWrap: {
    flex: 1,
  },
  lockedTitle: {
    fontSize: 18,
    fontFamily: 'Thmanyah-Bold',
    color: '#FFFFFF',
    marginBottom: 6,
    writingDirection: 'rtl',
  },
  lockedSubtitle: {
    fontSize: 13,
    fontFamily: 'Thmanyah-Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 19,
    marginBottom: 16,
    writingDirection: 'rtl',
  },
  upgradeBtnOrange: {
    backgroundColor: '#F26E11',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBtnOrangeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Thmanyah-Bold',
    writingDirection: 'rtl',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(242, 110, 17, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  lockBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  lockBadgeText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Bold',
    color: '#FFFFFF',
  },
  progressPill: {
    backgroundColor: AppColors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressPillText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.primary,
  },
  freeBadgePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeBadgePillText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Bold',
    color: '#D97706',
  },
  freeDayCard: {
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  freeDayCardLocked: {
    backgroundColor: '#FEF3C7',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  freeDayIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  freeDayTitle: {
    fontSize: 16,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  freeDaySubtitle: {
    fontSize: 13,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    textAlign: 'center',
    lineHeight: 20,
  },
  upgradeBtn: {
    backgroundColor: '#D97706',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  upgradeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Thmanyah-Bold',
  },
  emptyWrap: {
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  emptySub: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    textAlign: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppColors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabChipActive: {
    backgroundColor: AppColors.surfaceContainerLowest,
    borderColor: AppColors.primary,
  },
  tabChipDone: {
    borderColor: AppColors.success,
  },
  tabChipText: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
  },
  tabChipTextActive: {
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  tabChipTextDone: {
    color: AppColors.success,
  },
  activeMealCard: {
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  mealMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: AppColors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: AppColors.success,
    borderColor: AppColors.success,
  },
  mealTitleText: {
    fontSize: 15,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  mealTitleDoneText: {
    textDecorationLine: 'line-through',
    color: AppColors.outline,
  },
  mealTimeText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    marginTop: 2,
  },
  expandIconBtn: {
    padding: 6,
  },
  mealDetailsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderSubtle,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.primary,
    flex: 1,
    lineHeight: 18,
  },
  notesBox: {
    backgroundColor: AppColors.surfaceContainerLow,
    padding: 10,
    borderRadius: 12,
  },
  notesText: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
  },
});