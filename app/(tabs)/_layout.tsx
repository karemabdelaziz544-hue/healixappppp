import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors } from '../../constants/AppTheme';
import { showToast } from '../../components/AppToast';
import { useFamily } from '../../src/context/FamilyContext';

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { currentProfile, switchProfile } = useFamily();
  const isSubAccount = currentProfile?.manager_id !== null && currentProfile?.manager_id !== undefined;
  // 🔴 AUDIT FIX (Medium): Use safe area insets to calculate the correct floating button lift.
  // translateY: -15 caused overlap on iPhones with large bottom safe area (e.g. iPhone 15 Pro).
  const insets = useSafeAreaInsets();
  const floatLift = Math.max(10, 20 - insets.bottom);

  // استبعاد صفحة تفاصيل الخطة من البار السفلي
  const visibleRoutes = state.routes.filter((route: any) => route.name !== 'plan-details');
  const currentRouteName = state.routes[state.index].name;
  const safeActiveIndex = visibleRoutes.findIndex((r: any) => r.name === currentRouteName);

  const handleSwitchBack = async () => {
    if (currentProfile?.manager_id) {
      // 🔴 AUDIT FIX (High): Await switchProfile before showing toast.
      // Previously a 300ms setTimeout was used — brittle and not tied to actual completion.
      await switchProfile(currentProfile.manager_id);
      showToast.info('تم الرجوع للحساب الرئيسي');
    }
  };

  return (
    <View style={styles.tabBarContainer}>
      {visibleRoutes.map((route: any, index: number) => {
        const isFocused = safeActiveIndex === index;

        const onPress = () => {
          if (route.name === 'profile' && isSubAccount) {
            // Await so toast fires after the profile switch is confirmed, not on a fixed timer
            handleSwitchBack();
          } else {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }
        };

        // تحديد الأيقونات والعناوين للوصولية (Accessibility)
        let iconName: any = 'home';
        let a11yLabel = '';
        if (route.name === 'index') { iconName = isFocused ? 'home' : 'home-outline'; a11yLabel = 'الرئيسية'; }
        if (route.name === 'chat') { iconName = isFocused ? 'chatbubbles' : 'chatbubbles-outline'; a11yLabel = 'المحادثات'; }
        if (route.name === 'medical') { iconName = isFocused ? 'pulse' : 'pulse-outline'; a11yLabel = 'القسم الطبي'; }
        if (route.name === 'history') { iconName = isFocused ? 'time' : 'time-outline'; a11yLabel = 'الخطط والبرامج'; }

        if (route.name === 'profile') {
          iconName = isSubAccount ? 'swap-horizontal-outline' : (isFocused ? 'person' : 'person-outline');
          a11yLabel = isSubAccount ? 'العودة للحساب الرئيسي' : 'الملف الشخصي';
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
          <View style={[
                styles.centerButton,
                // للتعويض عن كون StyleSheet.create لا يدعم Dynamic Values:
                // نضع translateY كـ inline style حيث floatLift في نطاق المكون
                { transform: [{ translateY: -floatLift }] },
                // برتقالي في العادي، وأخضر غامق لما نقف عليه
                { backgroundColor: isFocused ? AppColors.primary : AppColors.accent }
              ]}>
                <Ionicons name={iconName} size={28} color="#FFFFFF" />
              </View>
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
            <Ionicons
              name={iconName}
              // تكبير بسيط للأيقونة لما تتفعل
              size={isFocused ? 26 : 24}
              // الأيقونة وهي مش متفعلة أخضر غامق، ولما تتفعل برتقالي (بدون أي خلفية)
              color={isFocused ? AppColors.accent : AppColors.primary}
            />
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
    bottom: 25,
    left: 20,
    right: 20,
    height: 70,
    backgroundColor: '#FFFFFF', // خلفية بيضاء
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