import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppColors } from '../constants/AppTheme';
import { supabase } from '../src/lib/supabase';
import { logger } from '../src/lib/logger';
import { showToast } from '../components/AppToast';

export default function VerifyScreen() {
    const router = useRouter();
    // بنستقبل الإيميل من صفحة التسجيل عشان العميل ميكتبوش تاني
    const { email } = useLocalSearchParams<{ email: string }>();

    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    // 🔴 H5-FIX: OTP resend cooldown to prevent email bombing.
    // Without this, users (or bots) can trigger unlimited email sends.
    const [resendCooldown, setResendCooldown] = useState(0);
    const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
      return () => {
        if (cooldownRef.current) clearInterval(cooldownRef.current);
      };
    }, []);

    const handleVerify = async () => {
        if (!code || code.length < 8) {
            showToast.error('الرجاء إدخال الكود المكون من 8 أرقام');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email: email || '',
                token: code,
                type: 'signup',
            });

            if (error) throw error;

            // 🔴 AUDIT FIX: تم نقل إنشاء البروفايل بالكامل إلى Database Trigger (handle_new_user)
            // على جدول auth.users لضمان الحماية وتفادي تعديل الصلاحيات أو الاشتراك من طرف العميل (Client-Side).


            showToast.success('تم تفعيل حسابك بنجاح 🎉');
            // ✅ BUG-07: تأخير بسيط لإعطاء FamilyContext وقت للتحميل
            await new Promise(resolve => setTimeout(resolve, 800));
            router.replace('/(tabs)');

        } catch (error: any) {
            showToast.error('الكود غير صحيح أو منتهي الصلاحية');
            logger.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    // ✅ UX-04: إعادة إرسال الكود
    const handleResend = async () => {
        if (!email) {
            showToast.error('لا يوجد بريد إلكتروني للإعادة');
            return;
        }
        if (resendCooldown > 0) return; // guard against rapid calls

        setResending(true);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
            });
            if (error) throw error;
            showToast.success('تم إعادة إرسال الكود إلى بريدك ✅');
            // Start 60-second cooldown
            setResendCooldown(60);
            cooldownRef.current = setInterval(() => {
                setResendCooldown(prev => {
                    if (prev <= 1) {
                        clearInterval(cooldownRef.current!);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (error: any) {
            showToast.error('فشل إعادة الإرسال: ' + error.message);
        } finally {
            setResending(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconWrap}>
                    <Ionicons name="mail-unread-outline" size={60} color={AppColors.primary} />
                </View>

                <Text style={styles.title}>تأكيد البريد الإلكتروني</Text>
                <Text style={styles.subtitle}>
                    أرسلنا كود تفعيل إلى بريدك {'\n'}
                    <Text style={{ fontWeight: 'bold', color: AppColors.primary }}>{email}</Text>
                </Text>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="أدخل الكود هنا"
                        placeholderTextColor={AppColors.textMuted}
                        keyboardType="number-pad"
                        maxLength={8}
                        value={code}
                        onChangeText={setCode}
                        textAlign="center"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, (!code || code.length < 8) && styles.buttonDisabled]}
                    onPress={handleVerify}
                    disabled={loading || !code || code.length < 8}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.buttonText}>تأكيد وتفعيل الحساب</Text>
                    )}
                </TouchableOpacity>

                {/* ✅ UX-04: زر إعادة إرسال الكود مع cooldown */}
                <TouchableOpacity
                    style={[styles.resendButton, (resending || resendCooldown > 0) && { opacity: 0.5 }]}
                    onPress={handleResend}
                    disabled={resending || resendCooldown > 0}
                    accessibilityRole="button"
                    accessibilityLabel="إعادة إرسال كود التحقق"
                >
                    {resending ? (
                        <ActivityIndicator size="small" color={AppColors.accent} />
                    ) : (
                        <Text style={styles.resendButtonText}>
                            {resendCooldown > 0
                                ? `إعادة الإرسال (${resendCooldown})`
                                : 'لم يصل الكود؟ أعد الإرسال'}
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>العودة والتعديل</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    content: { flex: 1, justifyContent: 'center', padding: 24 },
    iconWrap: { width: 100, height: 100, backgroundColor: AppColors.primaryLight, borderRadius: 50, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24 },
    title: { fontSize: 26, fontWeight: '900', color: AppColors.textPrimary, textAlign: 'center', marginBottom: 10 },
    subtitle: { fontSize: 15, color: AppColors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 30 },
    inputContainer: { marginBottom: 24 },
    input: { backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.border, borderRadius: 16, padding: 18, fontSize: 20, fontWeight: 'bold', color: AppColors.textPrimary, letterSpacing: 5 },
    button: { backgroundColor: AppColors.primary, padding: 18, borderRadius: 16, alignItems: 'center', elevation: 2, shadowColor: AppColors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    buttonDisabled: { backgroundColor: AppColors.tabInactive, elevation: 0, shadowOpacity: 0 },
    buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    resendButton: { marginTop: 20, alignItems: 'center', padding: 14, backgroundColor: '#FFF7ED', borderRadius: 12, borderWidth: 1, borderColor: '#FFEDD5' },
    resendButtonText: { color: AppColors.accent, fontSize: 14, fontWeight: '900' },
    backButton: { marginTop: 15, alignItems: 'center', padding: 10 },
    backButtonText: { color: AppColors.textSecondary, fontSize: 14, fontWeight: 'bold' }
});