import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, AppRadius, AppSpacing } from '../constants/AppTheme';
import { showToast } from '../components/AppToast';

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
    title: 'ما هو هدفك الصحي الأساسي؟',
    description: 'سنقوم بتفصيل تجربتك بناءً على اختيارك',
    icon: 'analytics',
    color: '#3B82F6',
  },
  {
    id: '3',
    title: 'ما هو مستوى التزامك اليومي؟',
    description: 'حدد نمط التغيير والسرعة المناسبة لك',
    icon: 'speedometer',
    color: AppColors.accent,
  },
];

const GOALS = [
  { id: 'weight_loss', label: 'خسارة الوزن والدهون', desc: 'تقليل السعرات وبناء عادات صحية مستدامة' },
  { id: 'muscle_gain', label: 'بناء عضلات ولياقة بدنية', desc: 'زيادة الكتلة العضلية وتحسين القوة العامة' },
  { id: 'health_monitoring', label: 'متابعة صحية وتغذية علاجية', desc: 'متابعة القياسات، التحاليل وتوصيات الأطباء' },
];

const COMMITMENTS = [
  { id: 'simple', label: 'بسيط (تغيير عادات تدريجي)', desc: 'خطوات بسيطة يومية للمبتدئين' },
  { id: 'moderate', label: 'متوسط (التزام متوازن)', desc: 'توازن بين الدايت وتدريبات تناسب يومك' },
  { id: 'high', label: 'عالٍ (تحول كامل وبسرعة)', desc: 'برنامج دقيق وصارم لأقوى النتائج' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedCommitment, setSelectedCommitment] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const arrowIcon = 'arrow-back';

  const handleSkip = async () => {
    await AsyncStorage.setItem('has_seen_onboarding', 'true');
    router.replace('/login');
  };

  const handleNext = async () => {
    if (currentIndex === 1 && !selectedGoal) {
      showToast.error('يرجى اختيار هدفك الصحي أولاً');
      return;
    }
    if (currentIndex === 2 && !selectedCommitment) {
      showToast.error('يرجى تحديد مستوى التزامك أولاً');
      return;
    }

    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      await AsyncStorage.setItem('has_seen_onboarding', 'true');
      if (selectedGoal) {
        await AsyncStorage.setItem('user_onboarding_goal', selectedGoal);
      }
      if (selectedCommitment) {
        await AsyncStorage.setItem('user_onboarding_commitment', selectedCommitment);
      }
      router.replace('/login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
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
        scrollEnabled={false} // Disable swiping manually to force button interaction
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          if (item.id === '1') {
            return (
              <View style={[styles.slide, { width }]}>
                <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon as any} size={80} color={item.color} />
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            );
          }
          if (item.id === '2') {
            return (
              <View style={[styles.slide, { width }]}>
                <Text style={styles.interactiveTitle}>ما هو هدفك الصحي الأساسي؟</Text>
                <Text style={styles.interactiveSubtitle}>سنقوم بتفصيل تجربتك بناءً على اختيارك</Text>
                <View style={styles.optionsContainer}>
                  {GOALS.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={[
                        styles.optionCard,
                        selectedGoal === g.id && styles.optionCardActive,
                      ]}
                      onPress={() => setSelectedGoal(g.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.optionLabel,
                        selectedGoal === g.id && styles.optionLabelActive
                      ]}>{g.label}</Text>
                      <Text style={styles.optionDesc}>{g.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          }
          return (
            <View style={[styles.slide, { width }]}>
              <Text style={styles.interactiveTitle}>ما هو مستوى التزامك اليومي؟</Text>
              <Text style={styles.interactiveSubtitle}>حدد نمط التغيير والسرعة المناسبة لك</Text>
              <View style={styles.optionsContainer}>
                {COMMITMENTS.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.optionCard,
                      selectedCommitment === c.id && styles.optionCardActive,
                    ]}
                    onPress={() => setSelectedCommitment(c.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.optionLabel,
                      selectedCommitment === c.id && styles.optionLabelActive
                    ]}>{c.label}</Text>
                    <Text style={styles.optionDesc}>{c.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        }}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View key={index} style={[styles.dot, currentIndex === index && styles.activeDot]} />
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleNext}>
          <Text style={styles.btnText}>{currentIndex === slides.length - 1 ? 'ابدأ خطتك المبدئية' : 'التالي'}</Text>
          <Ionicons name={arrowIcon} size={20} color="#FFF" style={{ marginRight: 10 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  header: {
    flexDirection: 'row-reverse',
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
  title: { fontSize: 28, fontWeight: '900', color: AppColors.textPrimary, textAlign: 'center', marginBottom: 15, fontFamily: 'Tajawal-Bold' },
  description: { fontSize: 16, color: AppColors.textSecondary, textAlign: 'center', lineHeight: 24, fontWeight: 'bold', fontFamily: 'Tajawal-Medium' },
  interactiveTitle: { fontSize: 22, fontWeight: '900', color: AppColors.textPrimary, textAlign: 'center', marginBottom: 8, fontFamily: 'Tajawal-Bold' },
  interactiveSubtitle: { fontSize: 14, color: AppColors.textSecondary, textAlign: 'center', marginBottom: 30, fontFamily: 'Tajawal-Medium' },
  optionsContainer: { width: '100%', gap: 15 },
  optionCard: {
    width: '100%',
    backgroundColor: AppColors.surface,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    borderRadius: AppRadius.lg,
    padding: 16,
    alignItems: 'flex-end',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  optionCardActive: { borderColor: AppColors.primary, backgroundColor: AppColors.primaryLight },
  optionLabel: { fontSize: 16, fontWeight: 'bold', color: AppColors.textPrimary, marginBottom: 4, fontFamily: 'Tajawal-Bold' },
  optionLabelActive: { color: AppColors.primary },
  optionDesc: { fontSize: 12, color: AppColors.textSecondary, textAlign: 'right', fontFamily: 'Tajawal-Regular' },
  footer: { padding: AppSpacing.xxxl },
  pagination: { flexDirection: 'row-reverse', justifyContent: 'center', marginBottom: AppSpacing.xxxl },
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
  btnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', fontFamily: 'Tajawal-Bold' },
});

