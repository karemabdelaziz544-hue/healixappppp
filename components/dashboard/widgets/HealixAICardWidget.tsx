import { Text } from '@/components/AppText';
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppColors } from '../../../constants/AppTheme';
import { SparklesIcon } from '../../../components/icons';

interface HealixAICardWidgetProps {
  recommendation?: string;
  onChatPress?: () => void;
}

export const HealixAICardWidget: React.FC<HealixAICardWidgetProps> = React.memo(({
  recommendation = 'جاري تحليل مؤشراتك الصحية لليوم وصياغة التوجيه المخصص...',
  onChatPress
}) => {
  return (
    <View style={styles.aiCoachCard}>
      <View style={styles.aiCoachHeader}>
        <View style={styles.aiCoachTag}>
          <SparklesIcon size={16} color={AppColors.white} />
          <Text style={styles.aiCoachTagText}>كوتش هيليكس الذكي</Text>
        </View>
        <Text style={styles.aiCoachBadge}>AI Coach</Text>
      </View>

      <Text style={styles.aiCoachMessage}>{recommendation}</Text>

      <TouchableOpacity style={styles.aiCoachPillBtn} onPress={onChatPress} activeOpacity={0.9}>
        <Text style={styles.aiCoachPillBtnText}>تحدث مع الكوتش الآن</Text>
      </TouchableOpacity>
    </View>
  );
});

HealixAICardWidget.displayName = 'HealixAICardWidget';

const styles = StyleSheet.create({
  aiCoachCard: {
    backgroundColor: AppColors.primary,
    borderRadius: 28,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  aiCoachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  aiCoachTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiCoachTagText: {
    fontSize: 14,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.white,
    writingDirection: 'rtl',
  },
  aiCoachBadge: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.white,
  },
  aiCoachMessage: {
    fontSize: 14,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.white,
    lineHeight: 22,
    marginBottom: 16,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  aiCoachPillBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: AppColors.white,
    paddingVertical: 11,
    borderRadius: 20,
    alignItems: 'center',
  },
  aiCoachPillBtnText: {
    color: AppColors.white,
    fontSize: 13,
    fontFamily: 'Thmanyah-Bold',
    writingDirection: 'rtl',
  },
});