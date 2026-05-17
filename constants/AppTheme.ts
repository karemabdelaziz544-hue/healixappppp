/**
 * Healix Design System — AppTheme
 * ================================
 * مصدر واحد لكل ألوان وأبعاد التصميم في التطبيق.
 * استخدم هذا الملف بدل الـ hex الـ hardcoded في كل مكان.
 *
 * Usage:
 *   import { AppColors, AppRadius, AppSpacing } from '@/constants/AppTheme';
 *   style={{ backgroundColor: AppColors.primary }}
 */

export const AppColors = {
  // ألوان رئيسية
  primary: '#2A4B46',
  primaryLight: '#E8F3F1',
  accent: '#F97316',
  accentLight: '#FFF7ED',
  accentBorder: '#FFEDD5',

  // خلفيات
  background: '#F9F6F0',
  surface: '#FFFFFF',
  inputBg: '#F3F4F6',

  // نصوص
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  // حدود
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // حالات
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  dangerBg: '#FEF2F2',
  success: '#10B981',
  successLight: '#DCFCE7',
  successBg: '#ECFDF5',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  warningBorder: '#FDE68A',

  // تابات وتنقل
  tabInactive: '#9CA3AF',
  tabActiveIcon: '#FFFFFF',

  // ألوان خاصة
  readReceipt: '#4ADE80',
};

export const AppRadius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 25,
  full: 9999,
};

export const AppSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

export const AppFontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  title: 28,
};
