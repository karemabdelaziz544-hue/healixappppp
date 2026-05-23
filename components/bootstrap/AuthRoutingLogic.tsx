import { useEffect } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../../src/context/AuthContext';

export function AuthRoutingLogic() {
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

    // Hide Splash screen after auth check is complete
    SplashScreen.hideAsync().catch(() => {});

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
