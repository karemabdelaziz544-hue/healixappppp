import { Text } from '@/components/AppText';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppColors } from '../../../constants/AppTheme';
import type { TimelineEvent } from '../../../src/types/digitalHealthRecord';

interface TimelineWidgetProps {
  timeline?: TimelineEvent[];
}

export const TimelineWidget: React.FC<TimelineWidgetProps> = React.memo(({ timeline = [] }) => {
  const defaultEvents: TimelineEvent[] = [
    {
      id: 'evt-1',
      title: 'تم رفع تحليل جديد',
      subtitle: 'تم رفع نتائج تحاليل الدم الشاملة',
      time: '16:10',
      type: 'DoctorEvent',
      icon: 'file-text',
      color: AppColors.primary,
    },
    {
      id: 'evt-2',
      title: 'تم إنهاء تمرين الصدر',
      subtitle: 'تم إنهاء تمرين الصدر بالدمبلز بنجاح',
      time: '14:00',
      type: 'WorkoutEvent',
      icon: 'fitness',
      color: '#F26E11',
    },
    {
      id: 'evt-3',
      title: 'تم تسجيل كوب ماء',
      subtitle: 'تم إضافة كوب ماء (٢٥٠مل)',
      time: '11:20',
      type: 'WaterEvent',
      icon: 'water',
      color: '#3B82F6',
    },
    {
      id: 'evt-4',
      title: 'تم تأكيد وجبة الإفطار',
      subtitle: 'تم إكمال وجبة الإفطار الصحية بنجاح',
      time: '09:00',
      type: 'MealEvent',
      icon: 'restaurant',
      color: '#10B981',
    }
  ];

  const displayEvents = timeline.length > 0 ? timeline.slice(0, 6) : defaultEvents;

  return (
    <View style={styles.timelineCard}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>سجل اليوم</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>مباشر</Text>
        </View>
      </View>

      <View style={styles.timelineFeedWrap}>
        {displayEvents.map((item: TimelineEvent, index: number) => {
          const isLast = index === displayEvents.length - 1;
          const nodeColor = item.color || (index % 2 === 0 ? AppColors.primary : '#F26E11');

          return (
            <View key={`${item.id || 'event'}-${index}`} style={styles.feedRow}>
              {/* Timeline Dot & Line */}
              <View style={styles.feedNodeCol}>
                <View style={[styles.feedDotOuter, { borderColor: nodeColor }]}>
                  <View style={[styles.feedDotInner, { backgroundColor: nodeColor }]} />
                </View>
                {!isLast && <View style={styles.feedLine} />}
              </View>

              {/* Event Content */}
              <View style={styles.feedContentCol}>
                <View style={styles.feedTitleRow}>
                  <Text style={styles.feedTitle}>{item.title}</Text>
                  <Text style={styles.feedTimeText}>{item.time || 'الآن'}</Text>
                </View>
                {item.subtitle ? (
                  <Text style={styles.feedSub}>{item.subtitle}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
});

TimelineWidget.displayName = 'TimelineWidget';

const styles = StyleSheet.create({
  timelineCard: {
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Bold',
    color: '#10B981',
  },
  timelineFeedWrap: {
    marginTop: 4,
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 48,
  },
  feedNodeCol: {
    alignItems: 'center',
    width: 20,
    position: 'relative',
  },
  feedDotOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    backgroundColor: AppColors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  feedDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  feedLine: {
    flex: 1,
    width: 2,
    backgroundColor: AppColors.borderSubtle,
    marginTop: 2,
  },
  feedContentCol: {
    flex: 1,
    paddingBottom: 16,
  },
  feedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  feedTitle: {
    fontSize: 13,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    flex: 1,
    textAlign: 'right',
  },
  feedTimeText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
  },
  feedSub: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    marginTop: 2,
    textAlign: 'right',
    lineHeight: 16,
  },
});
