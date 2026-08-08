import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from '@/components/AppText';
import { AppColors, AppFontFamily, AppRadius, AppSpacing } from '@/constants/AppTheme';
import { SparklesIcon } from '@/components/icons';
import { useFamily } from '@/src/context/FamilyContext';
import { HELI_BRAND } from '../constants/heliBrand';

export const AIWelcome = React.memo(() => {
  const { currentProfile } = useFamily();
  const firstName = currentProfile?.full_name?.split(' ')[0] || '';

  return (
    <View style={styles.cardContainer}>
      <View style={styles.iconCircle}>
        <Image source={HELI_BRAND.ui.avatarImage} style={styles.avatarWelcomeImage} resizeMode="cover" />
      </View>

      <Text style={styles.title}>
        {firstName ? `أهلاً بك، ${firstName} 👋` : HELI_BRAND.chatScreen.welcomeGreeting}
      </Text>
      <Text style={styles.subtitle}>
        {HELI_BRAND.chatScreen.welcomeNamePrefix} {HELI_BRAND.chatScreen.welcomeSubtitle}
      </Text>
      <Text style={styles.descriptionHeader}>{HELI_BRAND.chatScreen.welcomeDescription}</Text>

      <View style={styles.capabilitiesList}>
        {HELI_BRAND.chatScreen.welcomeCapabilities.map((capability, index) => (
          <View key={index} style={styles.capabilityRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.capabilityText}>{capability}</Text>
          </View>
        ))}
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
    overflow: 'hidden',
    marginBottom: AppSpacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(242, 110, 17, 0.25)',
    backgroundColor: '#F9FAF8',
  },
  avatarWelcomeImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
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
    fontFamily: AppFontFamily.bold,
    color: '#F26E11',
    textAlign: 'center',
    marginBottom: AppSpacing.md,
  },
  descriptionHeader: {
    fontSize: 13,
    fontFamily: AppFontFamily.medium,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: AppSpacing.md,
  },
  capabilitiesList: {
    width: '100%',
    gap: 8,
    marginTop: 4,
  },
  capabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(42, 77, 68, 0.04)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F26E11',
  },
  capabilityText: {
    fontSize: 13,
    fontFamily: AppFontFamily.medium,
    color: AppColors.primary,
    writingDirection: 'rtl',
  },
});
