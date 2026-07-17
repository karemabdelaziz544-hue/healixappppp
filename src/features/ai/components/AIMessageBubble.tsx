import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { AppColors, AppFontFamily, AppRadius, AppSpacing } from '@/constants/AppTheme';
import { AIMessage } from '../types';
import { formatMessageTime } from '../utils/formatMessage';
import { SlideInView } from '@/components/animations/SlideInView';

interface AIMessageBubbleProps {
  message: AIMessage;
}

export const AIMessageBubble = React.memo(({ message }: AIMessageBubbleProps) => {
  const isUser = message.role === 'user';
  const timeStr = formatMessageTime(message.createdAt);

  return (
    <SlideInView direction="up" delay={50} style={[styles.wrapper, isUser ? styles.userWrapper : styles.aiWrapper]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
          {message.content}
        </Text>
        <View style={styles.footer}>
          <Text style={[styles.timeText, isUser ? styles.userTimeText : styles.aiTimeText]}>
            {timeStr}
          </Text>
        </View>
      </View>
    </SlideInView>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: AppSpacing.md,
    flexDirection: 'row',
    width: '100%',
  },
  userWrapper: {
    justifyContent: 'flex-start', // RTL Aligned right
  },
  aiWrapper: {
    justifyContent: 'flex-end', // RTL Aligned left
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: AppColors.primary,
    borderTopLeftRadius: AppRadius.xl,
    borderTopRightRadius: AppRadius.xl,
    borderBottomLeftRadius: AppRadius.xl,
    borderBottomRightRadius: AppRadius.xs,
  },
  aiBubble: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: AppRadius.xl,
    borderTopRightRadius: AppRadius.xl,
    borderBottomLeftRadius: AppRadius.xs,
    borderBottomRightRadius: AppRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(42, 75, 70, 0.08)',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: AppFontFamily.regular,
    textAlign: 'left',
  },
  userText: {
    color: AppColors.surface,
  },
  aiText: {
    color: AppColors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    fontFamily: AppFontFamily.light,
  },
  userTimeText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  aiTimeText: {
    color: AppColors.textSecondary,
  },
});
