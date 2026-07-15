import { Text } from '@/components/AppText';
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { SubscriptionAccessState } from '../../src/features/subscriptions/subscription.types';

interface SubscriptionPendingViewProps {
  rejected?: boolean;
  state?: SubscriptionAccessState;
}

export function SubscriptionPendingView({ rejected = false, state }: SubscriptionPendingViewProps) {
  const router = useRouter();

  const getTitle = () => {
    if (rejected) return 'يحتاج طلب الدفع إلى تعديل';
    switch (state) {
      case 'upgrade_pending':
        return 'طلب ترقية الباقة تحت المراجعة';
      case 'downgrade_pending':
        return 'طلب تعديل الباقة تحت المراجعة';
      case 'renewing':
        return 'طلب تجديد الاشتراك تحت المراجعة';
      default:
        return 'طلب الدفع تحت المراجعة';
    }
  };

  const getDesc = () => {
    if (rejected) return 'راجع سبب الرفض وأعد رفع الإيصال الصحيح لتبدأ رحلتك.';
    switch (state) {
      case 'upgrade_pending':
        return 'نقوم حالياً بمراجعة عملية ترقية المقاعد وتأكيد الإيصال. لن يتأثر حسابك الحالي أثناء المراجعة.';
      case 'downgrade_pending':
        return 'نقوم حالياً بمراجعة طلب تقليل عدد المقاعد وتحديث حسابات العائلة.';
      case 'renewing':
        return 'طلب التجديد تحت المراجعة حالياً. سيتم تمديد فترة صلاحية الباقة فور التأكيد.';
      default:
        return 'سنرسل إشعاراً فور مراجعة الإيصال وتفعيل الاشتراك لتتمكن من الوصول لكافة الميزات.';
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons 
        name={rejected ? 'close-circle-outline' : 'time-outline'} 
        size={58} 
        color={rejected ? '#BA1A1A' : '#92400E'} 
      />
      <Text style={styles.title}>{getTitle()}</Text>
      <Text style={styles.text}>{getDesc()}</Text>
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => router.push('/subscriptions')}
      >
        <Text style={styles.buttonText}>عرض حالة الاشتراك</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({ 
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F9F8F3' },
  title: { fontSize: 21, fontWeight: '800', color: '#12362e', marginTop: 16, textAlign: 'center' },
  text: { fontSize: 15, color: '#414846', textAlign: 'center', lineHeight: 24, marginTop: 10 },
  button: { marginTop: 24, backgroundColor: '#12362e', paddingVertical: 13, paddingHorizontal: 20, borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: '700' } 
});
