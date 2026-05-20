import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { FamilyProvider } from '../src/context/FamilyContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { usePushNotifications } from '../hooks/usePushNotifications';
import OfflineBanner from '../components/OfflineBanner';
import { AppToastProvider } from '../components/AppToast';
import * as Sentry from '@sentry/react-native';

// 🔴 AUDIT FIX (H2): Environment-aware Sentry configuration.
// Previously: hardcoded tracesSampleRate with no build-flavor awareness.
// Now: explicit environment tag, conditional sample rates, debug only in dev.
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const isStaging = process.env.EXPO_PUBLIC_APP_VARIANT === 'staging';

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: isStaging ? 'staging' : __DEV__ ? 'development' : 'production',
    debug: __DEV__,
    // 100% in staging (full observability), 10% in production (cost/noise control)
    tracesSampleRate: isStaging ? 1.0 : 0.1,
    // Don't send events in development — rely on console
    enabled: !__DEV__,
  });
}

// 🛑 أوقف إخفاء الـ Splash تلقائياً — هنخفيه يدوياً بعد انتهاء التحقق من الـ auth
SplashScreen.preventAutoHideAsync();

// 🌟 1. مدير الإشعارات
function PushNotificationManager() {
  usePushNotifications();
  return null;
}

type AppState = 'booting' | 'unauthenticated' | 'ready';

// 🌟 2. حارس التوجيه الذكي (Auth Guard) — يستخدم State Machine
function AuthGuard() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return;

    const currentSegment = segments[0] || '';
    const isAuthRoute = ['login', 'signup', 'verify'].includes(currentSegment);
    const isOnboardingRoute = currentSegment === 'onboarding';

    // State Machine
    let appState: AppState = 'booting';
    if (isLoading) {
      appState = 'booting';
    } else if (session) {
      appState = 'ready';
    } else {
      appState = 'unauthenticated';
    }

    if (appState === 'booting') return;

    // ✅ أخفِ الـ Splash بعد التحقق من الـ auth مباشرة
    SplashScreen.hideAsync();

    // Route based on state map
    switch (appState) {
      case 'unauthenticated':
        if (!isAuthRoute && !isOnboardingRoute) {
          router.replace('/login');
        }
        break;
      
      case 'ready':
        if (isAuthRoute || isOnboardingRoute) {
          router.replace('/(tabs)');
        }
        break;
    }
  }, [session, segments, isLoading, navigationState?.key]);

  return null;
}

function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <FamilyProvider>
          <AuthGuard />
          <PushNotificationManager />

          <Stack screenOptions={{ headerShown: false }} />
          <OfflineBanner />
        </FamilyProvider>
      </AuthProvider>
      {/* ✅ خارج كل الـ providers حتى يظهر فوق كل شيء بما فيه الـ modals */}
      <AppToastProvider />
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);