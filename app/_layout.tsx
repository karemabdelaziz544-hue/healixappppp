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

// 🔴 AUDIT FIX: Startup failure recovery screen
// Shown when auth bootstrap fails — prevents stuck-on-splash perception.
function StartupErrorScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    onRetry();
    // Reset after a short delay in case retry completes fast
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

// 🌟 2. حارس التوجيه الذكي (Auth Guard) — يستخدم State Machine
function AuthGuard() {
  const { session, isLoading, authError, retryAuth } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return;

    const currentSegment = segments[0] || '';
    const isAuthRoute = ['login', 'signup', 'verify'].includes(currentSegment);
    const isOnboardingRoute = currentSegment === 'onboarding';

    // State Machine — now includes 'error' state
    let appState: AppState = 'booting';
    if (isLoading) {
      appState = 'booting';
    } else if (authError && !session) {
      appState = 'error';
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
      case 'error':
        // 🔴 AUDIT FIX: Don't route — let StartupErrorScreen handle this
        Sentry.captureException(authError, {
          tags: { context: 'auth_bootstrap' },
        });
        break;

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
  }, [session, segments, isLoading, navigationState?.key, authError]);

  // 🔴 AUDIT FIX: Show recovery screen on startup failure
  if (!isLoading && authError && !session) {
    return <StartupErrorScreen error={authError} onRetry={retryAuth} />;
  }

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