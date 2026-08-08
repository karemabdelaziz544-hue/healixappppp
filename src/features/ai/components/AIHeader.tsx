import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/AppText';
import { AppColors, AppFontFamily, AppSpacing } from '@/constants/AppTheme';
import { Strings } from '@/constants/strings';
import { SparklesIcon } from '@/components/icons';
import { HELI_BRAND } from '../constants/heliBrand';

interface AIHeaderProps {
  onBack: () => void;
}

export const AIHeader = React.memo(({ onBack }: AIHeaderProps) => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.rightSection}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityLabel={Strings.common.back}>
          <Ionicons name="arrow-forward" size={24} color={AppColors.primary} />
        </TouchableOpacity>
        <View style={styles.iconCircleHeader}>
          <Image source={HELI_BRAND.ui.avatarImage} style={styles.avatarHeaderImage} resizeMode="cover" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{HELI_BRAND.chatScreen.headerTitle}</Text>
          <Text style={styles.subtitle}>{HELI_BRAND.chatScreen.headerSubtitle}</Text>
        </View>
      </View>
      <View style={styles.leftSection}>
        <View style={styles.aiStatusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>متصل</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.background,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42, 75, 70, 0.08)',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  backButton: {
    padding: AppSpacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleHeader: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(242, 110, 17, 0.25)',
  },
  avatarHeaderImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 20,
    fontFamily: AppFontFamily.bold,
    color: AppColors.primary,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: AppFontFamily.regular,
    color: AppColors.textSecondary,
    marginTop: 2,
    textAlign: 'left',
  },
  leftSection: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppColors.success,
  },
  statusText: {
    fontSize: 10,
    fontFamily: AppFontFamily.medium,
    color: AppColors.success,
  },
});
