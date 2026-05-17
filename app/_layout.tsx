import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { FamilyProvider } from '../src/context/FamilyContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { usePushNotifications } from '../hooks/usePushNotifications';
import OfflineBanner from '../components/OfflineBanner';
import { AppToastProvider } from '../components/AppToast';

// 🛑 أوقف إخفاء الـ Splash تلقائياً — هنخفيه يدوياً بعد انتهاء التحقق من الـ auth
SplashScreen.preventAutoHideAsync();

// 🌟 1. مدير الإشعارات
function PushNotificationManager() {
  usePushNotifications();
  return null;
}

// 🌟 2. حارس التوجيه الذكي (Auth Guard) — يستخدم SplashScreen بدل setTimeout
function AuthGuard() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // لا نفعل شيئاً حتى يكتمل تحميل الـ auth ويكون الـ Router جاهزاً
    if (!navigationState?.key || isLoading) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'signup' || segments[0] === 'verify'; // ✅ إضافة verify
    const inOnboarding = segments[0] === 'onboarding';

    // ✅ أخفِ الـ Splash بعد التحقق من الـ auth مباشرة
    SplashScreen.hideAsync();

    if (!session && !inAuthGroup && !inOnboarding) {
      router.replace('/login');
    } else if (session && (inAuthGroup || inOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [session, segments, isLoading, navigationState?.key]);

  return null;
}

export default function RootLayout() {
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