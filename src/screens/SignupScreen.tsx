import { Text } from '@/components/AppText';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SlideInView } from '../../components/animations/SlideInView';
import { AnimatedButton } from '../../components/animations/AnimatedButton';
import { handleError } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';
import { showToast } from '../../components/AppToast';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { AppColors, AppRadius, AppSpacing, AppFontSize , AppFontFamily } from '@/constants/AppTheme';
import { Logo } from '../../components/Logo';

export default function SignupScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 480;

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('male');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'أدخل كلمة المرور', icon: 'key-outline', color: AppColors.textMuted };
    if (pass.length < 6) return { score: 1, label: 'ضعيفة جداً (يجب أن تكون 6 أحرف على الأقل)', icon: 'close-circle', color: AppColors.danger };
    
    let score = 2; // starts as medium
    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    const hasSpecial = /[^A-Za-z0-9]/.test(pass);
    
    if (pass.length >= 8 && hasLetters && hasNumbers && hasSpecial) {
      score = 3; // strong
    }
    
    if (score === 3) {
      return { score: 3, label: 'قوية جداً!', icon: 'shield-checkmark', color: AppColors.success };
    }
    return { score: 2, label: 'متوسطة (أضف أرقاماً ورموزاً)', icon: 'warning', color: AppColors.warning };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleNextStep = () => {
    if (!name || !email || !phone) {
      showToast.error('يرجى إكمال جميع الحقول');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast.error('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (!phoneRegex.test(phone)) {
      showToast.error('يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678)');
      return;
    }

    setStep(2);
  };

  const handleSignup = async () => {
    if (!password || !confirmPassword) {
      showToast.error('يرجى إكمال جميع الحقول');
      return;
    }

    if (password !== confirmPassword) {
      showToast.error('كلمات المرور غير متطابقة');
      return;
    }
    if (password.length < 6) {
      showToast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setLoading(true);

    try {
      // 2. إنشاء الحساب في Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: name,
            phone: phone,
            gender: gender,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('تعذر إنشاء الحساب');

      // 3. Profile is created automatically by database trigger (handle_new_user) from raw_user_meta_data.
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: name,
          phone: phone,
          gender: gender,
          subscription_status: 'new',
          role: 'client',
          updated_at: new Date().toISOString(),
        });
      } catch {}

      showToast.success('تم إنشاء الحساب بنجاح!');
      router.push({
        pathname: '/verify',
        params: { email: email.trim() }
      });

    } catch (err: unknown) {
      handleError(err, 'Signup');
    } finally {
      setLoading(false);
    }
  };

  const rowStyle = [styles.row, isMobile && { flexDirection: 'column' as const, gap: 0 }];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* دوائر الخلفية التجميلية */}
      <View style={[styles.bgCircle, styles.circleTopRight]} />
      <View style={[styles.bgCircle, styles.circleBottomLeft]} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <SlideInView direction="up" distance={20} style={[styles.formCard]}>

          <View style={styles.header}>
            <View style={{ marginBottom: AppSpacing.md, alignSelf: 'flex-start' }}>
              <Logo width={72} height={72} color={AppColors.primary} />
            </View>
            <Text style={styles.title}>انضم لعائلة هيليكس</Text>
            <Text style={styles.subtitle}>ابدأ رحلة صحية جديدة ومخصصة لك</Text>
          </View>

          {/* Progress Stepper */}
          <View style={styles.stepperContainer}>
            <View style={styles.stepIndicator}>
              <View style={[styles.stepCircle, step >= 1 && styles.stepCircleActive]}>
                <Text style={[styles.stepCircleText, step >= 1 && styles.stepCircleTextActive]}>1</Text>
              </View>
              <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>الهوية والاتصال</Text>
            </View>
            <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
            <View style={styles.stepIndicator}>
              <View style={[styles.stepCircle, step === 2 && styles.stepCircleActive]}>
                <Text style={[styles.stepCircleText, step === 2 && styles.stepCircleTextActive]}>2</Text>
              </View>
              <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>الأمان وكلمة المرور</Text>
            </View>
          </View>

          {step === 1 ? (
            <>
              {/* نموذج التسجيل - الخطوة الأولى */}
              <AuthInput label="الاسم بالكامل" placeholder="مثال: أحمد محمد" value={name} onChangeText={setName} />
              
              <AuthInput label="البريد الإلكتروني" placeholder="name@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" isLTR={true} />

              <View style={rowStyle}>
                <View style={{ flex: isMobile ? undefined : 1, marginBottom: isMobile ? AppSpacing.lg : 0 }}>
                  <Text style={styles.label}>النوع</Text>
                  <View style={styles.genderToggle}>
                    <AnimatedButton style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]} onPress={() => setGender('male')}>
                      <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>ذكر</Text>
                    </AnimatedButton>
                    <AnimatedButton style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]} onPress={() => setGender('female')}>
                      <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>أنثى</Text>
                    </AnimatedButton>
                  </View>
                </View>

                <View style={{ flex: isMobile ? undefined : 1 }}>
                  <AuthInput label="رقم الهاتف" placeholder="01xxxxxxxxx" value={phone} onChangeText={setPhone} keyboardType="phone-pad" isLTR={true} />
                </View>
              </View>

              <AuthButton title="التالي" onPress={handleNextStep} />
            </>
          ) : (
            <>
              {/* نموذج التسجيل - الخطوة الثانية */}
              <View style={rowStyle}>
                <View style={{ flex: isMobile ? undefined : 1 }}>
                  <AuthInput label="كلمة المرور" isPassword placeholder="••••••••" value={password} onChangeText={setPassword} />
                </View>
                <View style={{ flex: isMobile ? undefined : 1 }}>
                  <AuthInput label="تأكيد المرور" isPassword placeholder="••••••••" value={confirmPassword} onChangeText={setConfirmPassword} />
                </View>
              </View>

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBarBg}>
                    <View 
                      style={[
                        styles.strengthBarFill, 
                        { 
                          width: passwordStrength.score === 1 ? '33%' : passwordStrength.score === 2 ? '66%' : '100%',
                          backgroundColor: passwordStrength.color 
                        }
                      ]} 
                    />
                  </View>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                    <Ionicons name={passwordStrength.icon as any} size={14} color={passwordStrength.color} />
                    <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                      {passwordStrength.label}
                    </Text>
                  </View>
                </View>
              )}

              <AuthButton title="إنشاء حساب جديد" onPress={handleSignup} loading={loading} />

              <AnimatedButton style={styles.backStepBtn} onPress={() => setStep(1)} activeOpacity={0.8}>
                <Text style={styles.backStepBtnText}>العودة للخطوة السابقة</Text>
              </AnimatedButton>
            </>
          )}

          {/* رابط تسجيل الدخول */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>لديك حساب بالفعل؟ </Text>
            <AnimatedButton onPress={() => router.replace('/login')}>
              <Text style={styles.loginLink}>سجل دخولك</Text>
            </AnimatedButton>
          </View>

          <View style={styles.legalFooter}>
            <AnimatedButton onPress={() => WebBrowser.openBrowserAsync('https://healix.app/terms')}>
              <Text style={styles.legalLink}>شروط الخدمة</Text>
            </AnimatedButton>
            <Text style={styles.legalSeparator}> • </Text>
            <AnimatedButton onPress={() => WebBrowser.openBrowserAsync('https://healix.app/privacy')}>
              <Text style={styles.legalLink}>سياسة الخصوصية</Text>
            </AnimatedButton>
          </View>

        </SlideInView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: AppSpacing.xl },

  bgCircle: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.25 },
  circleTopRight: { backgroundColor: AppColors.accentBorder, top: -120, end: -120 },
  circleBottomLeft: { backgroundColor: AppColors.primaryLight, bottom: -150, start: -150 },

  formCard: { 
    backgroundColor: AppColors.surface, 
    paddingHorizontal: AppSpacing.xxl,
    paddingVertical: AppSpacing.xxxl, 
    borderRadius: AppRadius.xxl, 
    borderWidth: 1,
    borderColor: '#ECEFE8',
    elevation: 8, 
    shadowColor: AppColors.primary, 
    shadowOffset: { width: 0, height: 12 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 24 
  },

  header: { alignItems: 'flex-start', marginBottom: AppSpacing.xxxl, width: '100%' },
  logo: { width: 72, height: 72, borderRadius: 16, marginBottom: AppSpacing.md },
  title: { fontSize: AppFontSize.title, fontFamily: AppFontFamily.extraBold, color: AppColors.primary, marginBottom: AppSpacing.xs, alignSelf: 'flex-start' },
  subtitle: { fontSize: AppFontSize.md, color: AppColors.textSecondary, fontFamily: AppFontFamily.medium, alignSelf: 'flex-start' },

  row: { flexDirection: 'row', gap: AppSpacing.lg, marginBottom: AppSpacing.lg },
  label: { fontSize: AppFontSize.sm, fontFamily: AppFontFamily.bold, color: AppColors.textSecondary, textAlign: 'right', marginBottom: AppSpacing.sm, alignSelf: 'flex-start' },

  genderToggle: { flexDirection: 'row', backgroundColor: AppColors.inputBg, height: 55, borderRadius: AppRadius.lg, padding: 4 },
  genderBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: AppRadius.md },
  genderBtnActive: { backgroundColor: AppColors.surface, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 },
  genderText: { fontSize: AppFontSize.md, fontFamily: AppFontFamily.bold, color: AppColors.textMuted },
  genderTextActive: { color: AppColors.primary },

  footer: { flexDirection: 'row', justifyContent: 'flex-start', marginTop: AppSpacing.xxl, alignItems: 'center' },
  footerText: { color: AppColors.textSecondary, fontSize: AppFontSize.md, fontFamily: AppFontFamily.medium },
  loginLink: { color: AppColors.accent, fontSize: AppFontSize.md, fontFamily: AppFontFamily.bold },

  // Stepper Styles
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: AppSpacing.xxxl, gap: 10 },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: AppColors.inputBg, justifyContent: 'center', alignItems: 'center' },
  stepCircleActive: { backgroundColor: AppColors.primary },
  stepCircleText: { fontSize: 12, color: AppColors.textMuted, fontFamily: AppFontFamily.bold },
  stepCircleTextActive: { color: '#FFF' },
  stepLabel: { fontSize: 13, color: AppColors.textMuted, fontFamily: AppFontFamily.bold },
  stepLabelActive: { color: AppColors.primary },
  stepLine: { flex: 1, height: 2, backgroundColor: AppColors.inputBg, maxWidth: 60 },
  stepLineActive: { backgroundColor: AppColors.primary },

  // Password Strength
  strengthContainer: { width: '100%', marginBottom: AppSpacing.lg, alignItems: 'flex-start' },
  strengthBarBg: { width: '100%', height: 6, backgroundColor: AppColors.inputBg, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  strengthBarFill: { height: '100%', borderRadius: 3 },
  strengthText: { fontSize: 12, fontFamily: AppFontFamily.medium },

  // Back Button
  backStepBtn: { marginTop: 15, paddingVertical: 12, alignItems: 'flex-start', width: '100%' },
  backStepBtnText: { color: AppColors.textSecondary, fontSize: 14, fontFamily: AppFontFamily.bold },
  legalFooter: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginTop: AppSpacing.xxl, gap: 6 },
  legalLink: { color: AppColors.textMuted, fontSize: AppFontSize.sm, fontFamily: AppFontFamily.medium },
  legalSeparator: { color: AppColors.textMuted, fontSize: AppFontSize.sm },
});