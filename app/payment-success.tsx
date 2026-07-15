import { Text } from '@/components/AppText';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SubscriptionConfig } from '../constants/subscriptionConfig';
import { AnimatedButton } from '../components/animations/AnimatedButton';
import { SlideInView } from '../components/animations/SlideInView';

const C = {
  primary: '#12362e',
  primaryContainer: '#2A4D44',
  brandOrange: '#F26E11',
  success: '#10B981',
  background: '#F9F8F3',
  cardSurface: '#FFFFFF',
  onSurface: '#121c2a',
  onSurfaceVariant: '#414846',
  outline: '#717975',
  outlineVariant: '#c1c8c4',
  surfaceContainerLow: '#eff4ff',
  warningBg: '#FEF3C7',
  warningText: '#92400E',
};

const CARD_SHADOW = {
  shadowColor: '#1F2937',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 20,
  elevation: 3,
};

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const totalPrice = params.totalPrice ? parseFloat(params.totalPrice as string) : 0;
  const paymentType = params.paymentType || 'new';

  const submittedRequestId = params.invoiceId as string | undefined;
  const today = new Date();
  const reqDateStr = today.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

  // Custom text based on process type
  const getSuccessMessage = () => {
    switch (paymentType) {
      case 'upgrade':
        return 'تم إرسال طلب ترقية الباقة بنجاح!';
      case 'downgrade':
        return 'تم إرسال طلب تعديل الباقة بنجاح!';
      case 'renewal':
        return 'تم إرسال طلب تجديد الاشتراك بنجاح!';
      default:
        return 'تم إرسال طلب الاشتراك بنجاح!';
    }
  };

  const getSuccessDesc = () => {
    switch (paymentType) {
      case 'upgrade':
        return 'نشكرك على إتمام العملية. سنقوم بمراجعة الطلب وزيادة مقاعد عائلتك فوراً بعد التحقق.';
      case 'downgrade':
        return 'تم استلام طلب التعديل. سنقوم بمراجعة الطلب واستبعاد الأعضاء المحددين بعد التأكيد.';
      case 'renewal':
        return 'تم استلام طلب تجديد اشتراكك بنجاح. سيتم تمديد صلاحية باقتك قريباً.';
      default:
        return 'نشكرك على إتمام عملية التحويل. طلبك حالياً تحت المراجعة من قبل الإدارة لتفعيل الباقة.';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <SlideInView delay={100} direction="up" style={styles.successIconCircle}>
          <Ionicons name="checkmark-circle" size={80} color={C.success} />
        </SlideInView>

        {/* Message */}
        <SlideInView delay={200} direction="up">
          <Text style={styles.successTitle}>{getSuccessMessage()}</Text>
          <Text style={styles.successDesc}>{getSuccessDesc()}</Text>
        </SlideInView>

        {/* Details Card */}
        <SlideInView delay={300} direction="up" style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>رقم الطلب</Text>
            <Text style={styles.detailValue}>{submittedRequestId || '—'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>تاريخ الإرسال</Text>
            <Text style={styles.detailValue}>{reqDateStr}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>المبلغ الإجمالي</Text>
            <Text style={styles.detailValue}>{SubscriptionConfig.formatPrice(totalPrice)}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>الحالة</Text>
            <View style={styles.pendingStatusBadge}>
              <Text style={styles.pendingStatusText}>قيد المراجعة</Text>
            </View>
          </View>
        </SlideInView>

        {/* Expected Duration Note */}
        <SlideInView delay={400} direction="up" style={styles.noteBox}>
          <Ionicons name="time-outline" size={20} color={C.primary} />
          <View style={styles.noteTextBox}>
            <Text style={styles.noteTitle}>مدة المراجعة المتوقعة</Text>
            <Text style={styles.noteDesc}>
              يتم مراجعة الطلبات وتحديث الحسابات خلال أقل من 24 ساعة. سيتم إرسال إشعار فوري لك بمجرد التفعيل.
            </Text>
          </View>
        </SlideInView>
      </View>

      {/* Back Button Sticky at Bottom */}
      <View style={[styles.bottomAction, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        <AnimatedButton 
          style={styles.backBtn} 
          onPress={() => router.replace('/subscriptions')}
        >
          <Text style={styles.backBtnText}>العودة إلى اشتراكي</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </AnimatedButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  
  // Success Icon
  successIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 24, ...CARD_SHADOW },
  
  // Title / Desc
  successTitle: { fontSize: 22, fontWeight: '800', color: C.primary, marginBottom: 12, textAlign: 'center' },
  successDesc: { fontSize: 13, fontWeight: '600', color: C.onSurfaceVariant, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16, marginBottom: 28 },

  // Details Card
  detailsCard: { width: '100%', backgroundColor: C.cardSurface, borderRadius: 24, padding: 20, marginBottom: 28, ...CARD_SHADOW },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  detailLabel: { fontSize: 13, fontWeight: '500', color: C.onSurfaceVariant },
  detailValue: { fontSize: 14, fontWeight: '700', color: C.primary },
  detailDivider: { height: 1, backgroundColor: C.background },
  pendingStatusBadge: { backgroundColor: C.warningBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pendingStatusText: { fontSize: 11, fontWeight: '700', color: C.warningText },

  // Note Box
  noteBox: { flexDirection: 'row', backgroundColor: C.surfaceContainerLow, borderRadius: 18, padding: 16, gap: 12, width: '100%' },
  noteTextBox: { flex: 1, alignItems: 'flex-end' },
  noteTitle: { fontSize: 13, fontWeight: '800', color: C.primary, marginBottom: 4 },
  noteDesc: { fontSize: 11, fontWeight: '600', color: C.primaryContainer, textAlign: 'right', lineHeight: 16 },

  // Bottom action
  bottomAction: { position: 'absolute', bottom: 0, start: 0, end: 0, backgroundColor: C.background, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.outlineVariant },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primaryContainer, paddingVertical: 16, borderRadius: 16, ...CARD_SHADOW },
  backBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
});
