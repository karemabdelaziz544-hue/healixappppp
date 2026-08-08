import { Text } from '@/components/AppText';
import React from 'react';
import { View, StyleSheet, TouchableOpacity, I18nManager, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AppColors } from '../../../constants/AppTheme';
import { SparklesIcon, ChevronLeftIcon } from '../../../components/icons';
import { useEntitlements } from '../../../src/features/subscriptions/useEntitlements';
import { HELI_BRAND } from '../../../src/features/ai/constants/heliBrand';

interface HealixAICardWidgetProps {
  recommendation?: string;
  onChatPress?: () => void;
}

export const HealixAICardWidget: React.FC<HealixAICardWidgetProps> = React.memo(({
  recommendation = HELI_BRAND.homeWidget.description,
  onChatPress
}) => {
  const router = useRouter();
  const { canUse, userRole } = useEntitlements();
  const handleChat = onChatPress || (() => router.push('/healix-ai' as any));

  const isPremium = userRole === 'admin' || userRole === 'doctor' || canUse('AI_CHAT');

  // 🔒 Locked Heli Card with light background
  if (!isPremium) {
    return (
      <View style={styles.aiCardLockedContainer}>
        {/* Lock Badge */}
        <View style={styles.lockBadgeHeader}>
          <SparklesIcon size={12} color="#FFFFFF" />
          <Text style={styles.lockBadgeTextHeader}>Premium</Text>
        </View>

        <View style={styles.lockedCardContent}>
          <View style={styles.lockedIconBox}>
            <Image
              source={HELI_BRAND.ui.avatarImage}
              style={styles.heliAvatarImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.lockedTextWrap}>
            <Text style={styles.lockedTitle}>{HELI_BRAND.homeWidget.lockedTitle}</Text>
            <Text style={styles.lockedSubtitle}>
              {HELI_BRAND.homeWidget.lockedSubtitle}
            </Text>
            <TouchableOpacity
              style={styles.upgradeBtnOrange}
              onPress={() => router.push('/subscriptions?returnUrl=/(tabs)&featureId=AI_CHAT' as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.upgradeBtnOrangeText}>{HELI_BRAND.homeWidget.cta}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ✨ Active Heli Card for Premium Tier
  return (
    <View style={styles.aiCard}>
      <View style={styles.topRow}>
        <View style={styles.aiHeaderGroup}>
          <View style={styles.iconCircleGradient}>
            <Image
              source={HELI_BRAND.ui.avatarImage}
              style={styles.heliAvatarImage}
              resizeMode="cover"
            />
          </View>
          <View>
            <Text style={styles.aiTitle}>{HELI_BRAND.homeWidget.title}</Text>
            <Text style={styles.aiSubtitle}>{HELI_BRAND.homeWidget.subtitle}</Text>
          </View>
        </View>
        <View style={styles.recommendationBadge}>
          <Text style={styles.recommendationBadgeText}>توصية اليوم</Text>
        </View>
      </View>

      <Text style={styles.recommendationText}>"{recommendation}"</Text>

      <TouchableOpacity style={styles.ctaButton} onPress={handleChat} activeOpacity={0.85}>
        <Text style={styles.ctaButtonText}>{HELI_BRAND.homeWidget.cta}</Text>
        <ChevronLeftIcon size={16} color={AppColors.white} />
      </TouchableOpacity>
    </View>
  );
});

HealixAICardWidget.displayName = 'HealixAICardWidget';

const styles = StyleSheet.create({
  aiCard: {
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiHeaderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircleGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(242, 110, 17, 0.25)',
    backgroundColor: '#F9FAF8',
  },

  lockedIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(242, 110, 17, 0.25)',
    backgroundColor: '#F9FAF8',
  },
  heliAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  aiTitle: {
    fontSize: 16,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  aiSubtitle: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    marginTop: 1,
  },
  recommendationBadge: {
    backgroundColor: 'rgba(242, 110, 17, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendationBadgeText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Bold',
    color: '#F26E11',
  },
  recommendationText: {
    fontSize: 13,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 16,
    writingDirection: 'rtl',
  },
  ctaButton: {
    backgroundColor: AppColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaButtonText: {
    color: AppColors.white,
    fontSize: 13,
    fontFamily: 'Thmanyah-Bold',
    writingDirection: 'rtl',
  },
  aiCardLockedContainer: {
    backgroundColor: AppColors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    position: 'relative',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  lockBadgeHeader: {
    position: 'absolute',
    top: 16,
    left: I18nManager.isRTL ? undefined : 16,
    right: I18nManager.isRTL ? 16 : undefined,
    backgroundColor: '#F26E11',
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
  lockedTextWrap: {
    flex: 1,
  },
  lockedTitle: {
    fontSize: 18,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    marginBottom: 6,
    writingDirection: 'rtl',
  },
  lockedSubtitle: {
    fontSize: 13,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
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
});