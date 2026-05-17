import React from 'react';
import { TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function SupportFAB() {
  const router = useRouter();

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/support' as any);
  };

  return (
    <TouchableOpacity style={styles.fab} onPress={handlePress} activeOpacity={0.8}>
      <Ionicons name="headset" size={28} color="#FFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 110, // Above the custom tab bar
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
});
