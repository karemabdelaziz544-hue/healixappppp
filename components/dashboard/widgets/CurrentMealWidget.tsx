import { Text } from '@/components/AppText';
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppColors } from '../../../constants/AppTheme';
import type { PlanTask } from '../../../src/types';
import { MealIcon, CheckmarkIcon, ChevronDownIcon, ChevronUpIcon, InfoIcon } from '../../../components/icons';

interface CurrentMealWidgetProps {
  tasks: PlanTask[];
  expandedMealId: string | null;
  onSelectMeal: (id: string) => void;
  onToggleTask: (taskId: string, currentStatus: boolean) => void;
}

export const CurrentMealWidget: React.FC<CurrentMealWidgetProps> = React.memo(({
  tasks,
  expandedMealId,
  onSelectMeal,
  onToggleTask
}) => {
  const [showDetails, setShowDetails] = useState(false);

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
          <Text style={styles.sectionTitle}>خطة التغذية اليومية</Text>
          <View style={styles.freeBadgePill}>
            <Text style={styles.freeBadgePillText}>يوم فري 🍕🎉</Text>
          </View>
        </View>

        <View style={styles.freeDayCard}>
          <View style={styles.freeDayIconWrap}>
            <MealIcon size={32} color={AppColors.accent} />
          </View>
          <Text style={styles.freeDayTitle}>استمتع بيومك المفتوح اليوم! 🎉🍕</Text>
          <Text style={styles.freeDaySubtitle}>
            اليوم هو يومك المفتوح المخصص من طبيبك المعالج. يمكنك تناول وجباتك المفضلة باعتدال والاستمتاع باليوم استعداداً للتفوق والالتزام في الأيام القادمة.
          </Text>
        </View>
      </View>
    );
  }

  // Filter nutrition meals from tasks list
  const meals = tasks.filter(t => t.task_type !== 'workout');

  // Handle empty state if no nutrition plan assigned today
  if (meals.length === 0) {
    return (
      <View style={styles.mealsContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>خطة التغذية اليومية</Text>
          <Text style={styles.mealsHeaderBadge}>0 من 0</Text>
        </View>

        <View style={styles.emptyCard}>
          <MealIcon size={32} color={AppColors.outline} />
          <Text style={styles.emptyTitle}>لم يتم تسجيل وجبات اليوم بعد</Text>
          <Text style={styles.emptySubtitle}>سيقوم طبيبك المعالج بإنشاء وتحديد وجباتك الغذائية فور إعداد الخطة.</Text>
        </View>
      </View>
    );
  }

  // Helper to translate meal names to proper Arabic
  const getArabicMealTitle = (meal: PlanTask, index: number): string => {
    const raw = (meal.title || meal.task_type || '').trim().toLowerCase();

    if (raw.includes('breakfast') || raw.includes('إفطار') || raw.includes('فطار')) return 'الإفطار';
    if (raw.includes('morning_snack') || raw.includes('morning snack')) return 'وجبة خفيفة صباحية';
    if (raw.includes('lunch') || raw.includes('غداء')) return 'الغداء';
    if (raw.includes('afternoon_snack') || raw.includes('afternoon snack')) return 'وجبة خفيفة مسائية';
    if (raw.includes('dinner') || raw.includes('عشاء')) return 'العشاء';
    if (raw.includes('snack') || raw.includes('سناك') || raw.includes('خفيفة')) return 'وجبة خفيفة';

    if (meal.title && /[\u0600-\u06FF]/.test(meal.title)) {
      return meal.title;
    }

    return `وجبة ${index + 1}`;
  };

  const activeMeal = meals.find(m => m.id === expandedMealId) || meals.find(m => !m.is_completed) || meals[0];
  const activeMealIndex = meals.findIndex(m => m.id === activeMeal?.id);
  const activeMealTitle = getArabicMealTitle(activeMeal, activeMealIndex >= 0 ? activeMealIndex : 0);

  // Parse food items string
  const foodItems = activeMeal.content
    ? activeMeal.content.split(/\r?\n|•|,/).map(s => s.trim()).filter(Boolean)
    : [];

  const completedCount = meals.filter(m => m.is_completed).length;

  return (
    <View style={styles.mealsContainer}>
      {/* Header Row */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>خطة التغذية اليومية</Text>
        <Text style={styles.mealsHeaderBadge}>تم تناول {completedCount} من {meals.length}</Text>
      </View>

      {/* Expanded Active Meal Card */}
      <View style={styles.expandedMealCard}>
        <View style={styles.mealCardTopHeader}>
          <View style={styles.mealCardBadgeRow}>
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>الوجبة الحالية</Text>
            </View>
            {activeMeal.scheduled_time && (
              <Text style={styles.mealCardTime}>{activeMeal.scheduled_time}</Text>
            )}
          </View>

          <TouchableOpacity onPress={() => setShowDetails(!showDetails)} activeOpacity={0.7}>
            {showDetails ? (
              <ChevronUpIcon size={22} color={AppColors.primary} />
            ) : (
              <ChevronDownIcon size={22} color={AppColors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.expandedMealTitle}>{activeMealTitle}</Text>

        {/* Real Food Items List */}
        {foodItems.length > 0 && (
          <View style={styles.foodListContainer}>
            <Text style={styles.foodListSubtitle}>محتويات الوجبة</Text>
            {foodItems.map((item, idx) => (
              <View key={idx} style={styles.foodBulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.foodBulletText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons Row */}
        <View style={styles.mealActionsRow}>
          <TouchableOpacity
            style={[styles.completeMealBtn, activeMeal.is_completed && styles.completeMealBtnDone]}
            onPress={() => onToggleTask(activeMeal.id, activeMeal.is_completed)}
            activeOpacity={0.9}
          >
            {activeMeal.is_completed && <CheckmarkIcon size={16} color={AppColors.white} />}
            <Text style={styles.completeMealBtnText}>
              {activeMeal.is_completed ? 'تم تناول الوجبة بنجاح' : 'تم تناول الوجبة'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailsOutlineBtn}
            onPress={() => setShowDetails(!showDetails)}
            activeOpacity={0.8}
          >
            <Text style={styles.detailsOutlineBtnText}>{showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}</Text>
          </TouchableOpacity>
        </View>

        {showDetails && (
          <View style={styles.mealDetailsBox}>
            <View style={styles.detailsBoxHeader}>
              <InfoIcon size={16} color={AppColors.primary} />
              <Text style={styles.detailsBoxTitle}>توجيه التغذية الطبية:</Text>
            </View>
            <Text style={styles.detailsBoxText}>
              التزم بالمعايير والكميات المحددة للحفاظ على استقرار مستوى السكر والتركيز طوال اليوم.
            </Text>
          </View>
        )}
      </View>

      {/* Vertical Progress Timeline */}
      <View style={styles.verticalTimelineWrap}>
        {meals.map((meal, index) => {
          const isSelected = meal.id === activeMeal.id;
          const isDone = meal.is_completed;
          const title = getArabicMealTitle(meal, index);

          return (
            <TouchableOpacity
              key={meal.id}
              style={[styles.timelineRow, !isDone && !isSelected && styles.timelineRowDim]}
              onPress={() => onSelectMeal(meal.id)}
              activeOpacity={0.8}
            >
              <View style={styles.timelineDotWrap}>
                {isDone ? (
                  <View style={styles.timelineDotDone}>
                    <CheckmarkIcon size={10} color={AppColors.white} />
                  </View>
                ) : isSelected ? (
                  <View style={styles.timelineDotActive} />
                ) : (
                  <View style={styles.timelineDotPending} />
                )}
                {index < meals.length - 1 && <View style={styles.timelineLine} />}
              </View>

              <View style={styles.timelineContent}>
                <Text style={[styles.timelineTitle, isDone && styles.timelineTitleDone]}>{title}</Text>
                {meal.scheduled_time && (
                  <Text style={styles.timelineTime}>{meal.scheduled_time}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

CurrentMealWidget.displayName = 'CurrentMealWidget';

const styles = StyleSheet.create({
  mealsContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  mealsHeaderBadge: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  emptyCard: {
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 18,
  },
  expandedMealCard: {
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 28,
    padding: 20,
    borderRightWidth: 4,
    borderRightColor: AppColors.primary,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 14,
  },
  mealCardTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mealCardBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentBadge: {
    backgroundColor: AppColors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 10,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    writingDirection: 'rtl',
  },
  mealCardTime: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
  },
  expandedMealTitle: {
    fontSize: 20,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    alignSelf: 'stretch',
    marginBottom: 10,
  },
  foodListContainer: {
    backgroundColor: AppColors.surfaceContainerLow,
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    alignSelf: 'stretch',
  },
  foodListSubtitle: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    alignSelf: 'stretch',
    marginBottom: 8,
  },
  foodBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
    gap: 8,
    marginBottom: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppColors.orange,
  },
  foodBulletText: {
    fontSize: 13,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  mealActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  detailsOutlineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.outlineVariant,
  },
  detailsOutlineBtnText: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  completeMealBtn: {
    flex: 1,
    backgroundColor: AppColors.primary,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  completeMealBtnDone: {
    backgroundColor: AppColors.orange,
  },
  completeMealBtnText: {
    color: AppColors.white,
    fontSize: 13,
    fontFamily: 'Thmanyah-Bold',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  mealDetailsBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderSubtle,
    alignSelf: 'stretch',
  },
  detailsBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    marginBottom: 4,
    alignSelf: 'stretch',
  },
  detailsBoxTitle: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  detailsBoxText: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    textAlign: 'right',
    writingDirection: 'rtl',
    alignSelf: 'stretch',
    lineHeight: 16,
  },
  verticalTimelineWrap: {
    paddingRight: 6,
    gap: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    alignSelf: 'stretch',
  },
  timelineRowDim: {
    opacity: 0.5,
  },
  timelineDotWrap: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timelineDotDone: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: AppColors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotActive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: AppColors.primary,
    backgroundColor: AppColors.surface,
  },
  timelineDotPending: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: AppColors.outline,
    backgroundColor: AppColors.surface,
  },
  timelineLine: {
    position: 'absolute',
    top: 18,
    bottom: -14,
    width: 1,
    alignSelf: 'center',
    backgroundColor: AppColors.outlineVariant,
  },
  timelineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  timelineTitleDone: {
    textDecorationLine: 'line-through',
    color: AppColors.outline,
  },
  timelineTime: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  freeBadgePill: {
    backgroundColor: AppColors.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.accentBorder,
  },
  freeBadgePillText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.accent,
  },
  freeDayCard: {
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: AppColors.accentBorder,
    gap: 8,
  },
  freeDayIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: AppColors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  freeDayTitle: {
    fontSize: 16,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  freeDaySubtitle: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 18,
  },
});