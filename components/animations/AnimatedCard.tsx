import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleSheet, StyleProp, ViewStyle, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AppMotion } from '@/constants/AppMotion';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedView = Animated.createAnimatedComponent(View);

export interface AnimatedCardProps extends TouchableOpacityProps {
  hapticFeedback?: boolean;
  static?: boolean; // if true, renders a View instead of TouchableOpacity
}

export function AnimatedCard({ children, onPress, onPressIn, onPressOut, style, hapticFeedback = false, static: isStatic = false, ...props }: AnimatedCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    scale.value = withSpring(AppMotion.scale.pressCard, AppMotion.spring);
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

  if (isStatic) {
     return <AnimatedView style={style} {...props}>{children}</AnimatedView>;
  }

  return (
    <AnimatedTouchable
      {...props}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={AppMotion.fade.opacityBase}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedTouchable>
  );
}
