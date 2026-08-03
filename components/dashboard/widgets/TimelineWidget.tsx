import { Text } from '@/components/AppText';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppColors } from '../../../constants/AppTheme';
import type { TimelineEvent } from '../../../src/types/digitalHealthRecord';
import { SparklesIcon } from '../../../components/icons';

interface TimelineWidgetProps {
  timeline: TimelineEvent[];
}

export const TimelineWidget: React.FC<TimelineWidgetProps> = React.memo(({ timeline }) => {
  const displayEvents = timeline.slice(0, 6);

  if (displayEvents.length === 0) {
    return (
      <View style={styles.timelineCard}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>سجل اليوم Live</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>مباشر</Text>
          </View>
        </View>
        <View style={styles.emptyFeed}>
          <SparklesIcon size={22} color={AppColors.accent} />
          <Text style={styles.emptyTitle}>لم يتم توثيق أنشطة بعد اليوم</Text>
          <Text style={styles.emptySub}>سجل مياه أو وجبة لبدء التوثيق اللحظي</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.timelineCard}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>سجل اليوم Live</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>مباشر</Text>
        </View>
      </View>

      <View style={styles.timelineFeedWrap}>
        {displayEvents.map((item: TimelineEvent, index: number) => {
          const isLast = index === displayEvents.length - 1;
          const isOrange = item.color === AppColors.accent || item.type === 'AIEvent' || item.type === 'AchievementEvent';
          const nodeColor = isOrange ? AppColors.accent : AppColors.primary;

          return (
            <View key={`${item.id || 'event'}-${index}`} style={styles.feedRow}>
              {/* Right Column: Node & Line */}
              <View style={styles.feedNodeCol}>
                <View style={[styles.feedDotOuter, { borderColor: nodeColor }]}>
                  <View style={[styles.feedDotInner, { backgroundColor: nodeColor }]} />
                </View>
                {!isLast && <View style={styles.feedLine} />}
              </View>

              {/* Content Column */}
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
    borderRadius: 28,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppColors.accent,
  },
  liveBadgeText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.accent,
  },
  emptyFeed: {
    backgroundColor: AppColors.surfaceContainerLow,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 13,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  emptySub: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
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
    paddingBottom: 14,
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
    fontSize: 10,
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
