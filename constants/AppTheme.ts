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
  // Healix Stitch Design System — Primary Tokens
  primary: '#27443B',
  primaryLight: '#E8F3F1',
  primaryContainer: '#3E5C52',
  onPrimaryContainer: '#B2D3C6',
  inversePrimary: '#ADCEC1',
  primaryFixed: '#C8EADD',
  primaryFixedDim: '#ADCEC1',
  onPrimaryFixed: '#012018',
  onPrimaryFixedVariant: '#2F4C43',

  // Secondary & Alerts
  secondary: '#BB0026',
  secondaryContainer: '#E22139',
  onSecondaryContainer: '#FFFBFF',

  // Tertiary
  tertiary: '#583632',
  tertiaryContainer: '#724D48',
  onTertiaryContainer: '#F2C0BA',

  // Surfaces & Glassmorphism
  surface: '#F6FAF8',
  surfaceDim: '#D7DBD9',
  surfaceBright: '#F6FAF8',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F0F4F2',
  surfaceContainer: '#EBEFED',
  surfaceContainerHigh: '#E5E9E7',
  surfaceContainerHighest: '#DFE3E1',
  surfaceGlass: 'rgba(255, 255, 255, 0.75)',
  surfaceTint: '#46645A',
  
  // Backgrounds & Text
  background: '#F6FAF8',
  onBackground: '#181D1C',
  onSurface: '#181D1C',
  onSurfaceVariant: '#414845',
  inverseSurface: '#2D3130',
  inverseOnSurface: '#EEF2F0',

  // Borders & Lines
  outline: '#727975',
  outlineVariant: '#C1C8C4',
  borderSubtle: 'rgba(62, 92, 82, 0.08)',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Accent & Legacy
  accent: '#F97316',
  accentLight: '#FFF7ED',
  accentBorder: '#FFEDD5',
  inputBg: '#F3F4F6',

  // Legacy Text Aliases
  textPrimary: '#181D1C',
  textSecondary: '#727975',
  textMuted: '#9CA3AF',

  // Feedback & Status
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  dangerBg: '#FEF2F2',
  success: '#10B981',
  successLight: '#DCFCE7',
  successBg: '#ECFDF5',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  warningBorder: '#FDE68A',

  // Data Visualization
  dataRed: '#D31130',
  dataGold: '#EADCCF',

  // Named Colors & Aliases
  white: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.4)',
  orange: '#FD761C',
  purple: '#8B5CF6',
  blue: '#3B82F6',

  // Tabs & Features
  tabInactive: '#9CA3AF',
  tabActiveIcon: '#FFFFFF',
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

// 🔴 AUDIT FIX: ألوان التغذية — بدل الـ hex المتكررة في MainDashboardView
export const NutritionalColors = {
  breakfast: { main: '#10B981', bg: '#D1FAE5' },
  lunch:     { main: '#3B82F6', bg: '#DBEAFE' },
  dinner:    { main: '#8B5CF6', bg: '#EDE9FE' },
  snack:     { main: '#F59E0B', bg: '#FEF3C7' },
  workout:   { main: AppColors.accent, bg: AppColors.accentLight },
  fallback:  { main: AppColors.primary, bg: AppColors.primaryLight },
};

// 🔴 AUDIT FIX: ألوان الترطيب — بدل الـ hex المتكررة في WaterTracker
export const HydrationColors = {
  bgLight:    '#E0F2FE',
  waveLight:  '#38BDF8',
  waveDark:   '#0284C7',
  textDark:   '#0369A1',
  complete:   '#10B981',
  borderSide: '#F1F5F9',
};

// 🔴 AUDIT FIX: خطوط التطبيق الموحدة
export const AppFontFamily = {
  light: 'Thmanyah-Light',
  regular: 'Thmanyah-Regular',
  medium: 'Thmanyah-Medium',
  bold: 'Thmanyah-Bold',
  extraBold: 'Thmanyah-Black',
};

