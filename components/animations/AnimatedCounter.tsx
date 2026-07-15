import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withSpring, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { Text } from '@/components/AppText';
import { AppMotion } from '@/constants/AppMotion';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  style?: any;
}

export function AnimatedCounter({ value, prefix = '', suffix = '', style }: AnimatedCounterProps) {
  const animatedValue = useSharedValue(value);

  useEffect(() => {
    animatedValue.value = withSpring(value, AppMotion.spring);
  }, [value]);

  // For a truly robust animated counter in RN, we would use react-native-reanimated's ReanimatedText 
  // or interpolate an array of characters. For simplicity and performance, if the value changes,
  // we do a simple scale pop on the text.
  
  const animatedStyle = useAnimatedStyle(() => {
    // When value differs heavily from animatedValue, it scales down slightly, then pops back
    const scale = interpolate(
      Math.abs(animatedValue.value - value),
      [0, 10], // threshold
      [1, 1.1],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale }]
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <Text style={style}>
        {prefix}{value}{suffix}
      </Text>
    </Animated.View>
  );
}
