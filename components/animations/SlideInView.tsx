import React, { ReactNode } from 'react';
import { ViewStyle, StyleProp, I18nManager } from 'react-native';
import { MotiView } from 'moti';
import { AppMotion } from '@/constants/AppMotion';

interface SlideInViewProps {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  style?: StyleProp<ViewStyle>;
}

export function SlideInView({ children, delay = 0, direction = 'up', distance = 20, style }: SlideInViewProps) {
  
  const getTransforms = () => {
    let startX = 0;
    let startY = 0;
    
    // Support RTL naturally
    const isRtl = I18nManager.isRTL;

    if (direction === 'up') startY = distance;
    if (direction === 'down') startY = -distance;
    if (direction === 'left') startX = isRtl ? -distance : distance;
    if (direction === 'right') startX = isRtl ? distance : -distance;

    return { startX, startY };
  };

  const { startX, startY } = getTransforms();

  return (
    <MotiView
      from={{ opacity: 0, translateY: startY, translateX: startX }}
      animate={{ opacity: 1, translateY: 0, translateX: 0 }}
      transition={{
        type: 'spring',
        damping: AppMotion.spring.damping,
        stiffness: AppMotion.spring.stiffness,
        mass: AppMotion.spring.mass,
        delay,
      }}
      style={style}
    >
      {children}
    </MotiView>
  );
}
