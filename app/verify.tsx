import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppColors } from '../constants/AppTheme';
import { supabase } from '../src/lib/supabase';

export default function VerifyScreen() {
    const router = useRouter();
    // بنستقبل الإيميل من صفحة التسجيل عشان العميل ميكتبوش تاني
    const { email } = useLocalSearchParams<{ email: string }>();

    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
        if (!code || code.length < 6) {
            Alert.alert('تنبيه', 'الرجاء إدخال الكود المكون من 6 أرقام');
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

            Alert.alert('نجاح 🎉', 'تم تفعيل حسابك بنجاح!');
            router.replace('/(tabs)');

        } catch (error: any) {
            Alert.alert('خطأ', 'الكود غير صحيح أو منتهي الصلاحية');
            console.error(error.message);
        } finally {
            setLoading(false);
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
                    أرسلنا كود مكون من 6 أرقام إلى بريدك {'\n'}
                    <Text style={{ fontWeight: 'bold', color: AppColors.primary }}>{email}</Text>
                </Text>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="أدخل الكود هنا (مثال: 123456)"
                        placeholderTextColor={AppColors.textMuted}
                        keyboardType="number-pad"
                        maxLength={6}
                        value={code}
                        onChangeText={setCode}
                        textAlign="center"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, (!code || code.length < 6) && styles.buttonDisabled]}
                    onPress={handleVerify}
                    disabled={loading || !code || code.length < 6}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.buttonText}>تأكيد وتفعيل الحساب</Text>
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
    backButton: { marginTop: 20, alignItems: 'center', padding: 10 },
    backButtonText: { color: AppColors.textSecondary, fontSize: 14, fontWeight: 'bold' }
});