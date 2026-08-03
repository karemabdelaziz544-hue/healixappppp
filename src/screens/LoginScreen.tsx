import { Text } from '@/components/AppText';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, View, ScrollView } from 'react-native';
import { SlideInView } from '../../components/animations/SlideInView';
import { AnimatedButton } from '../../components/animations/AnimatedButton';
import { showToast } from '../../components/AppToast';
import { AppColors, AppRadius, AppSpacing, AppFontSize, AppFontFamily } from '../../constants/AppTheme';
import { handleError } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { Logo } from '../../components/Logo';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      showToast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      handleError(error, 'Login');
    } else {
      setEmail('');
      setPassword('');
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      showToast.error('يرجى كتابة البريد الإلكتروني أولاً لاستعادة كلمة المرور');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim()); 
    setLoading(false);

    if (error) {
      handleError(error, 'ResetPassword');
    } else {
      showToast.success('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* دوائر الخلفية التجميلية */}
      <View style={[styles.bgCircle, styles.circleTopRight]} />
      <View style={[styles.bgCircle, styles.circleBottomLeft]} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SlideInView direction="up" distance={20} style={[styles.formCard]}>

          <View style={styles.header}>
            <View style={{ marginBottom: AppSpacing.md, alignSelf: 'flex-start' }}>
              <Logo width={72} height={72} color={AppColors.primary} />
            </View>
            <Text style={styles.title}>مرحباً بعودتك</Text>
            <Text style={styles.subtitle}>سجل دخولك لمتابعة خطتك الحالية</Text>
          </View>

          <AuthInput
            label="البريد الإلكتروني"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            hint="اكتب إيميلك أولاً لاستخدام خاصية نسيت كلمة المرور"
            isLTR={true}
          />

          <AuthInput
            label="كلمة المرور"
            isPassword
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            headerRight={
              <AnimatedButton onPress={handleForgotPassword} accessibilityRole="button">
                <Text style={styles.forgotPasswordText}>نسيت كلمة المرور؟</Text>
              </AnimatedButton>
            }
          />

          <AuthButton title="تسجيل الدخول" onPress={handleLogin} loading={loading} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>ليس لديك حساب؟ </Text>
            <AnimatedButton onPress={() => router.replace('/signup')}>
              <Text style={styles.signupLink}>حساب جديد</Text>
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

  forgotPasswordText: { fontSize: AppFontSize.sm, color: AppColors.accent, fontFamily: AppFontFamily.bold },

  footer: { flexDirection: 'row', justifyContent: 'flex-start', marginTop: AppSpacing.xxl, alignItems: 'center' },
  footerText: { color: AppColors.textSecondary, fontSize: AppFontSize.md, fontFamily: AppFontFamily.medium },
  signupLink: { color: AppColors.accent, fontSize: AppFontSize.md, fontFamily: AppFontFamily.bold },
  legalFooter: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginTop: AppSpacing.xxl, gap: 6 },
  legalLink: { color: AppColors.textMuted, fontSize: AppFontSize.sm, fontFamily: AppFontFamily.medium },
  legalSeparator: { color: AppColors.textMuted, fontSize: AppFontSize.sm },
});