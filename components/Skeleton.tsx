import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, ViewStyle, DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const [layoutWidth, setLayoutWidth] = useState<number>(0);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (layoutWidth === 0) return;
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim, layoutWidth]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [layoutWidth, -layoutWidth],
  });

  return (
    <View
      onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E5E7EB', // Base gray color
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {layoutWidth > 0 && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <LinearGradient
            colors={['#E5E7EB', '#F3F4F6', '#E5E7EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}