import { Text } from '@/components/AppText';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, AppRadius, AppFontFamily } from '../../../../constants/AppTheme';
import { FadeInView } from '../../../../components/animations/FadeInView';
import { AnimatedButton } from '../../../../components/animations/AnimatedButton';

interface WelcomeJourneyCarouselProps {
  userId?: string;
  isPremium: boolean;
}

const CAROUSEL_STEPS = [
  {
    title: 'أهلاً بك في Healix Premium! 🎉',
    desc: 'تم تفعيل جميع المميزات المتقدمة وتخصيص تجربتك الصحية الكاملة.',
    icon: 'sparkles',
    color: '#8B5CF6',
  },
  {
    title: 'المدرب الطبي الذكي جاهز 🤖',
    desc: 'يمكنك الآن استشارة الذكاء الاصطناعي على مدار الساعة وتحليل مكونات جسمك بالـ InBody.',
    icon: 'chatbubbles',
    color: '#3B82F6',
  },
  {
    title: 'النظام الغذائي والوجبات 🥗',
    desc: 'استعرض جدول وجباتك اليومية الموصوفة من طبيبك وتتبع السعرات والبدائل.',
    icon: 'restaurant',
    color: '#10B981',
  },
  {
    title: 'البرنامج التدريبي والتمارين 🏋️',
    desc: 'مارس تمارينك اليومية بالفيديو وتتبع أوزانك وجولاتك خطوة بخطوة.',
    icon: 'barbell',
    color: '#F59E0B',
  },
  {
    title: 'المتابعة المباشرة مع الطبيب 👨‍⚕️',
    desc: 'تواصل مباشرة مع طبيبك المتابع وشاهد التوصيات والملاحظات الدورية.',
    icon: 'pulse',
    color: '#EC4899',
  },
];

export const WelcomeJourneyCarousel: React.FC<WelcomeJourneyCarouselProps> = ({ userId, isPremium }) => {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!isPremium || !userId) return;

    const checkWelcomeStatus = async () => {
      try {
        const storageKey = `healix_welcome_seen_${userId}`;
        const hasSeen = await AsyncStorage.getItem(storageKey);
        if (!hasSeen) {
          setVisible(true);
        }
      } catch (err) {
        // quiet fallback
      }
    };
    checkWelcomeStatus();
  }, [isPremium, userId]);

  const handleNext = async () => {
    if (stepIndex < CAROUSEL_STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      try {
        if (userId) {
          await AsyncStorage.setItem(`healix_welcome_seen_${userId}`, 'true');
        }
      } catch (err) {
        // quiet fallback
      }
      setVisible(false);
    }
  };

  if (!visible) return null;

  const currentStep = CAROUSEL_STEPS[stepIndex];

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <FadeInView style={styles.modalCard}>
          <View style={[styles.iconCircle, { backgroundColor: `${currentStep.color}15`, borderColor: `${currentStep.color}30` }]}>
            <Ionicons name={currentStep.icon as any} size={44} color={currentStep.color} />
          </View>

          <Text style={styles.title}>{currentStep.title}</Text>
          <Text style={styles.desc}>{currentStep.desc}</Text>

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            {CAROUSEL_STEPS.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === stepIndex && { backgroundColor: currentStep.color, width: 24 },
                ]}
              />
            ))}
          </View>

          <AnimatedButton
            style={[styles.nextBtn, { backgroundColor: currentStep.color }]}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>
              {stepIndex === CAROUSEL_STEPS.length - 1 ? 'انطلق للرئيسية 🚀' : 'التالي'}
            </Text>
          </AnimatedButton>
        </FadeInView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.xl,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 16,
  },
  title: {
    fontFamily: AppFontFamily.bold,
    fontSize: 19,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  desc: {
    fontFamily: AppFontFamily.medium,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  nextBtn: {
    width: '100%',
    height: 50,
    borderRadius: AppRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnText: {
    fontFamily: AppFontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
