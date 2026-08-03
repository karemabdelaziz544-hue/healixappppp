import { useEffect } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useSubscriptionGuard } from '../../hooks/useSubscriptionGuard';
import { safeHideSplashScreen } from './splashUtils';

export function AuthRoutingLogic() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { userLifecycleState, isGuardLoading } = useSubscriptionGuard();

  useEffect(() => {
    if (!isLoading && !isGuardLoading) {
      safeHideSplashScreen();
    }

    if (!navigationState?.key || isLoading || isGuardLoading) return;

    const currentSegment = (segments[0] || '') as string;
    const isAuthRoute = ['login', 'signup', 'verify'].includes(currentSegment);
    const isOnboardingRoute = currentSegment === 'onboarding';
    // index route acts as a loading portal — let it redirect via layout
    const isIndexRoute = currentSegment === '' || currentSegment === 'index';

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
