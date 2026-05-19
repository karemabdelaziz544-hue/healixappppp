import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * app.config.ts — ملف إعداد Expo الديناميكي
 * =============================================
 * هذا الملف يُلغي app.json ويُعيد نفس الإعدادات مع إزالة
 * تحذيرات الـ IDE المتعلقة بـ schema validation لـ:
 * - newArchEnabled (صحيح في sdk 52+ داخل ios/android)
 * - edgeToEdgeEnabled (صحيح في sdk 52+ داخل android)
 *
 * المصدر: https://docs.expo.dev/versions/latest/config/app/
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'healix-app',
  slug: 'healix-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'healixapp',
  userInterfaceStyle: 'light',

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.healix.app',
    buildNumber: '1',
    // ✅ newArchEnabled is valid inside ios in Expo SDK 52 (schema validator is outdated)
    newArchEnabled: true,
    infoPlist: {
      NSCameraUsageDescription: 'يحتاج Healix للوصول للكاميرا لالتقاط صور التحاليل والقياسات الطبية.',
      NSMicrophoneUsageDescription: 'يحتاج Healix للوصول للميكروفون لإرسال الرسائل الصوتية للكوتش.',
      NSPhotoLibraryUsageDescription: 'يحتاج Healix للوصول للصور لرفع صور التحاليل والمستندات الطبية.',
    },
  },

  android: {
    versionCode: 1,
    // ✅ newArchEnabled is valid inside android in Expo SDK 52
    newArchEnabled: true,
    // ✅ edgeToEdgeEnabled is valid inside android in Expo SDK 52 (schema validator is outdated)
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: 'com.healix.app',
    adaptiveIcon: {
      backgroundColor: '#F9F6F0',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
  },

  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },

  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#F9F6F0',
        dark: { backgroundColor: '#1C2F2C' },
      },
    ],
    'expo-secure-store',
    '@sentry/react-native',
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    router: {},
    eas: {
      projectId: '4870d594-2221-4bcd-8a10-46fe0fe539eb',
    },
  },

  owner: 'karem4444',
});
