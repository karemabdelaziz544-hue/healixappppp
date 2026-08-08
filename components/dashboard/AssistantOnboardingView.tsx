import { Text } from '@/components/AppText';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, RefreshControl, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppColors, AppRadius, AppSpacing, AppFontSize, AppFontFamily } from '../../constants/AppTheme';
import { useFamily } from '../../src/context/FamilyContext';
import { supabase } from '../../src/lib/supabase';
import { logger } from '../../src/lib/logger';

/**
 * AssistantOnboardingView — قائمة إكمال البيانات الطبية (Vitality Style)
 * ===================================================================
 * مصممة بدقة لتطابق الـ HTML والـ UI المعتمد للـ Onboarding.
 */

interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  isMandatory: boolean;
  route: string;
}

export default function AssistantOnboardingView() {
  const { currentProfile, refreshFamily, optimisticUpdateProfile } = useFamily();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = currentProfile?.id;
  const userName = currentProfile?.full_name?.split(' ')[0] || 'مستخدم';
  const avatarUrl = currentProfile?.avatar_url;

  const [completionStatus, setCompletionStatus] = useState<Record<string, boolean>>({});
  const [manuallyCompleted, setManuallyCompleted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // قائمة الخطوات الـ 4 المطابقة للتصميم
  const steps = useMemo<OnboardingStep[]>(() => [
    {
      id: 'inbody',
      title: 'قياسات InBody',
      subtitle: 'ارفع تقرير InBody أو أدخل قياساتك يدوياً',
      icon: 'fitness',
      isMandatory: true,
      route: '/(tabs)/medical',
    },
    {
      id: 'health',
      title: 'الملف الصحي',
      subtitle: 'لم يتم استكمال البيانات الطبية والأمراض',
      icon: 'heart',
      isMandatory: true,
      route: '/(tabs)/medical',
    },
    {
      id: 'lifestyle',
      title: 'نمط الحياة',
      subtitle: 'حدد عاداتك الغذائية والرياضية ونظامك اليومي',
      icon: 'restaurant',
      isMandatory: true,
      route: '/(tabs)/medical',
    },
    {
      id: 'docs',
      title: 'التحاليل والمستندات',
      subtitle: 'رفع ملفات PDF أو صور التحاليل الطبية',
      icon: 'document-text',
      isMandatory: false,
      route: '/(tabs)/medical',
    },
  ], []);

  // فحص حالة جميع الخطوات
  const checkAllSteps = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.rpc('get_user_onboarding_status', { target_uid: userId });
      
      const statusMap: Record<string, boolean> = {};
      
      if (!error && data) {
        statusMap['inbody'] = data.has_inbody ?? false;
        statusMap['health'] = data.has_health_profile ?? false;
        statusMap['lifestyle'] = data.has_lifestyle_profile ?? false;
        statusMap['docs'] = data.has_client_documents ?? false;
      } else {
        // Fallback to false if RPC fails
        steps.forEach(s => statusMap[s.id] = false);
      }

      setCompletionStatus(statusMap);
    } catch (err) {
      logger.error('Error checking onboarding steps:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, steps]);

  useEffect(() => {
    setLoading(true);
    checkAllSteps();
  }, [checkAllSteps]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkAllSteps();
    setRefreshing(false);
  }, [checkAllSteps]);

  const isStepDone = (stepId: string) => completionStatus[stepId] || manuallyCompleted[stepId] || false;
  
  // حساب الإنجاز المعتمد على الخطوات الإلزامية
  const mandatorySteps = steps.filter(s => s.isMandatory);
  const completedMandatoryCount = mandatorySteps.filter(s => isStepDone(s.id)).length;
  const totalMandatorySteps = mandatorySteps.length;
  
  const progressPercent = totalMandatorySteps > 0 ? Math.round((completedMandatoryCount / totalMandatorySteps) * 100) : 0;
  const allDone = completedMandatoryCount === totalMandatorySteps;

  const handleManualComplete = (stepId: string, title: string) => {
    Alert.alert(
      "تحديد كمكتمل",
      `هل تريد تحديد خطوة "${title}" كمكتملة؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "نعم، تم الإكمال",
          onPress: () => {
            setManuallyCompleted(prev => ({ ...prev, [stepId]: true }));
          },
        },
      ]
    );
  };

  const [completing, setCompleting] = useState(false);

  // 🚀 إكمال الأونبوردينج الموثوق بالأمر المباشر من RPC
  const handleCompleteOnboardingNow = useCallback(async () => {
    if (!userId || completing) return;
    setCompleting(true);

    try {
      // 1) تجربة الـ RPC المباشر (يتجاوز قيود RLS للأكونت الفرعي)
      const { error: rpcErr } = await supabase.rpc('complete_profile_onboarding', {
        target_profile_id: userId,
      });

      if (rpcErr) {
        logger.warn('RPC complete_profile_onboarding fallback:', rpcErr.message);
        // Fallback: التحديث المباشر للبروفايل
        await supabase.from('profiles').update({ is_onboarded: true }).eq('id', userId);
      }

      logger.log('✅ is_onboarded updated to true via RPC for profile:', userId);
    } catch (err) {
      logger.error('Error updating is_onboarded:', err);
    } finally {
      // ✅ Optimistic update: نحدّث الـ state فوراً في الـ Context
      optimisticUpdateProfile({ is_onboarded: true });
      refreshFamily();
      setCompleting(false);
    }
  }, [userId, completing, optimisticUpdateProfile, refreshFamily]);

  // التحويل التلقائي للداشبورد عند اكتمال كل الخطوات الإلزامية
  useEffect(() => {
    if (!allDone || !userId || loading) return;

    const timer = setTimeout(() => {
      handleCompleteOnboardingNow();
    }, 1000);

    return () => clearTimeout(timer);
  }, [allDone, userId, loading, handleCompleteOnboardingNow]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Top Navigation Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.notifBtn} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={22} color="#003527" />
        </TouchableOpacity>

        <View style={styles.userInfoRow}>
          <View style={styles.userTextCol}>
            <Text style={styles.welcomeText}>أهلاً بك، {userName}!</Text>
            <Text style={styles.appNameText}>حيوية شاملة</Text>
          </View>
          
          <View style={styles.avatarWrapper}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={20} color="#003527" />
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#003527']} />}
      >
        {/* 2. Welcome Header */}
        <View style={styles.welcomeHeader}>
          <View style={styles.activeSubscriptionPill}>
            <Ionicons name="sparkles" size={14} color="#F97316" />
            <Text style={styles.activeSubscriptionText}>تم تفعيل اشتراكك</Text>
          </View>

          <Text style={styles.mainTitle}>لنبدأ رحلتك الصحية</Text>
          <Text style={styles.mainSubtitle}>
            أكمل خطوات الإعداد للحصول على تجربة مخصصة بالكامل.
          </Text>
        </View>

        {/* 3. Hero Progress Card */}
        <View style={styles.heroProgressCard}>
          <View style={styles.heroProgressTop}>
            <View style={styles.percentCol}>
              <Text style={styles.percentNumber}>{progressPercent}%</Text>
              <Text style={styles.percentLabel}>معدل الإنجاز</Text>
            </View>

            <View style={styles.countCol}>
              <Text style={styles.countTitle}>{completedMandatoryCount} من {totalMandatorySteps} خطوات</Text>
              <Text style={styles.countSub}>خطوات إلزامية مكتملة</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          {allDone && (
            <View style={styles.allDoneBanner}>
              <Ionicons name="checkmark-circle" size={20} color="#F97316" />
              <Text style={styles.allDoneText}>
                ممتاز! كل البيانات مكتملة — جاري تحويلك للداشبورد...
              </Text>
            </View>
          )}
        </View>

        {/* 4. Tasks List */}
        <View style={styles.tasksList}>
          {steps.map((step) => {
            const isDone = isStepDone(step.id);

            return (
              <View key={step.id} style={isDone ? [styles.taskCard, styles.taskCardDone] : styles.taskCard}>
                <TouchableOpacity
                  style={styles.taskCardMain}
                  activeOpacity={0.85}
                  onPress={() => router.push(step.route as any)}
                  onLongPress={() => !isDone && handleManualComplete(step.id, step.title)}
                >
                  {/* الأيقونة الدائرية جهة اليمين */}
                  <View style={[styles.taskIconCircle, isDone ? styles.taskIconDoneBg : styles.taskIconPendingBg]}>
                    <Ionicons
                      name={step.icon}
                      size={26}
                      color={isDone ? '#F97316' : '#F97316'}
                    />
                  </View>

                  {/* التفاصيل والشارات بالمنتصف */}
                  <View style={styles.taskContentCol}>
                    <View style={styles.taskTitleRow}>
                      <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
                        {step.title}
                      </Text>

                      {isDone ? (
                        <View style={styles.doneBadge}>
                          <Text style={styles.doneBadgeText}>مكتمل</Text>
                        </View>
                      ) : step.isMandatory ? (
                        <View style={styles.mandatoryBadge}>
                          <Text style={styles.mandatoryBadgeText}>إلزامي</Text>
                        </View>
                      ) : (
                        <View style={styles.optionalBadge}>
                          <Text style={styles.optionalBadgeText}>اختياري</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.taskSub, isDone && styles.taskSubDone]}>
                      {isDone ? 'تم تحديث البيانات بنجاح' : step.subtitle}
                    </Text>
                  </View>

                  {/* الأيقونة/السهم جهة اليسار */}
                  <View style={styles.taskActionCol}>
                    {isDone ? (
                      <View style={styles.checkDoneCircle}>
                        <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" />
                      </View>
                    ) : (
                      <Ionicons name="chevron-back" size={20} color="#bfc9c3" />
                    )}
                  </View>
                </TouchableOpacity>

                {/* زر إكمال يدوي سريع للمستخدم لو الخطوة غير مكتملة */}
                {!isDone && (
                  <TouchableOpacity
                    style={styles.quickMarkDoneBar}
                    activeOpacity={0.7}
                    onPress={() => handleManualComplete(step.id, step.title)}
                  >
                    <Ionicons name="checkmark-done-outline" size={16} color="#F97316" />
                    <Text style={styles.quickMarkDoneText}>تحديد كمكتمل يدوي</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* 4.5 زر إكمال التسجيل المباشر والتفعيل */}
        <TouchableOpacity
          style={[styles.primaryCompleteBtn, completing && { opacity: 0.6 }]}
          activeOpacity={0.85}
          disabled={completing}
          onPress={handleCompleteOnboardingNow}
        >
          <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          <Text style={styles.primaryCompleteBtnText}>
            {completing ? 'جاري التحويل للداشبورد...' : 'تأكيد إكمال الإعداد والانتقال للداشبورد ✨'}
          </Text>
        </TouchableOpacity>

        {/* 5. Help Box */}
        <View style={styles.helpBox}>
          <View style={styles.helpIconBox}>
            <Ionicons name="information-circle" size={24} color="#F97316" />
          </View>
          <View style={styles.helpTextCol}>
            <Text style={styles.helpTitle}>هل تحتاج للمساعدة؟</Text>
            <Text style={styles.helpDesc}>
              فريقنا متاح على مدار الساعة لمساعدتك في إكمال ملفك الصحي. يمكنك إدخال البيانات أو الضغط على زر التخطي وإكمال البيانات لاحقاً.
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  // 1. Top Nav
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDEEEF',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userTextCol: {
    alignItems: 'flex-end',
  },
  welcomeText: {
    fontSize: 13,
    color: '#404944',
    fontFamily: AppFontFamily.medium,
  },
  appNameText: {
    fontSize: 16,
    color: '#003527',
    fontFamily: AppFontFamily.extraBold,
  },
  avatarWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#FFD7B0',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll Content
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // 2. Welcome Header
  welcomeHeader: {
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  activeSubscriptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  activeSubscriptionText: {
    fontSize: 12,
    color: '#F97316',
    fontFamily: AppFontFamily.bold,
  },
  mainTitle: {
    fontSize: 24,
    color: '#003527',
    fontFamily: AppFontFamily.extraBold,
    textAlign: 'right',
    marginBottom: 6,
    alignSelf: 'flex-start',
    width: '100%',
  },
  mainSubtitle: {
    fontSize: 14,
    color: '#404944',
    fontFamily: AppFontFamily.medium,
    textAlign: 'right',
    lineHeight: 20,
    alignSelf: 'flex-start',
    width: '100%',
  },

  // 3. Hero Progress Card
  heroProgressCard: {
    backgroundColor: '#003527',
    borderRadius: 24,
    padding: 22,
    marginBottom: 24,
    elevation: 6,
    shadowColor: '#003527',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  heroProgressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  percentCol: {
    alignItems: 'flex-start',
  },
  percentNumber: {
    fontSize: 42,
    color: '#F97316',
    fontFamily: AppFontFamily.extraBold,
    lineHeight: 46,
  },
  percentLabel: {
    fontSize: 12,
    color: '#FFEDD5',
    fontFamily: AppFontFamily.bold,
    marginTop: 2,
  },
  countCol: {
    alignItems: 'flex-end',
  },
  countTitle: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: AppFontFamily.bold,
  },
  countSub: {
    fontSize: 12,
    color: '#FFEDD5',
    fontFamily: AppFontFamily.medium,
    marginTop: 2,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: 'rgba(0, 53, 39, 0.4)',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F97316',
    borderRadius: 9999,
  },
  allDoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  allDoneText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: AppFontFamily.bold,
    flex: 1,
    textAlign: 'right',
  },

  // 4. Tasks List
  tasksList: {
    gap: 14,
    marginBottom: 24,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EDEEEF',
    elevation: 2,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  taskCardDone: {
    backgroundColor: '#F8F9FA',
    borderColor: '#EDEEEF',
    elevation: 0,
    shadowOpacity: 0,
  },
  taskCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  taskIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: 14,
  },
  taskIconPendingBg: {
    backgroundColor: '#FFF7ED',
  },
  taskIconDoneBg: {
    backgroundColor: '#FFF7ED',
  },
  taskContentCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 17,
    color: '#003527',
    fontFamily: AppFontFamily.extraBold,
    textAlign: 'right',
  },
  taskTitleDone: {
    color: '#707974',
  },
  mandatoryBadge: {
    backgroundColor: '#FFDAD6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  mandatoryBadgeText: {
    fontSize: 10,
    color: '#93000A',
    fontFamily: AppFontFamily.bold,
  },
  optionalBadge: {
    backgroundColor: '#E1E3E4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  optionalBadgeText: {
    fontSize: 10,
    color: '#404944',
    fontFamily: AppFontFamily.medium,
  },
  doneBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  doneBadgeText: {
    fontSize: 10,
    color: '#F97316',
    fontFamily: AppFontFamily.bold,
  },
  taskSub: {
    fontSize: 13,
    color: '#404944',
    fontFamily: AppFontFamily.medium,
    textAlign: 'right',
    lineHeight: 18,
    alignSelf: 'flex-start',
    width: '100%',
  },
  taskSubDone: {
    color: '#707974',
  },
  taskActionCol: {
    marginStart: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkDoneCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickMarkDoneBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#F3F4F5',
    borderTopWidth: 1,
    borderTopColor: '#EDEEEF',
  },
  quickMarkDoneText: {
    fontSize: 12,
    color: '#F97316',
    fontFamily: AppFontFamily.bold,
  },

  // 5. Help Box
  helpBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    marginTop: 6,
  },
  helpIconBox: {
    marginTop: 2,
  },
  helpTextCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  helpTitle: {
    fontSize: 14,
    color: '#F97316',
    fontFamily: AppFontFamily.bold,
    marginBottom: 4,
    textAlign: 'right',
  },
  helpDesc: {
    fontSize: 12,
    color: '#404944',
    fontFamily: AppFontFamily.medium,
    textAlign: 'right',
    lineHeight: 18,
  },

  // 6. Primary Completion CTA
  primaryCompleteBtn: {
    backgroundColor: '#003527',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 18,
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#003527',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryCompleteBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: AppFontFamily.bold,
    textAlign: 'center',
  },
});
