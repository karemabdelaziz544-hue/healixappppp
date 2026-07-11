import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { handleError } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';
import { showToast } from '../../components/AppToast';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { AppColors, AppRadius, AppSpacing, AppFontSize } from '../../constants/AppTheme';

export default function SignupScreen() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('male');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // أنيميشن لدخول الشاشة بنعومة (Fade In & Scale)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true })
    ]).start();
  }, []);

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

      // 3. إنشاء أو تحديث بروفايل المستخدم
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: name,
        phone: phone,
        gender: gender,
        subscription_status: 'new',
        role: 'client',
        updated_at: new Date().toISOString(),
      });

      showToast.success('تم إنشاء الحساب! تفقد بريدك لإدخال الكود.');
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* دوائر الخلفية التجميلية */}
      <View style={[styles.bgCircle, styles.circleTopRight]} />
      <View style={[styles.bgCircle, styles.circleBottomLeft]} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <Animated.View style={[styles.formCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>

          <View style={styles.header}>
            <Image source={require('../../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
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

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <AuthInput label="رقم الهاتف" placeholder="01xxxxxxxxx" value={phone} onChangeText={setPhone} keyboardType="phone-pad" isLTR={true} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>النوع</Text>
                  <View style={styles.genderToggle}>
                    <TouchableOpacity style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]} onPress={() => setGender('male')}>
                      <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>ذكر</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]} onPress={() => setGender('female')}>
                      <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>أنثى</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <AuthButton title="التالي" onPress={handleNextStep} />
            </>
          ) : (
            <>
              {/* نموذج التسجيل - الخطوة الثانية */}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <AuthInput label="كلمة المرور" isPassword placeholder="••••••••" value={password} onChangeText={setPassword} />
                </View>
                <View style={{ flex: 1 }}>
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

              <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(1)} activeOpacity={0.8}>
                <Text style={styles.backStepBtnText}>العودة للخطوة السابقة</Text>
              </TouchableOpacity>
            </>
          )}

          {/* رابط تسجيل الدخول */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>لديك حساب بالفعل؟ </Text>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={styles.loginLink}>سجل دخولك</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.legalFooter}>
            <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync('https://healix.app/terms')}>
              <Text style={styles.legalLink}>شروط الخدمة</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}> • </Text>
            <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync('https://healix.app/privacy')}>
              <Text style={styles.legalLink}>سياسة الخصوصية</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: AppSpacing.xl },

  bgCircle: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.4 },
  circleTopRight: { backgroundColor: AppColors.successLight, top: -100, right: -150 },
  circleBottomLeft: { backgroundColor: AppColors.accentBorder, bottom: -100, left: -150 },

  formCard: { 
    backgroundColor: AppColors.surface, 
    padding: AppSpacing.xxxl, 
    borderRadius: AppRadius.xxl, 
    elevation: 10, 
    shadowColor: AppColors.primary, 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 20 
  },

  header: { alignItems: 'center', marginBottom: AppSpacing.xxxl },
  logo: { width: 70, height: 70, marginBottom: AppSpacing.lg, borderRadius: AppRadius.xl },
  title: { fontSize: AppFontSize.title, fontWeight: '900', color: AppColors.primary, marginBottom: AppSpacing.xs, textAlign: 'center' },
  subtitle: { fontSize: AppFontSize.md, color: AppColors.textSecondary, fontWeight: 'bold', textAlign: 'center' },

  row: { flexDirection: 'row-reverse', gap: AppSpacing.lg, marginBottom: AppSpacing.lg },
  label: { fontSize: AppFontSize.sm, fontWeight: 'bold', color: AppColors.textSecondary, textAlign: 'right', marginBottom: AppSpacing.sm },

  genderToggle: { flexDirection: 'row-reverse', backgroundColor: AppColors.inputBg, height: 55, borderRadius: AppRadius.lg, padding: 4 },
  genderBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: AppRadius.md },
  genderBtnActive: { backgroundColor: AppColors.surface, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 },
  genderText: { fontSize: AppFontSize.md, fontWeight: 'bold', color: AppColors.textMuted },
  genderTextActive: { color: AppColors.primary },

  footer: { flexDirection: 'row-reverse', justifyContent: 'center', marginTop: AppSpacing.xxl },
  footerText: { color: AppColors.textSecondary, fontSize: AppFontSize.md, fontWeight: 'bold' },
  loginLink: { color: AppColors.accent, fontSize: AppFontSize.md, fontWeight: '900' },

  // Stepper Styles
  stepperContainer: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', marginBottom: AppSpacing.xxxl, gap: 10 },
  stepIndicator: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: AppColors.inputBg, justifyContent: 'center', alignItems: 'center' },
  stepCircleActive: { backgroundColor: AppColors.primary },
  stepCircleText: { fontSize: 12, fontWeight: 'bold', color: AppColors.textMuted, fontFamily: 'Tajawal-Bold' },
  stepCircleTextActive: { color: '#FFF' },
  stepLabel: { fontSize: 13, color: AppColors.textMuted, fontFamily: 'Tajawal-Bold' },
  stepLabelActive: { color: AppColors.primary },
  stepLine: { flex: 1, height: 2, backgroundColor: AppColors.inputBg, maxWidth: 60 },
  stepLineActive: { backgroundColor: AppColors.primary },

  // Password Strength
  strengthContainer: { width: '100%', marginBottom: AppSpacing.lg, alignItems: 'flex-end' },
  strengthBarBg: { width: '100%', height: 6, backgroundColor: AppColors.inputBg, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  strengthBarFill: { height: '100%', borderRadius: 3 },
  strengthText: { fontSize: 12, fontFamily: 'Tajawal-Medium' },

  // Back Button
  backStepBtn: { marginTop: 15, paddingVertical: 12, alignItems: 'center', width: '100%' },
  backStepBtnText: { color: AppColors.textSecondary, fontSize: 14, fontFamily: 'Tajawal-Bold' },
  legalFooter: { flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', marginTop: AppSpacing.xl, gap: 5 },
  legalLink: { color: AppColors.textSecondary, fontSize: AppFontSize.sm, textDecorationLine: 'underline', fontWeight: 'bold' },
  legalSeparator: { color: AppColors.textMuted, fontSize: AppFontSize.sm },
});