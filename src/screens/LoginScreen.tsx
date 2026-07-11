import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Animated, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { showToast } from '../../components/AppToast';
import { AppColors, AppRadius, AppSpacing, AppFontSize } from '../../constants/AppTheme';
import { handleError } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
    ]).start();
  }, []);

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
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim()); setLoading(false);

    if (error) {
      handleError(error, 'ResetPassword');
    } else {
      // ✅ Toast بدل Alert.alert للرسائل الإيجابية
      showToast.success('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* دوائر الخلفية التجميلية */}
      <View style={[styles.bgCircle, styles.circleTopRight]} />
      <View style={[styles.bgCircle, styles.circleBottomLeft]} />

      <Animated.View style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY }] }]}>

        <View style={styles.header}>
          <Image source={require('../../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>مرحباً بعودتك</Text>
          <Text style={styles.subtitle}>سجل دخولك لمتابعة خطتك الصحية</Text>
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
            <TouchableOpacity onPress={handleForgotPassword} accessibilityRole="button">
              <Text style={styles.forgotPasswordText}>نسيت كلمة المرور؟</Text>
            </TouchableOpacity>
          }
        />

        <AuthButton title="تسجيل الدخول" onPress={handleLogin} loading={loading} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>ليس لديك حساب؟ </Text>
          <TouchableOpacity onPress={() => router.replace('/signup')}>
            <Text style={styles.signupLink}>حساب جديد</Text>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background, justifyContent: 'center', padding: AppSpacing.xl },

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
  logo: { width: 80, height: 80, marginBottom: AppSpacing.lg, borderRadius: AppRadius.xl },
  title: { fontSize: AppFontSize.title, fontWeight: '900', color: AppColors.primary, marginBottom: AppSpacing.xs, textAlign: 'center' },
  subtitle: { fontSize: AppFontSize.md, color: AppColors.textSecondary, fontWeight: 'bold', textAlign: 'center' },

  forgotPasswordText: { fontSize: AppFontSize.sm, color: AppColors.accent, fontWeight: 'bold' },

  footer: { flexDirection: 'row-reverse', justifyContent: 'center', marginTop: AppSpacing.xxl },
  footerText: { color: AppColors.textSecondary, fontSize: AppFontSize.lg, fontWeight: 'bold' },
  signupLink: { color: AppColors.accent, fontSize: AppFontSize.lg, fontWeight: '900' },
  legalFooter: { flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', marginTop: AppSpacing.xl, gap: 5 },
  legalLink: { color: AppColors.textSecondary, fontSize: AppFontSize.sm, textDecorationLine: 'underline', fontWeight: 'bold' },
  legalSeparator: { color: AppColors.textMuted, fontSize: AppFontSize.sm },
});