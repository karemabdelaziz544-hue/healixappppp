import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppColors, AppRadius, AppSpacing } from '../../constants/AppTheme';
import { SubscriptionConfig } from '../../constants/subscriptionConfig';

/**
 * PaywallView — شاشة الباقات للعملاء الجدد (Lead)
 * ===================================================
 * تعرض هيدر ترحيبي + تفاصيل الباقة + زر الاشتراك
 * تُستخدم في الداشبورد وبقية التابات المقفولة
 */
export default function PaywallView() {
  const router = useRouter();

  const features = [
    { icon: 'nutrition', label: 'خطة غذائية مخصصة', color: '#10B981' },
    { icon: 'barbell', label: 'تمارين رياضية يومية', color: '#3B82F6' },
    { icon: 'chatbubbles', label: 'تواصل مباشر مع الكوتش', color: '#8B5CF6' },
    { icon: 'pulse', label: 'تتبع InBody والتحاليل', color: AppColors.accent },
    { icon: 'people', label: 'دعم حسابات العائلة', color: '#EC4899' },
    { icon: 'analytics', label: 'أرشيف كامل لرحلتك', color: '#14B8A6' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* هيدر ترحيبي */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconBox}>
            <Ionicons name="sparkles" size={40} color={AppColors.accent} />
          </View>
          <Text style={styles.heroTitle}>انضم الآن وابدأ{'\n'}رحلة التغيير مع Healix</Text>
          <Text style={styles.heroSubtitle}>
            خطة صحية شاملة مصممة خصيصاً لك — تغذية، تمارين، ومتابعة طبية مستمرة
          </Text>
        </View>

        {/* كارت الباقة */}
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <View style={styles.planBadge}>
              <Ionicons name="diamond" size={14} color="#FFF" />
              <Text style={styles.planBadgeText}>الأكثر طلباً</Text>
            </View>
            <Text style={styles.planName}>{SubscriptionConfig.PLAN_NAME}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>تبدأ من</Text>
            <View style={styles.priceValueRow}>
              <Text style={styles.priceValue}>{SubscriptionConfig.BASE_PRICE}</Text>
              <Text style={styles.priceCurrency}>{SubscriptionConfig.CURRENCY}/شهر</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* مميزات الباقة */}
          <View style={styles.featuresList}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Text style={styles.featureLabel}>{feature.label}</Text>
                <View style={[styles.featureIconBox, { backgroundColor: `${feature.color}15` }]}>
                  <Ionicons name={feature.icon as any} size={18} color={feature.color} />
                </View>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* معلومة إضافية */}
          <View style={styles.extraInfoRow}>
            <Text style={styles.extraInfoText}>
              + {SubscriptionConfig.formatPrice(SubscriptionConfig.PER_MEMBER)} لكل فرد إضافي من العائلة
            </Text>
            <Ionicons name="people-outline" size={16} color={AppColors.textSecondary} />
          </View>
        </View>

        {/* زر الاشتراك */}
        <TouchableOpacity
          style={styles.subscribeBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/subscriptions')}
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" />
          <Text style={styles.subscribeBtnText}>ابدأ الاشتراك الآن</Text>
          <Ionicons name="rocket" size={20} color="#FFF" />
        </TouchableOpacity>

        {/* ملاحظة أسفلية */}
        <Text style={styles.footerNote}>
          الدفع عن طريق {SubscriptionConfig.PAYMENT_METHOD} — التفعيل فوري بعد التأكد من التحويل
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 120,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  heroIconBox: {
    width: 80,
    height: 80,
    borderRadius: 25,
    backgroundColor: AppColors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: AppColors.textPrimary,
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600',
    paddingHorizontal: 10,
  },

  // Plan Card
  planCard: {
    backgroundColor: '#FFF',
    borderRadius: 30,
    padding: 25,
    marginBottom: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    borderWidth: 1.5,
    borderColor: AppColors.accentBorder,
  },
  planHeader: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  planBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: AppColors.accent,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
    marginBottom: 10,
  },
  planBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 22,
    fontWeight: '900',
    color: AppColors.textPrimary,
  },

  // Price
  priceRow: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  priceValueRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 6,
  },
  priceValue: {
    fontSize: 42,
    fontWeight: '900',
    color: AppColors.primary,
  },
  priceCurrency: {
    fontSize: 16,
    fontWeight: 'bold',
    color: AppColors.textSecondary,
  },

  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 18,
  },

  // Features
  featuresList: {
    gap: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  featureLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Extra Info
  extraInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  extraInfoText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    fontWeight: 'bold',
  },

  // Subscribe Button
  subscribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 18,
    borderRadius: AppRadius.xl,
    gap: 10,
    elevation: 5,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    marginBottom: 15,
  },
  subscribeBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },

  // Footer
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: AppColors.textMuted,
    fontWeight: '600',
    lineHeight: 20,
  },
});
