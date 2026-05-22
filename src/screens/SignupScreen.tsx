import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { handleError } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';
import { showToast } from '../../components/AppToast';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';

export default function SignupScreen() {
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

  const handleSignup = async () => {
    // 1. التحقق من البيانات (Validation)
    if (!name || !email || !phone || !password) {
      showToast.error('يرجى إكمال جميع الحقول');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast.error('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    // 🔴 AUDIT 8 NOTE: Egypt-only phone validation.
    // If expanding to other markets, replace with E.164 validation + country picker.
    // Current scope is Egypt-only as confirmed by product requirements.
    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (!phoneRegex.test(phone)) {
      showToast.error('يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678)');
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
        gender: gender,                 // ✅ BUG-03: حفظ النوع في profiles
        subscription_status: 'new',     // ✅ BUG-03: تعيين الحالة الافتراضية
        role: 'client', // افتراضياً أي مسجل جديد هو عميل
        updated_at: new Date().toISOString(),
      });

      // 🔴 التعديل هنا: توجيه المستخدم لصفحة إدخال الكود بدل الدخول المباشر للتابات
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

          {/* نموذج التسجيل */}
          <AuthInput label="الاسم بالكامل" placeholder="مثال: أحمد محمد" value={name} onChangeText={setName} />
          
          <AuthInput label="البريد الإلكتروني" placeholder="name@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <AuthInput label="رقم الهاتف" placeholder="01xxxxxxxxx" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
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

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <AuthInput label="كلمة المرور" isPassword placeholder="••••••••" value={password} onChangeText={setPassword} />
            </View>
            <View style={{ flex: 1 }}>
              <AuthInput label="تأكيد المرور" isPassword placeholder="••••••••" value={confirmPassword} onChangeText={setConfirmPassword} />
            </View>
          </View>

          {/* زر التسجيل */}
          <AuthButton title="إنشاء حساب جديد" onPress={handleSignup} loading={loading} />

          {/* رابط تسجيل الدخول */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>لديك حساب بالفعل؟ </Text>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={styles.loginLink}>سجل دخولك</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F6F0' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },

  bgCircle: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.4 },
  circleTopRight: { backgroundColor: '#DEF7EC', top: -100, right: -150 },
  circleBottomLeft: { backgroundColor: '#FFEDD5', bottom: -100, left: -150 },

  formCard: { backgroundColor: '#FFF', padding: 30, borderRadius: 30, elevation: 10, shadowColor: '#2A4B46', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },

  header: { alignItems: 'center', marginBottom: 30 },
  logo: { width: 70, height: 70, marginBottom: 15, borderRadius: 20 },
  title: { fontSize: 28, fontWeight: '900', color: '#2A4B46', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#6B7280', fontWeight: 'bold' },

  row: { flexDirection: 'row-reverse', gap: 15, marginBottom: 15 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#4B5563', textAlign: 'right', marginBottom: 8 },

  genderToggle: { flexDirection: 'row-reverse', backgroundColor: '#F3F4F6', height: 55, borderRadius: 15, padding: 4 },
  genderBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  genderBtnActive: { backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 },
  genderText: { fontSize: 14, fontWeight: 'bold', color: '#9CA3AF' },
  genderTextActive: { color: '#2A4B46' },

  footer: { flexDirection: 'row-reverse', justifyContent: 'center', marginTop: 25 },
  footerText: { color: '#6B7280', fontSize: 14, fontWeight: 'bold' },
  loginLink: { color: '#F97316', fontSize: 14, fontWeight: '900' },
});