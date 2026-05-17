import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function OfflineBanner() {
  const { isConnected, isChecking } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    if (isChecking) return;

    Animated.spring(slideAnim, {
      toValue: !isConnected ? 0 : -80,
      useNativeDriver: true,
      bounciness: 8,
      speed: 14,
    }).start();
  }, [isConnected, isChecking]);

  // لا تعرض أي شيء لو الاتصال شغال
  if (isConnected && !isChecking) return null;

  return (
    <Animated.View 
      style={[
        styles.banner, 
        { 
          paddingTop: insets.top + 8,
          transform: [{ translateY: slideAnim }] 
        }
      ]}
    >
      <Text style={styles.text}>لا يوجد اتصال بالإنترنت</Text>
      <Ionicons name="cloud-offline" size={20} color="#FFF" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#EF4444',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
    paddingHorizontal: 20,
    gap: 8,
    zIndex: 9999,
    elevation: 20,
  },
  text: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
