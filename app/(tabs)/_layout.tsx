import { Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MotiView, MotiText } from 'moti';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { AppMotion } from '@/constants/AppMotion';;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { AppColors, AppFontFamily } from '../../constants/AppTheme';
import { Strings } from '../../constants/strings';
import { useFamily } from '../../src/context/FamilyContext';

// Tab Item Component for Fluid Animations
function TabItem({ route, isFocused, onPress, iconName, a11yLabel }: any) {
  const handlePress = (e: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(e);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.tabItem}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected: isFocused }}
    >
      <MotiView
        animate={{
          scale: isFocused ? 1.15 : 1,
          translateY: isFocused ? -2 : 8,
        }}
        transition={{ type: 'spring', ...AppMotion.spring }}
      >
        <Ionicons name={iconName} size={26} color={isFocused ? AppColors.accent : AppColors.primary} />
      </MotiView>
      <MotiText
        animate={{
          opacity: isFocused ? 1 : 0,
          translateY: isFocused ? -2 : 8,
        }}
        transition={{ type: 'spring', ...AppMotion.spring }}
        style={[
          styles.tabLabel,
          { 
            color: isFocused ? AppColors.accent : AppColors.primary,
            fontFamily: isFocused ? AppFontFamily.bold : AppFontFamily.medium
          }
        ]}
      >
        {a11yLabel}
      </MotiText>
    </TouchableOpacity>
  );
}

// Medical Center Button with Breathing & Press Animations
function MedicalButton({ route, isFocused, onPress, iconName, a11yLabel, floatLift }: any) {
  const scale = useSharedValue(1);

  // Breathing animation when focused
  React.useEffect(() => {
    if (isFocused) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1500 }),
          withTiming(1, { duration: 1500 })
        ),
        -1,
        true
      );
    } else {
      scale.value = withTiming(1);
    }
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: -floatLift },
        { scale: scale.value }
      ]
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.9, AppMotion.spring);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, AppMotion.spring);
  };

  const handlePress = (e: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress(e);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.centerButtonWrapper}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected: isFocused }}
    >
      <Animated.View style={[
        styles.centerButton,
        animatedStyle,
        { backgroundColor: isFocused ? AppColors.primary : AppColors.accent }
      ]}>
        <MotiView
          animate={{ scale: isFocused ? 1.2 : 1 }}
          transition={{ type: 'spring', ...AppMotion.spring }}
        >
          <Ionicons name={iconName} size={30} color="#FFFFFF" />
        </MotiView>
      </Animated.View>
      <MotiText
        animate={{ opacity: isFocused ? 1 : 0 }}
        transition={{ type: 'timing', duration: AppMotion.duration.fast }}
        style={[
          styles.tabLabel,
          { 
            color: isFocused ? AppColors.accent : AppColors.primary, 
            marginTop: -floatLift - 2,
            fontFamily: isFocused ? AppFontFamily.bold : AppFontFamily.medium
          }
        ]}
      >
        {a11yLabel}
      </MotiText>
    </TouchableOpacity>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { currentProfile } = useFamily();
  const isSubAccount = currentProfile?.manager_id !== null && currentProfile?.manager_id !== undefined;
  
  const insets = useSafeAreaInsets();
  const floatLift = Math.max(10, 20 - insets.bottom);

  const visibleRoutes = state.routes;
  const currentRouteName = state.routes[state.index].name;
  const safeActiveIndex = visibleRoutes.findIndex((r: any) => r.name === currentRouteName);

  return (
    <View style={[styles.tabBarContainer, { bottom: Math.max(insets.bottom + 10, 25) }]}>
      {visibleRoutes.map((route: any, index: number) => {
        const isFocused = safeActiveIndex === index;

        const onPress = () => {
          // Premium haptic feedback
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let iconName: any = 'home';
        let a11yLabel = '';
        if (route.name === 'index') { iconName = isFocused ? 'home' : 'home-outline'; a11yLabel = Strings.tabs.home; }
        if (route.name === 'chat') { iconName = isFocused ? 'chatbubbles' : 'chatbubbles-outline'; a11yLabel = Strings.tabs.chat; }
        if (route.name === 'medical') { iconName = isFocused ? 'pulse' : 'pulse-outline'; a11yLabel = Strings.tabs.medical; }
        if (route.name === 'workouts') { iconName = isFocused ? 'barbell' : 'barbell-outline'; a11yLabel = Strings.tabs.workouts; }

        if (route.name === 'profile') {
          iconName = isFocused ? 'person' : 'person-outline';
          a11yLabel = Strings.tabs.profile;
        }

        if (route.name === 'medical') {
          return (
            <MedicalButton 
              key={route.key}
              route={route}
              isFocused={isFocused}
              onPress={onPress}
              iconName={iconName}
              a11yLabel={a11yLabel}
              floatLift={floatLift}
            />
          );
        }

        return (
          <TabItem 
            key={route.key}
            route={route}
            isFocused={isFocused}
            onPress={onPress}
            iconName={iconName}
            a11yLabel={a11yLabel}
          />
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="medical" />
      <Tabs.Screen name="workouts" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    start: 20,
    end: 20,
    height: 70,
    backgroundColor: AppColors.surface,
    borderRadius: 35,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  centerButtonWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
});