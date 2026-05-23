import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppColors, AppRadius, AppSpacing } from '../constants/AppTheme';

export default function ExpiredState() {
  const router = useRouter();
  // السهم دائماً يشير لليسار
  const arrowIcon = 'arrow-back';

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Ionicons name="lock-closed" size={60} color={AppColors.danger} />
      </View>
      <Text style={styles.title}>اشتراكك منتهي ⚠️</Text>
      <Text style={styles.subtitle}>
        عذراً، لا يمكنك الوصول لهذه الصفحة. يرجى تجديد اشتراكك لمتابعة رحلتك مع Healix.
      </Text>
      
      {/* ✅ يروح لـ /subscriptions مباشرة بدل /profile */}
      <TouchableOpacity style={styles.btn} onPress={() => router.push('/subscriptions')}>
        <Text style={styles.btnText}>تجديد الاشتراك الآن</Text>
        <Ionicons name={arrowIcon} size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: AppColors.background, padding: AppSpacing.xxxl },
  iconBox: { width: 100, height: 100, backgroundColor: AppColors.dangerLight, borderRadius: AppRadius.full, justifyContent: 'center', alignItems: 'center', marginBottom: AppSpacing.xl },
  title: { fontSize: 24, fontWeight: '900', color: AppColors.textPrimary, marginBottom: 10 },
  subtitle: { fontSize: 15, color: AppColors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 30, fontWeight: 'bold' },
  btn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: AppColors.primary, paddingHorizontal: 25, paddingVertical: 15, borderRadius: AppRadius.lg, gap: 10, elevation: 2 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});