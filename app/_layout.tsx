import React from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { FamilyProvider } from '../src/context/FamilyContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AppToastProvider } from '../components/AppToast';
import * as Sentry from '@sentry/react-native';
import { StartupFailureBoundary } from '../components/bootstrap/StartupFailureBoundary';
import { AuthRoutingLogic } from '../components/bootstrap/AuthRoutingLogic';
import { PushNotificationManager } from '../components/bootstrap/PushNotificationManager';
import { GlobalOverlays } from '../components/bootstrap/GlobalOverlays';
import { useFonts } from 'expo-font';

import { I18nManager, DevSettings } from 'react-native';

// Force RTL layout globally for Arabic interface
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  if (__DEV__) {
    DevSettings.reload();
  }
}

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

// 🛑 prevent auto-hiding of SplashScreen - handled in AuthRoutingLogic / StartupFailureBoundary
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppLayoutContent() {
  const { session, isLoading, authError, retryAuth } = useAuth();

  return (
    <StartupFailureBoundary
      error={authError}
      session={session}
      isLoading={isLoading}
      onRetry={retryAuth}
    >
      <AuthRoutingLogic />
      <PushNotificationManager />
      <Stack screenOptions={{ headerShown: false }} />
      <GlobalOverlays />
    </StartupFailureBoundary>
  );
}

function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Thmanyah-Light': require('../assets/fonts/thmanyahsans-Light.otf'),
    'Thmanyah-Regular': require('../assets/fonts/thmanyahsans-Regular.otf'),
    'Thmanyah-Medium': require('../assets/fonts/thmanyahsans-Medium.otf'),
    'Thmanyah-Bold': require('../assets/fonts/thmanyahsans-Bold.otf'),
    'Thmanyah-Black': require('../assets/fonts/thmanyahsans-Black.otf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <FamilyProvider>
          <AppLayoutContent />
        </FamilyProvider>
      </AuthProvider>
      <AppToastProvider />
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);