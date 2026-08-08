import { Text } from '@/components/AppText';
import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEntitlements } from '../features/subscriptions/useEntitlements';
import { FEATURE_REGISTRY, FeatureId } from '../features/subscriptions/featureRegistry';
import { AppColors, AppRadius, AppFontFamily } from '../../constants/AppTheme';
import { FadeInView } from '../../components/animations/FadeInView';
import { AnimatedButton } from '../../components/animations/AnimatedButton';
import { HELI_BRAND } from '../features/ai/constants/heliBrand';

interface PremiumGateProps {
  featureId: FeatureId;
  children?: React.ReactNode;
  onUpgrade?: () => void;
  customTitle?: string;
  screenName?: string;
  returnUrl?: string;
}

export const PremiumGate: React.FC<PremiumGateProps> = ({
  featureId,
  children,
  onUpgrade,
  customTitle,
  screenName,
  returnUrl,
}) => {
  const router = useRouter();
  const { getFeatureState, logEvent } = useEntitlements();
  const state = getFeatureState(featureId);
  const meta = FEATURE_REGISTRY[featureId];

  useEffect(() => {
    if (state === 'unlocked') {
      logEvent('FEATURE_VIEWED', featureId, screenName);
    } else if (state === 'locked' || state === 'coming_soon') {
      logEvent('FEATURE_BLOCKED', featureId, screenName);
    }
  }, [state, featureId, screenName, logEvent]);

  if (state === 'unlocked') {
    return <>{children}</>;
  }

  if (state === 'hidden' || state === 'disabled') {
    return null;
  }

  const handleUpgradePress = () => {
    logEvent('UPGRADE_CLICKED', featureId, screenName);
    if (onUpgrade) {
      onUpgrade();
    } else {
      const targetRoute = returnUrl || meta?.route || '/(tabs)';
      router.push(`/subscriptions?returnUrl=${encodeURIComponent(targetRoute)}&featureId=${featureId}` as any);
    }
  };

  const isAIFeature = featureId.startsWith('AI_');
  const displayTitle = customTitle || (isAIFeature ? HELI_BRAND.premiumGate.title : meta?.title) || 'ميزة مقفولة';
  const displayDesc = (isAIFeature ? HELI_BRAND.premiumGate.subtitle : meta?.description) || 'اشترك في إحدى باقات هيليكس للحصول على وصول كامل لهذه الميزة.';
  const iconName = (meta?.icon as any) || 'sparkles';
  const badgeText = (isAIFeature ? HELI_BRAND.premiumGate.badgeText : meta?.badgeText) || (state === 'coming_soon' ? 'قريباً ⏳' : 'ميزة بريميوم ⭐');
  const ctaText = (isAIFeature ? HELI_BRAND.premiumGate.ctaText : meta?.ctaText) || 'ترقية الاشتراك الآن 🔒';
  const benefits = (isAIFeature ? HELI_BRAND.premiumGate.benefits : meta?.benefits) || [
    'وصول كامل وشامل لجميع الميزات المتقدمة',
    'متابعة شخصية ودعم طبي متواصل من طبيبك',
  ];

  return (
    <FadeInView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {/* Header Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name={iconName} size={38} color={AppColors.primary} />
            </View>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          </View>

          {/* Title & Description */}
          <Text style={styles.title}>{displayTitle}</Text>
          <Text style={styles.description}>{displayDesc}</Text>

          {/* Benefits List */}
          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsHeader}>ماذا ستحصل عند الترقية؟</Text>
            {benefits.map((benefit: string, index: number) => (
              <View key={index} style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          {/* Post-Subscribe Expectations Timeline */}
          <View style={styles.timelineContainer}>
            <Text style={styles.timelineHeader}>ماذا يحدث بعد الاشتراك؟</Text>
            <View style={styles.timelineSteps}>
              <View style={styles.stepItem}>
                <View style={styles.stepBadge}><Text style={styles.stepNumber}>1</Text></View>
                <Text style={styles.stepText}>اشترك في الباقة المناسبة</Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepBadge}><Text style={styles.stepNumber}>2</Text></View>
                <Text style={styles.stepText}>مراجعة الدفع والتأكيد</Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepBadge}><Text style={styles.stepNumber}>3</Text></View>
                <Text style={styles.stepText}>إعداد وتجهيز النظام الطبي</Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepBadge}><Text style={styles.stepNumber}>4</Text></View>
                <Text style={styles.stepText}>تفعيل الميزات فورياً والعودة للشاشة</Text>
              </View>
            </View>
          </View>

          {/* Action Button */}
          {state === 'coming_soon' ? (
            <View style={styles.comingSoonBox}>
              <Text style={styles.comingSoonText}>هذه الميزة تحت التطوير وستتوفّر قريباً</Text>
            </View>
          ) : (
            <AnimatedButton style={styles.upgradeBtn} onPress={handleUpgradePress}>
              <Ionicons name="star" size={18} color="#FFF" style={{ marginLeft: 6 }} />
              <Text style={styles.upgradeBtnText}>{ctaText}</Text>
            </AnimatedButton>
          )}
        </View>
      </ScrollView>
    </FadeInView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    padding: 16,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D1FAE5',
  },
  badgeContainer: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: -12,
  },
  badgeText: {
    fontFamily: AppFontFamily.bold,
    fontSize: 12,
    color: '#D97706',
  },
  title: {
    fontFamily: AppFontFamily.bold,
    fontSize: 20,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontFamily: AppFontFamily.medium,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: AppRadius.md,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  benefitsHeader: {
    fontFamily: AppFontFamily.bold,
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
    textAlign: 'right',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontFamily: AppFontFamily.medium,
    fontSize: 13,
    color: '#374151',
    flex: 1,
    textAlign: 'right',
  },
  timelineContainer: {
    width: '100%',
    backgroundColor: '#EFF6FF',
    borderRadius: AppRadius.md,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  timelineHeader: {
    fontFamily: AppFontFamily.bold,
    fontSize: 13,
    color: '#1E40AF',
    marginBottom: 10,
    textAlign: 'right',
  },
  timelineSteps: {
    gap: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontFamily: AppFontFamily.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  stepText: {
    fontFamily: AppFontFamily.medium,
    fontSize: 12,
    color: '#1E3A8A',
    flex: 1,
    textAlign: 'right',
  },
  upgradeBtn: {
    width: '100%',
    height: 52,
    backgroundColor: AppColors.primary,
    borderRadius: AppRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  upgradeBtnText: {
    fontFamily: AppFontFamily.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  comingSoonBox: {
    width: '100%',
    padding: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: AppRadius.md,
    alignItems: 'center',
  },
  comingSoonText: {
    fontFamily: AppFontFamily.medium,
    fontSize: 14,
    color: '#6B7280',
  },
});
