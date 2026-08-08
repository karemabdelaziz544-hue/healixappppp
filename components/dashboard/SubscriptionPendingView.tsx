import { Text } from '@/components/AppText';
import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { SubscriptionAccessState } from '../../src/features/subscriptions/subscription.types';
import { useFamily } from '../../src/context/FamilyContext';
import { AppColors, AppRadius, AppFontFamily } from '../../constants/AppTheme';
import { FadeInView } from '../animations/FadeInView';
import { AnimatedButton } from '../animations/AnimatedButton';

interface SubscriptionPendingViewProps {
  rejected?: boolean;
  state?: SubscriptionAccessState;
  requestId?: string;
  planName?: string;
}

export function SubscriptionPendingView({
  rejected = false,
  state,
  requestId,
  planName = 'الباقة الفردية',
}: SubscriptionPendingViewProps) {
  const router = useRouter();
  const { refreshFamily, loadingFamily } = useFamily();

  const getTitle = () => {
    if (rejected) return 'يحتاج طلب الدفع إلى تعديل ⚠️';
    switch (state) {
      case 'upgrade_pending':
        return 'طلب ترقية الباقة تحت المراجعة ⏳';
      case 'downgrade_pending':
        return 'طلب تعديل الباقة تحت المراجعة ⏳';
      case 'renewing':
        return 'طلب تجديد الاشتراك تحت المراجعة ⏳';
      default:
        return 'تم استلام طلب الاشتراك بنجاح ✅';
    }
  };

  const getDesc = () => {
    if (rejected) return 'تم رفض الإيصال المرفق. يرجى مراجعة سبب الرفض وإعادة رفع إيصال صحيح لتفعيل حسابك.';
    switch (state) {
      case 'upgrade_pending':
        return 'نقوم حالياً بمراجعة ترقية المقاعد وتأكيد التحويل. لن يتأثر حسابك الحالي أثناء المراجعة.';
      case 'downgrade_pending':
        return 'نقوم حالياً بمراجعة طلب تعديل المقاعد وتحديث حسابات العائلة.';
      case 'renewing':
        return 'طلب التجديد تحت المراجعة حالياً. سيتم تمديد صلاحية الباقة فور التأكيد بواسطة الفريق.';
      default:
        return 'نقوم حالياً بمراجعة الإيصال وتأكيد العملية بواسطة الفريق الطبي (عادةً خلال وقت قصير).';
    }
  };

  return (
    <FadeInView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, rejected && { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
            <Ionicons
              name={rejected ? 'close-circle-outline' : 'time-outline'}
              size={48}
              color={rejected ? '#DC2626' : '#D97706'}
            />
          </View>

          <View style={[styles.statusBadge, rejected && { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.statusBadgeText, rejected && { color: '#DC2626' }]}>
              {rejected ? 'مرفوض ❌' : 'قيد المراجعة ⏳'}
            </Text>
          </View>

          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.desc}>{getDesc()}</Text>

          {/* Details Box */}
          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailValue}>{planName}</Text>
              <Text style={styles.detailLabel}>الباقة المختارة:</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailValue}>{new Date().toLocaleDateString('ar-EG')}</Text>
              <Text style={styles.detailLabel}>تاريخ الإرسال:</Text>
            </View>
            {requestId && (
              <View style={styles.detailRow}>
                <Text style={styles.detailValue}>{requestId.slice(0, 8)}</Text>
                <Text style={styles.detailLabel}>رقم الطلب:</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={[styles.detailValue, { color: rejected ? '#DC2626' : '#D97706' }]}>
                {rejected ? 'مرفوض' : 'في الانتظار'}
              </Text>
              <Text style={styles.detailLabel}>حالة الطلب:</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <AnimatedButton
              style={styles.refreshBtn}
              onPress={() => refreshFamily()}
              disabled={loadingFamily}
            >
              <Ionicons name="refresh-outline" size={18} color="#111827" style={{ marginLeft: 6 }} />
              <Text style={styles.refreshBtnText}>تحديث حالة الطلب</Text>
            </AnimatedButton>

            <AnimatedButton
              style={styles.supportBtn}
              onPress={() => router.push('/chat')}
            >
              <Ionicons name="chatbubbles-outline" size={18} color="#FFF" style={{ marginLeft: 6 }} />
              <Text style={styles.supportBtnText}>التواصل مع الدعم الفني</Text>
            </AnimatedButton>
          </View>
        </View>
      </ScrollView>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F3' },
  scrollContent: { padding: 20, alignItems: 'center', justifyContent: 'center', minHeight: '100%' },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusBadgeText: {
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
  desc: {
    fontFamily: AppFontFamily.medium,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: AppRadius.md,
    padding: 16,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontFamily: AppFontFamily.medium,
    fontSize: 13,
    color: '#6B7280',
  },
  detailValue: {
    fontFamily: AppFontFamily.bold,
    fontSize: 13,
    color: '#111827',
  },
  actionsContainer: {
    width: '100%',
    gap: 10,
  },
  refreshBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: AppRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtnText: {
    fontFamily: AppFontFamily.bold,
    fontSize: 14,
    color: '#111827',
  },
  supportBtn: {
    width: '100%',
    height: 48,
    backgroundColor: AppColors.primary,
    borderRadius: AppRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportBtnText: {
    fontFamily: AppFontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
