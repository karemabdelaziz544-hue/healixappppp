import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { showToast } from '../../components/AppToast';
import { AppColors } from '../../constants/AppTheme';
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

      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F6F0', justifyContent: 'center', padding: 20 },

  bgCircle: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.4 },
  circleTopRight: { backgroundColor: '#DEF7EC', top: -100, right: -150 },
  circleBottomLeft: { backgroundColor: '#FFEDD5', bottom: -100, left: -150 },

  formCard: { backgroundColor: '#FFF', padding: 30, borderRadius: 30, elevation: 10, shadowColor: '#2A4B46', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },

  header: { alignItems: 'center', marginBottom: 35 },
  logo: { width: 80, height: 80, marginBottom: 15, borderRadius: 20 },
  title: { fontSize: 32, fontWeight: '900', color: '#2A4B46', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#6B7280', fontWeight: 'bold' },

  forgotPasswordText: { fontSize: 12, color: AppColors.accent, fontWeight: 'bold' },

  footer: { flexDirection: 'row-reverse', justifyContent: 'center', marginTop: 25 },
  footerText: { color: AppColors.textSecondary, fontSize: 15, fontWeight: 'bold' },
  signupLink: { color: AppColors.accent, fontSize: 15, fontWeight: '900' },
});