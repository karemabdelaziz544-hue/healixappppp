import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors, AppFontFamily } from '../../constants/AppTheme';
import { Strings } from '../../constants/strings';
import { useFamily } from '../../src/context/FamilyContext';

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { currentProfile } = useFamily();
  const isSubAccount = currentProfile?.manager_id !== null && currentProfile?.manager_id !== undefined;
  // 🔴 AUDIT FIX (Medium): Use safe area insets to calculate the correct floating button lift.
  // translateY: -15 caused overlap on iPhones with large bottom safe area (e.g. iPhone 15 Pro).
  const insets = useSafeAreaInsets();
  const floatLift = Math.max(10, 20 - insets.bottom);

  // استبعاد صفحة تفاصيل الخطة من البار السفلي
  const visibleRoutes = state.routes.filter((route: any) => route.name !== 'plan-details');
  const currentRouteName = state.routes[state.index].name;
  const safeActiveIndex = visibleRoutes.findIndex((r: any) => r.name === currentRouteName);

  return (
    <View style={[styles.tabBarContainer, { bottom: Math.max(insets.bottom + 10, 25) }]}>
      {visibleRoutes.map((route: any, index: number) => {
        const isFocused = safeActiveIndex === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // تحديد الأيقونات والعناوين للوصولية (Accessibility)
        let iconName: any = 'home';
        let a11yLabel = '';
        if (route.name === 'index') { iconName = isFocused ? 'home' : 'home-outline'; a11yLabel = Strings.tabs.home; }
        if (route.name === 'chat') { iconName = isFocused ? 'chatbubbles' : 'chatbubbles-outline'; a11yLabel = Strings.tabs.chat; }
        if (route.name === 'medical') { iconName = isFocused ? 'pulse' : 'pulse-outline'; a11yLabel = Strings.tabs.medical; }
        if (route.name === 'history') { iconName = isFocused ? 'time' : 'time-outline'; a11yLabel = Strings.tabs.history; }

        if (route.name === 'profile') {
          iconName = isSubAccount ? 'swap-horizontal-outline' : (isFocused ? 'person' : 'person-outline');
          a11yLabel = isSubAccount ? Strings.tabs.switchBack : Strings.tabs.profile;
        }

        // 🔴 تصميم الزر الأوسط البارز (صفحة القياسات - الطبية)
        if (route.name === 'medical') {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.centerButtonWrapper}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={a11yLabel}
              accessibilityState={{ selected: isFocused }}
            >
              {isFocused && <View style={styles.activeIndicator} />}
              <View style={[
                styles.centerButton,
                // للتعويض عن كون StyleSheet.create لا يدعم Dynamic Values:
                // نضع translateY كـ inline style حيث floatLift في نطاق المكون
                { transform: [{ translateY: -floatLift }] },
                // برتقالي في العادي، وأخضر غامق لما نقف عليه
                { backgroundColor: isFocused ? AppColors.primary : AppColors.accent }
              ]}>
                <Ionicons name={iconName} size={30} color="#FFFFFF" />
              </View>
              <Text style={[
                styles.tabLabel,
                { 
                  color: isFocused ? AppColors.accent : AppColors.primary, 
                  marginTop: -floatLift + 5,
                  fontFamily: isFocused ? AppFontFamily.bold : AppFontFamily.medium
                }
              ]}>
                {a11yLabel}
              </Text>
            </TouchableOpacity>
          );
        }

        // 🔴 تصميم باقي الأزرار العادية
        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={a11yLabel}
            accessibilityState={{ selected: isFocused }}
          >
            {isFocused && <View style={styles.activeIndicator} />}
            <Ionicons
              name={iconName}
              size={26}
              color={isFocused ? AppColors.accent : AppColors.primary}
            />
            <Text style={[
              styles.tabLabel,
              { 
                color: isFocused ? AppColors.accent : AppColors.primary,
                fontFamily: isFocused ? AppFontFamily.bold : AppFontFamily.medium
              }
            ]}>
              {a11yLabel}
            </Text>
          </TouchableOpacity>
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
      {/* الترتيب هنا مهم جداً عشان medical تكون رقم 3 وفي النص بالظبط */}
      <Tabs.Screen name="index" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="medical" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="plan-details" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 70,
    backgroundColor: AppColors.surface,
    borderRadius: 35, // دوران ناعم
    flexDirection: 'row-reverse', // ✅ Fix RTL alignment
    alignItems: 'center',
    // شادو ناعم جداً للبار نفسه
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
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 4,
    backgroundColor: AppColors.accent,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },

  // تنسيقات الزر اللي في النص (Floating)
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
    // شادو قوي للزرار عشان يبرز (translateY moved to inline style — see CustomTabBar)
    elevation: 10,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
});