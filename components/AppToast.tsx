/**
 * AppToast — نظام الإشعارات المخصص لـ Healix
 * ==============================================
 * استخدامه بدل Alert.alert() لرسائل النجاح والخطأ البسيطة.
 *
 * Usage (من أي مكان في التطبيق):
 *   import { showToast } from '@/components/AppToast';
 *
 *   showToast.success('تم الحفظ بنجاح!');
 *   showToast.error('فشل الإرسال، حاول مرة أخرى');
 *   showToast.info('لا يوجد اتصال بالإنترنت');
 *
 * ⚠️ تأكد من إضافة <AppToastProvider /> في الـ RootLayout
 */

import React from 'react';
import Toast, { BaseToast, ErrorToast, BaseToastProps } from 'react-native-toast-message';
import { AppColors, AppRadius, AppFontSize } from '../constants/AppTheme';

// ─── config مرئية مخصصة بألوان Healix ────────────────────────
const toastConfig = {
  success: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: AppColors.success,
        borderLeftWidth: 5,
        borderRadius: AppRadius.lg,
        backgroundColor: AppColors.surface,
        elevation: 8,
        shadowColor: AppColors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        minHeight: 60,
      }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{
        fontSize: AppFontSize.md,
        fontWeight: '700',
        color: AppColors.textPrimary,
        textAlign: 'right',
      }}
      text2Style={{
        fontSize: AppFontSize.sm,
        color: AppColors.textSecondary,
        textAlign: 'right',
      }}
    />
  ),

  error: (props: BaseToastProps) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: AppColors.danger,
        borderLeftWidth: 5,
        borderRadius: AppRadius.lg,
        backgroundColor: AppColors.surface,
        elevation: 8,
        shadowColor: AppColors.danger,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        minHeight: 60,
      }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{
        fontSize: AppFontSize.md,
        fontWeight: '700',
        color: AppColors.textPrimary,
        textAlign: 'right',
      }}
      text2Style={{
        fontSize: AppFontSize.sm,
        color: AppColors.textSecondary,
        textAlign: 'right',
      }}
    />
  ),

  info: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: AppColors.accent,
        borderLeftWidth: 5,
        borderRadius: AppRadius.lg,
        backgroundColor: AppColors.surface,
        elevation: 8,
        shadowColor: AppColors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        minHeight: 60,
      }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{
        fontSize: AppFontSize.md,
        fontWeight: '700',
        color: AppColors.textPrimary,
        textAlign: 'right',
      }}
      text2Style={{
        fontSize: AppFontSize.sm,
        color: AppColors.textSecondary,
        textAlign: 'right',
      }}
    />
  ),
};

// ─── Provider Component: ضعه في الـ RootLayout ────────────────
export function AppToastProvider() {
  return (
    <Toast
      config={toastConfig}
      position="top"
      topOffset={60}
      visibilityTime={3000}
      autoHide
    />
  );
}

// ─── Helper Functions: استخدمها بدل Alert.alert ───────────────
export const showToast = {
  success: (message: string, subtitle?: string) => {
    Toast.show({
      type: 'success',
      text1: message,
      text2: subtitle,
      visibilityTime: 3000,
    });
  },

  error: (message: string, subtitle?: string) => {
    Toast.show({
      type: 'error',
      text1: message,
      text2: subtitle,
      visibilityTime: 4000,
    });
  },

  info: (message: string, subtitle?: string) => {
    Toast.show({
      type: 'info',
      text1: message,
      text2: subtitle,
      visibilityTime: 3000,
    });
  },

  hide: () => Toast.hide(),
};
