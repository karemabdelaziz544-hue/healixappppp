import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/AppText';
import { AppColors, AppFontFamily, AppRadius, AppSpacing } from '@/constants/AppTheme';
import { SUGGESTED_QUESTIONS } from '../constants/suggestions';

interface AISuggestionChipProps {
  text: string;
  onPress: (text: string) => void;
}

export const AISuggestionChip = React.memo(({ text, onPress }: AISuggestionChipProps) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.chip}
      onPress={() => onPress(text)}
    >
      <Text style={styles.chipText}>{text}</Text>
    </TouchableOpacity>
  );
});

interface AISuggestionListProps {
  onSelect: (text: string) => void;
}

export const AISuggestionList = React.memo(({ onSelect }: AISuggestionListProps) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {SUGGESTED_QUESTIONS.map((question, index) => (
        <AISuggestionChip
          key={index}
          text={question}
          onPress={onSelect}
        />
      ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.sm,
    gap: AppSpacing.sm,
  },
  chip: {
    backgroundColor: AppColors.surface,
    borderColor: 'rgba(42, 75, 70, 0.1)',
    borderWidth: 1,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.sm,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  chipText: {
    color: AppColors.primary,
    fontFamily: AppFontFamily.medium,
    fontSize: 13,
  },
});
