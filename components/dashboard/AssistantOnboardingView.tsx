import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppColors, AppRadius } from '../../constants/AppTheme';
import { useFamily } from '../../src/context/FamilyContext';
import { supabase } from '../../src/lib/supabase';
import { logger } from '../../src/lib/logger';

/**
 * AssistantOnboardingView — مساعد تهيئة العميل الجديد
 * =====================================================
 * يظهر للعميل الذي دفع ولم يكمل بياناته الطبية بعد.
 * يعرض قائمة خطوات مع حالة الإكمال لكل خطوة.
 * كل خطوة فيها زرار "تم" يدوي + كل خطوة تنقل للتاب المناسب.
 * عند إكمال كل الخطوات → يتم تحديث is_onboarded = true تلقائياً.
 */

interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  bg: string;
  route: string;
  checkFn: (userId: string) => Promise<boolean>;
}

export default function AssistantOnboardingView() {
  const { currentProfile, refreshFamily } = useFamily();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = currentProfile?.id;
  const userName = currentProfile?.full_name?.split(' ')[0] || '';

  const [completionStatus, setCompletionStatus] = useState<Record<string, boolean>>({});
  const [manuallyCompleted, setManuallyCompleted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'inbody',
      title: 'قياسات InBody',
      subtitle: 'ارفع تقرير InBody أو أدخل قياساتك يدوياً',
      icon: 'body',
      color: '#F97316',
      bg: '#FFF7ED',
      route: '/(tabs)/medical',
      checkFn: async (uid) => {
        const { count } = await supabase.from('inbody_records').select('id', { count: 'exact', head: true }).eq('user_id', uid);
        return (count ?? 0) > 0;
      },
    },
    {
      id: 'docs',
      title: 'التحاليل والمستندات',
      subtitle: 'ارفع نتائج تحاليلك الطبية (اختياري)',
      icon: 'document-text',
      color: '#3B82F6',
      bg: '#DBEAFE',
      route: '/(tabs)/medical',
      checkFn: async (uid) => {
        const { count } = await supabase.from('client_documents').select('id', { count: 'exact', head: true }).eq('user_id', uid);
        return (count ?? 0) > 0;
      },
    },
    {
      id: 'health',
      title: 'الملف الصحي',
      subtitle: 'أخبرنا عن حالتك الصحية والأمراض والحساسيات',
      icon: 'heart-half',
      color: '#EF4444',
      bg: '#FEE2E2',
      route: '/(tabs)/medical',
      checkFn: async (uid) => {
        const { data } = await supabase.from('health_profile').select('id').eq('user_id', uid).maybeSingle();
        return !!data;
      },
    },
    {
      id: 'lifestyle',
      title: 'نمط الحياة',
      subtitle: 'أخبرنا عن عاداتك الغذائية ونظام يومك',
      icon: 'cafe',
      color: '#10B981',
      bg: '#D1FAE5',
      route: '/(tabs)/medical',
      checkFn: async (uid) => {
        const { data } = await supabase.from('lifestyle_profile').select('id').eq('user_id', uid).maybeSingle();
        return !!data;
      },
    },
  ];

  const checkAllSteps = useCallback(async () => {
    if (!userId) return;
    const results: Record<string, boolean> = {};
    for (const step of steps) {
      try {
        results[step.id] = await step.checkFn(userId);
      } catch {
        results[step.id] = false;
      }
    }
    setCompletionStatus(results);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    checkAllSteps();
  }, [checkAllSteps]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkAllSteps();
    setRefreshing(false);
  }, [checkAllSteps]);

  // 🔥 حساب الخطوات المكتملة (من الداتابيز + المحددة يدوياً)
  const isStepDone = (stepId: string) => completionStatus[stepId] || manuallyCompleted[stepId] || false;
  
  // ✅ جعل التحاليل (docs) اختيارية
  const mandatorySteps = steps.filter(s => s.id !== 'docs');
  const completedMandatoryCount = mandatorySteps.filter(s => isStepDone(s.id)).length;
  const totalMandatorySteps = mandatorySteps.length;
  
  // التقدم مبني على الخطوات الإجبارية فقط
  const progressPercent = totalMandatorySteps > 0 ? Math.round((completedMandatoryCount / totalMandatorySteps) * 100) : 0;
  const allDone = completedMandatoryCount === totalMandatorySteps;

  // 🔥 تحديد الخطوة كمكتملة يدوياً
  const handleManualComplete = (stepId: string) => {
    Alert.alert(
      "تأكيد",
      "هل تريد تحديد هذه الخطوة كمكتملة؟",
      [
        { text: "لا", style: "cancel" },
        {
          text: "نعم، تم ✅",
          onPress: () => {
            setManuallyCompleted(prev => ({ ...prev, [stepId]: true }));
          },
        },
      ]
    );
  };

  // 🔥 عند إكمال كل الخطوات → تحديث is_onboarded في الداتابيز
  useEffect(() => {
    if (!allDone || !userId || loading) return;

    const markOnboarded = async () => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ is_onboarded: true })
          .eq('id', userId);

        if (error) throw error;
        logger.log('✅ is_onboarded updated to true');
        // تحديث البروفايل في الـ Context → الداشبورد هيتحول لـ MainDashboardView
        refreshFamily();
      } catch (err) {
        logger.error('Error updating is_onboarded:', err);
      }
    };

    // تأخير بسيط عشان اليوزر يشوف الـ 100% قبل ما الشاشة تتغير
    const timer = setTimeout(markOnboarded, 1500);
    return () => clearTimeout(timer);
  }, [allDone, userId, loading]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.primary]} />}
      >
        {/* 🔥 Header ترحيبي */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconBox}>
            <Ionicons name="rocket" size={36} color={AppColors.primary} />
          </View>
          <Text style={styles.heroTitle}>
            مرحباً {userName}! 🎉
          </Text>
          <Text style={styles.heroSubtitle}>
            تم تفعيل اشتراكك بنجاح! أكمل الخطوات التالية عشان الكوتش يقدر يصمملك خطتك الشخصية.
          </Text>
        </View>

        {/* 🔥 Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{completedMandatoryCount} من {totalMandatorySteps} خطوات إجبارية</Text>
            <Text style={styles.progressPercent}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          {allDone && (
            <View style={styles.allDoneBanner}>
              <Ionicons name="checkmark-circle" size={18} color={AppColors.success} />
              <Text style={styles.allDoneText}>ممتاز! كل البيانات مكتملة — جاري تحويلك للداشبورد...</Text>
            </View>
          )}
        </View>

        {/* 🔥 Steps List */}
        <Text style={styles.sectionTitle}>خطواتك القادمة</Text>

        {steps.map((step) => {
          const isDone = isStepDone(step.id);

          return (
            <View key={step.id} style={[styles.stepCard, isDone && styles.stepCardDone]}>
              {/* الكارت الأساسي — ينقل للصفحة */}
              <TouchableOpacity
                style={styles.stepMainRow}
                activeOpacity={0.8}
                onPress={() => router.push(step.route as any)}
              >
                {/* الأيقونة */}
                <View style={[styles.stepIconBox, { backgroundColor: isDone ? '#F3F4F6' : step.bg }]}>
                  {isDone ? (
                    <Ionicons name="checkmark-circle" size={28} color={AppColors.success} />
                  ) : (
                    <Ionicons name={step.icon as any} size={24} color={step.color} />
                  )}
                </View>

                {/* المحتوى */}
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, isDone && styles.stepTitleDone]}>
                    {step.title}
                  </Text>
                  <Text style={[styles.stepSubtitle, isDone && styles.stepSubtitleDone]}>
                    {isDone ? 'تم إكمال هذه الخطوة ✅' : step.subtitle}
                  </Text>
                </View>

                {/* السهم */}
                <View style={styles.stepArrow}>
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={isDone ? '#D1D5DB' : step.color}
                  />
                </View>
              </TouchableOpacity>

              {/* 🔥 زرار "تم" اليدوي — يظهر فقط لو الخطوة لسه مش مكتملة */}
              {!isDone && (
                <TouchableOpacity
                  style={styles.markDoneBtn}
                  activeOpacity={0.7}
                  onPress={() => handleManualComplete(step.id)}
                >
                  <Text style={styles.markDoneBtnText}>تم ✓</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* ملاحظة مساعدة */}
        <View style={styles.helpNote}>
          <Ionicons name="information-circle" size={20} color={AppColors.textMuted} />
          <Text style={styles.helpNoteText}>
            يمكنك الضغط على "تم" بجانب أي خطوة لتحديدها كمكتملة حتى لو لم ترفع ملفات. بعد إكمال جميع الخطوات سيتم تحويلك تلقائياً للداشبورد.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: 25,
  },
  heroIconBox: {
    width: 80,
    height: 80,
    borderRadius: 25,
    backgroundColor: AppColors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: AppColors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600',
    paddingHorizontal: 5,
  },

  // Progress Card
  progressCard: {
    backgroundColor: AppColors.primary,
    borderRadius: 25,
    padding: 22,
    marginBottom: 30,
    elevation: 4,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  progressHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  progressPercent: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: AppColors.accent,
    borderRadius: 8,
  },
  allDoneBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 12,
    marginTop: 15,
  },
  allDoneText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
    lineHeight: 18,
  },

  // Section Title
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: AppColors.textPrimary,
    textAlign: 'right',
    marginBottom: 18,
  },

  // Step Cards
  stepCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  stepCardDone: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    elevation: 0,
    shadowOpacity: 0,
  },
  stepMainRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 18,
  },
  stepIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
  },
  stepContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  stepTitleDone: {
    color: '#9CA3AF',
  },
  stepSubtitle: {
    fontSize: 13,
    color: AppColors.textSecondary,
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 18,
  },
  stepSubtitleDone: {
    color: '#9CA3AF',
  },
  stepArrow: {
    marginRight: 5,
  },

  // ✅ Mark Done Button
  markDoneBtn: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  markDoneBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: AppColors.success,
  },

  // Help Note
  helpNote: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  helpNoteText: {
    flex: 1,
    fontSize: 13,
    color: AppColors.textMuted,
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 20,
  },
});
