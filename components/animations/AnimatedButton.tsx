import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AppMotion } from '@/constants/AppMotion';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export interface AnimatedButtonProps extends TouchableOpacityProps {
  hapticFeedback?: boolean;
}

export function AnimatedButton({ children, onPress, onPressIn, onPressOut, style, hapticFeedback = true, ...props }: AnimatedButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    scale.value = withSpring(AppMotion.scale.pressButton, AppMotion.spring);
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, AppMotion.spring);
    onPressOut?.(e);
  };

  const handlePress = (e: any) => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(e);
  };

  return (
    <AnimatedTouchable
      {...props}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={AppMotion.fade.opacityLow}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedTouchable>
  );
}
