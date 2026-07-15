import { useEffect } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../../src/context/AuthContext';
import { useSubscriptionGuard } from '../../hooks/useSubscriptionGuard';

let isSplashScreenHidden = false;

export function AuthRoutingLogic() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { userLifecycleState, isGuardLoading } = useSubscriptionGuard();

  useEffect(() => {
    if (!navigationState?.key || isLoading || isGuardLoading) return;

    const currentSegment = (segments[0] || '') as string;
    const isAuthRoute = ['login', 'signup', 'verify'].includes(currentSegment);
    const isOnboardingRoute = currentSegment === 'onboarding';
    // index route acts as a loading portal — let it redirect via layout
    const isIndexRoute = currentSegment === '' || currentSegment === 'index';

    // Hide Splash screen after auth check is complete
    if (!isSplashScreenHidden) {
      isSplashScreenHidden = true;
      SplashScreen.hideAsync().catch(() => {});
    }

    if (session) {
      if (isAuthRoute || isOnboardingRoute || isIndexRoute) {
        router.replace('/(tabs)');
      }
    } else {
      // User is NOT authenticated — redirect away from protected routes
      if (!isAuthRoute && !isOnboardingRoute) {
        router.replace('/login');
      }
    }
  }, [session, segments, isLoading, isGuardLoading, userLifecycleState, navigationState?.key]);

  return null;
}
