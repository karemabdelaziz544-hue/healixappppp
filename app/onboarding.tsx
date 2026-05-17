import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, Image, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, AppRadius, AppSpacing } from '../constants/AppTheme';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'تابع خطتك الصحية يومياً',
    description: 'خطتك مخصصة ليك 100%. التزم بمهامك اليومية وشوف تقدمك خطوة بخطوة.',
    icon: 'barbell',
    color: AppColors.primary,
  },
  {
    id: '2',
    title: 'تحدث مع طبيبك مباشرة',
    description: 'دعم فني وطبي معاك في أي وقت. أسأل واستشير فريق هيليكس بكل سهولة.',
    icon: 'chatbubbles',
    color: AppColors.accent,
  },
  {
    id: '3',
    title: 'سجل قياساتك وشوف تطورك',
    description: 'ارفع تحاليلك وصور الـ InBody وتابع رحلة نزول وزنك وبناء عضلاتك.',
    icon: 'analytics',
    color: '#3B82F6',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // السهم دائماً لليسار
  const arrowIcon = 'arrow-back';

  const handleSkip = async () => {
    await AsyncStorage.setItem('has_seen_onboarding', 'true');
    router.replace('/login');
  };

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await AsyncStorage.setItem('has_seen_onboarding', 'true');
      router.replace('/login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
        {/* ✅ زر تخطي — يظهر فقط في الشريحة الأولى والثانية */}
        {currentIndex < slides.length - 1 && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>تخطي</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={item => item.id}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon as any} size={80} color={item.color} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View key={index} style={[styles.dot, currentIndex === index && styles.activeDot]} />
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleNext}>
          <Text style={styles.btnText}>{currentIndex === slides.length - 1 ? 'ابدأ رحلتك' : 'التالي'}</Text>
          <Ionicons name={arrowIcon} size={20} color="#FFF" style={{ marginLeft: 10 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ✅ خلفية #F9F6F0 موحدة مع باقي التطبيق — لا مزيد من الـ white flash عند الانتقال للـ Login
  container: { flex: 1, backgroundColor: AppColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.xl,
    marginTop: AppSpacing.xl,
  },
  logo: { width: 60, height: 60, borderRadius: AppRadius.md },
  skipBtn: { paddingHorizontal: AppSpacing.md, paddingVertical: AppSpacing.sm },
  skipText: { fontSize: 15, color: AppColors.textSecondary, fontWeight: 'bold' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: AppSpacing.xxxl },
  iconBox: { width: 180, height: 180, borderRadius: 90, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 28, fontWeight: '900', color: AppColors.textPrimary, textAlign: 'center', marginBottom: 15 },
  description: { fontSize: 16, color: AppColors.textSecondary, textAlign: 'center', lineHeight: 24, fontWeight: 'bold' },
  footer: { padding: AppSpacing.xxxl },
  pagination: { flexDirection: 'row', justifyContent: 'center', marginBottom: AppSpacing.xxxl },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: AppColors.border, marginHorizontal: 5 },
  activeDot: { width: 25, backgroundColor: AppColors.primary },
  btn: {
    backgroundColor: AppColors.primary,
    height: 55,
    borderRadius: AppRadius.lg,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
