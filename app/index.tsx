import { View, ActivityIndicator } from 'react-native';

/**
 * 🔴 AUDIT 7 FIX (Issue 2): Dumb Loading Portal.
 *
 * Previously: This file duplicated auth/onboarding routing logic already
 * present in _layout.tsx AuthGuard, creating a race condition where BOTH
 * fired competing router.replace() calls on cold start — causing flicker,
 * redundant navigation stacks, and frame drops.
 *
 * Now: This is a stateless loading placeholder only. ALL routing decisions
 * are centralized in _layout.tsx → AuthRoutingLogic component.
 * When the layout's routing logic resolves, it navigates away from this
 * index route automatically.
 */
export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F9F6F0', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#2A4B46" />
    </View>
  );
}