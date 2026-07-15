const fs = require('fs');

const path = 'app/(tabs)/_layout.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace standard Animated imports with Moti and Reanimated
content = content.replace("import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';", "import { StyleSheet, TouchableOpacity, View } from 'react-native';\nimport { MotiView, MotiText } from 'moti';\nimport Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, withSequence } from 'react-native-reanimated';\nimport { AppMotion } from '@/constants/AppMotion';");

// Rewrite TabItem using Moti
const newTabItem = `function TabItem({ route, isFocused, onPress, iconName, a11yLabel }: any) {
  const handlePress = (e) => {
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
}`;

content = content.replace(/function TabItem\([\s\S]*?\n\}\n/g, newTabItem + '\n');

// Rewrite MedicalButton using Reanimated for breathing and Moti
const newMedicalButton = `function MedicalButton({ route, isFocused, onPress, iconName, a11yLabel, floatLift }: any) {
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

  const handlePress = (e) => {
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
}`;

content = content.replace(/function MedicalButton\([\s\S]*?\n\}\n/g, newMedicalButton + '\n');

fs.writeFileSync(path, content);
