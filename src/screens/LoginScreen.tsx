import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { showToast } from '../../components/AppToast';
import { AppColors } from '../../constants/AppTheme';
import { handleError } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      Alert.alert('تنبيه', 'يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
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
      Alert.alert('تنبيه', 'يرجى كتابة البريد الإلكتروني أولاً ثم الضغط على نسيت كلمة المرور');
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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>البريد الإلكتروني</Text>
          <TextInput
            style={styles.input}
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {/* ✅ P2.4: hint يوضح للمستخدم إن الإيميل مطلوب لاسترجاع كلمة المرور */}
          <Text style={styles.emailHint}>اكتب إيميلك أولاً لاستخدام خاصية نسيت كلمة المرور</Text>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.passwordHeader}>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>نسيت كلمة المرور؟</Text>
            </TouchableOpacity>
            <Text style={styles.label}>كلمة المرور</Text>
          </View>
          <View style={styles.passwordContainer}>
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#9CA3AF" />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { flex: 1, height: '100%' }]}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>تسجيل الدخول</Text>}
        </TouchableOpacity>

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

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#4B5563', textAlign: 'right', marginBottom: 8 },
  // ✅ P3.1: موحد على 55px مع Signup
  input: { backgroundColor: AppColors.inputBg, height: 55, borderRadius: 15, paddingHorizontal: 15, textAlign: 'right', fontSize: 15, color: AppColors.textPrimary },
  // ✅ P2.4: hint نص تحت الإيميل
  emailHint: { fontSize: 11, color: AppColors.textMuted, textAlign: 'right', marginTop: 5, fontWeight: 'bold' },

  passwordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  forgotPasswordText: { fontSize: 12, color: AppColors.accent, fontWeight: 'bold' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: AppColors.inputBg, height: 55, borderRadius: 15 },
  eyeIcon: { padding: 15 },

  submitBtn: { backgroundColor: AppColors.primary, height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  footer: { flexDirection: 'row-reverse', justifyContent: 'center', marginTop: 25 },
  footerText: { color: AppColors.textSecondary, fontSize: 15, fontWeight: 'bold' },
  signupLink: { color: AppColors.accent, fontSize: 15, fontWeight: '900' },
});