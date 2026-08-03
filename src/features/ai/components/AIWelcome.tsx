import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/AppText';
import { AppColors, AppFontFamily, AppRadius, AppSpacing } from '@/constants/AppTheme';

import { useFamily } from '@/src/context/FamilyContext';

export const AIWelcome = React.memo(() => {
  const { currentProfile } = useFamily();
  const firstName = currentProfile?.full_name?.split(' ')[0] || '';

  return (
    <View style={styles.cardContainer}>
      <View style={styles.iconCircle}>
        <Ionicons name="sparkles" size={32} color={AppColors.accent} />
      </View>
      <Text style={styles.title}>{firstName ? `أهلاً بك، ${firstName} 👋` : 'مرحبًا بك في Healix AI'}</Text>
      <Text style={styles.subtitle}>أنا مساعدك الصحي الذكي</Text>
      <Text style={styles.description}>
        أستطيع مساعدتك في الإجابة عن أسئلتك المتعلقة بالتغذية، والسعرات الحرارية، والأنظمة الغذائية، والعادات الصحية، وكل ما يساعدك على تحقيق أهدافك الصحية.
      </Text>
      
      <View style={styles.divider} />
      
      <View style={styles.featuresRow}>
        <View style={styles.featureItem}>
          <Ionicons name="restaurant-outline" size={18} color={AppColors.primary} />
          <Text style={styles.featureText}>أنظمة غذائية</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="flame-outline" size={18} color={AppColors.primary} />
          <Text style={styles.featureText}>سعرات حرارية</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="heart-outline" size={18} color={AppColors.primary} />
          <Text style={styles.featureText}>عادات صحية</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.xxl,
    padding: AppSpacing.xxl,
    alignItems: 'center',
    marginHorizontal: AppSpacing.lg,
    marginTop: AppSpacing.xl,
    marginBottom: AppSpacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(42, 75, 70, 0.06)',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppColors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AppSpacing.lg,
    borderWidth: 1,
    borderColor: AppColors.accentBorder,
  },
  title: {
    fontSize: 20,
    fontFamily: AppFontFamily.bold,
    color: AppColors.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: AppFontFamily.medium,
    color: AppColors.accent,
    textAlign: 'center',
    marginBottom: AppSpacing.md,
  },
  description: {
    fontSize: 14,
    fontFamily: AppFontFamily.regular,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: AppSpacing.sm,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: AppColors.borderLight,
    marginVertical: AppSpacing.xl,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppColors.primaryLight,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppRadius.lg,
  },
  featureText: {
    fontSize: 12,
    fontFamily: AppFontFamily.medium,
    color: AppColors.primary,
  },
});
