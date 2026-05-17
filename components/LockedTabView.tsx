import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, AppRadius } from '../constants/AppTheme';

/**
 * LockedTabView — مكون موحد لرسائل الحظر في التابات المقفولة
 * ===========================================================
 * يُستخدم في chat, history, medical عند حظر الوصول حسب حالة العميل.
 * @param icon - اسم أيقونة Ionicons
 * @param iconColor - لون الأيقونة
 * @param iconBg - لون خلفية دائرة الأيقونة
 * @param title - العنوان الرئيسي
 * @param subtitle - النص التوضيحي
 * @param buttonText - نص الزرار (اختياري)
 * @param onPress - callback الزرار (اختياري)
 */

interface LockedTabViewProps {
  icon: string;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle: string;
  buttonText?: string;
  onPress?: () => void;
}

export default function LockedTabView({
  icon,
  iconColor = AppColors.accent,
  iconBg = AppColors.accentLight,
  title,
  subtitle,
  buttonText,
  onPress,
}: LockedTabViewProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* أيقونة كبيرة */}
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={icon as any} size={50} color={iconColor} />
        </View>

        {/* العنوان */}
        <Text style={styles.title}>{title}</Text>

        {/* التوضيح */}
        <Text style={styles.subtitle}>{subtitle}</Text>

        {/* الزرار (اختياري) */}
        {buttonText && onPress && (
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.85}
            onPress={onPress}
          >
            <Ionicons name="arrow-back" size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>{buttonText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 35,
  },
  iconBox: {
    width: 110,
    height: 110,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: AppColors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '600',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: AppRadius.xl,
    gap: 10,
    elevation: 3,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
