import React, { ReactNode } from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import { MotiView } from 'moti';
import { AppMotion } from '@/constants/AppMotion';

interface FadeInViewProps {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export function FadeInView({ children, delay = 0, style }: FadeInViewProps) {
  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        type: 'timing',
        duration: AppMotion.duration.base,
        delay,
      }}
      style={style}
    >
      {children}
    </MotiView>
  );
}
