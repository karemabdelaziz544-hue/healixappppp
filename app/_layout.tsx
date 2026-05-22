import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { FamilyProvider } from '../src/context/FamilyContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { usePushNotifications } from '../hooks/usePushNotifications';
import OfflineBanner from '../components/OfflineBanner';
import { AppToastProvider } from '../components/AppToast';
import * as Sentry from '@sentry/react-native';
import { Ionicons } from '@expo/vector-icons';

// 🔴 AUDIT FIX (H2): Environment-aware Sentry configuration.
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const isStaging = process.env.EXPO_PUBLIC_APP_VARIANT === 'staging';

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: isStaging ? 'staging' : __DEV__ ? 'development' : 'production',
    debug: __DEV__,
    tracesSampleRate: isStaging ? 1.0 : 0.1,
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

type AppState = 'booting' | 'unauthenticated' | 'ready' | 'error';

// ────────────────────────────────────────────────────
// 🔴 AUDIT 7 FIX (Issue 1): Startup failure recovery screen.
// Previously: AuthGuard was a sibling to <Stack />, so StartupErrorScreen
// mounted ALONGSIDE the navigation tree — causing layout pollution.
// Now: it's rendered by AppLayoutContent which GATES the entire tree.
// ────────────────────────────────────────────────────
function StartupErrorScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    onRetry();
    setTimeout(() => setRetrying(false), 2000);
  };

  return (
    <View style={errorStyles.container}>
      <View style={errorStyles.iconBox}>
        <Ionicons name="cloud-offline" size={50} color="#EF4444" />
      </View>
      <Text style={errorStyles.title}>تعذّر الاتصال</Text>
      <Text style={errorStyles.message}>
        لم نتمكن من تحميل بيانات حسابك. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.
      </Text>
      {__DEV__ && (
        <Text style={errorStyles.debugText}>{error.message}</Text>
      )}
      <TouchableOpacity
        style={errorStyles.retryBtn}
        onPress={handleRetry}
        disabled={retrying}
        activeOpacity={0.8}
        accessibilityLabel="إعادة المحاولة"
        accessibilityRole="button"
      >
        {retrying ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name="refresh" size={20} color="#FFF" />
            <Text style={errorStyles.retryText}>إعادة المحاولة</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F6F0', padding: 40 },
  iconBox: { width: 100, height: 100, backgroundColor: '#FEE2E2', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  title: { fontSize: 24, fontWeight: '900', color: '#1F2937', marginBottom: 12, textAlign: 'center' },
  message: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 26, marginBottom: 15, fontWeight: '600' },
  debugText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 20, fontFamily: 'monospace' },
  retryBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: '#2A4B46', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 15 },
  retryText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});

// ────────────────────────────────────────────────────
// 🔴 AUDIT 7 FIX (Issue 2): Unified routing side-effect.
// Previously: AuthGuard + app/index.tsx both fired competing router.replace()
// calls, causing race conditions and cold-start flicker.
// Now: ALL routing logic is centralized here. app/index.tsx is a
// dumb loading portal only.
// ────────────────────────────────────────────────────
function AuthRoutingLogic() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key || isLoading) return;

    const currentSegment = (segments[0] || '') as string;
    const isAuthRoute = ['login', 'signup', 'verify'].includes(currentSegment);
    const isOnboardingRoute = currentSegment === 'onboarding';
    // index route acts as a loading portal — let it redirect via layout
    const isIndexRoute = currentSegment === '' || currentSegment === 'index';

    // ✅ أخفِ الـ Splash بعد التحقق من الـ auth مباشرة
    SplashScreen.hideAsync();

    if (session) {
      // User is authenticated — redirect away from auth/onboarding/index
      if (isAuthRoute || isOnboardingRoute || isIndexRoute) {
        router.replace('/(tabs)');
      }
    } else {
      // User is NOT authenticated — redirect away from protected routes
      if (!isAuthRoute && !isOnboardingRoute) {
        router.replace('/login');
      }
    }
  }, [session, segments, isLoading, navigationState?.key]);

  return null;
}

// ────────────────────────────────────────────────────
// 🔴 AUDIT 7 FIX (Issue 1): Layout Wrapper that GATES children.
// Previously: AuthGuard was a sibling rendering component that returned
// <StartupErrorScreen /> alongside <Stack />, causing flexbox pollution.
// Now: AppLayoutContent is the parent wrapper — if auth fails, it
// renders ONLY the error screen, fully replacing the Stack tree.
// ────────────────────────────────────────────────────
function AppLayoutContent() {
  const { session, isLoading, authError, retryAuth } = useAuth();

  // Guard early — prevents rendering broken Stack states
  if (!isLoading && authError && !session) {
    // Report to Sentry once
    Sentry.captureException(authError, {
      tags: { context: 'auth_bootstrap' },
    });
    SplashScreen.hideAsync();
    return <StartupErrorScreen error={authError} onRetry={retryAuth} />;
  }

  return (
    <>
      <AuthRoutingLogic />
      <PushNotificationManager />
      <Stack screenOptions={{ headerShown: false }} />
      <OfflineBanner />
    </>
  );
}

function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <FamilyProvider>
          <AppLayoutContent />
        </FamilyProvider>
      </AuthProvider>
      {/* ✅ خارج كل الـ providers حتى يظهر فوق كل شيء بما فيه الـ modals */}
      <AppToastProvider />
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);