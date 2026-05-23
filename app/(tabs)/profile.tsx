import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { logger } from '../../src/lib/logger';
import { useAuth } from '../../src/context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useRouter, Redirect } from 'expo-router';
import { useFamily } from '../../src/context/FamilyContext';
import SupportFAB from '../../components/SupportFAB';
import { showToast } from '../../components/AppToast';
import { AppColors } from '../../constants/AppTheme';
import { Strings } from '../../constants/strings';

export default function ProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const user = session?.user;
  const { currentProfile, familyMembers, switchProfile } = useFamily();
  const insets = useSafeAreaInsets();

  // 👈 التأكد إذا كان الحساب فرعي
  const isSubAccount = currentProfile?.manager_id !== null && currentProfile?.manager_id !== undefined;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [fullName, setFullName] = useState('');
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarDisplayUrl, setAvatarDisplayUrl] = useState<string | null>(null);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // حالة التحكم في القوائم المنسدلة (Accordion)
  const [activeSection, setActiveSection] = useState<'profile' | 'security' | null>(null);

  // ✅ UX-03: استخدام بيانات currentProfile بدل API call إضافي
  useEffect(() => {
    const loadAvatar = async () => {
      if (currentProfile) {
        setFullName(currentProfile.full_name || '');
        const path = currentProfile.avatar_url;
        if (path) {
          setAvatarPath(path);
          if (!path.startsWith('http')) {
            try {
              const { data } = await supabase.storage.from('avatars').createSignedUrl(path, 3600); // 1 hour expiry
              if (data?.signedUrl) setAvatarDisplayUrl(data.signedUrl);
            } catch (err) {
              logger.error('Error fetching avatar url:', err);
            }
          } else {
            setAvatarDisplayUrl(path);
          }
        }
      }
      setFetching(false);
    };
    loadAvatar();
  }, [currentProfile]);

  const handleUpdateProfile = async () => {
    const profileId = currentProfile?.id;
    if (!profileId) return;
    setLoading(true);
    try {
      const updates = {
        id: profileId,
        full_name: fullName,
        avatar_url: avatarPath,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      showToast.success('تم تحديث الملف الشخصي بنجاح! 🎉');
      setActiveSection(null);
    } catch (error: any) {
      showToast.error('فشل التحديث: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('تنبيه', 'يجب إعطاء صلاحية الوصول للصور لتتمكن من تغيير صورتك.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (pickerResult.canceled || !pickerResult.assets[0].base64) return;

    setLoading(true);
    try {
      const base64FileData = pickerResult.assets[0].base64;
      const fileExt = pickerResult.assets[0].uri.split('.').pop() || 'jpeg';
      const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const fileName = `${currentProfile?.id}/${fileId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, decode(base64FileData), { contentType: `image/${fileExt}` });

      if (uploadError) throw uploadError;

      setAvatarPath(fileName); // Save path instead of signed URL in DB

      const { data: signedData } = await supabase.storage
        .from('avatars')
        .createSignedUrl(fileName, 3600); // 1 hour expiry for display

      if (signedData?.signedUrl) {
        setAvatarDisplayUrl(signedData.signedUrl);
      }

      showToast.success('تم رفع الصورة، اضغط "حفظ التغييرات" لتأكيد التغيير.');
      
    } catch (error: any) {
      showToast.error('فشل رفع الصورة: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword) return;
    if (newPassword !== confirmPassword) return Alert.alert('تنبيه', 'كلمات المرور غير متطابقة');
    if (newPassword.length < 6) return Alert.alert('تنبيه', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast.success('تم تغيير كلمة المرور بنجاح! 🔒');
      setNewPassword('');
      setConfirmPassword('');
      setActiveSection(null);
    } catch (error: any) {
      showToast.error('فشل التغيير: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من رغبتك في تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تسجيل الخروج', style: 'destructive', onPress: async () => {
        try {
          await supabase.auth.signOut();
        } catch (err) {
          logger.error('Error logging out:', err);
        }
      }}
    ]);
  };

  // 🔴 AUDIT FIX: Sub-accounts can view their profile and switch back

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2A4B46" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {isSubAccount && (
        <View style={styles.subAccountBanner}>
          <View style={styles.bannerInfo}>
            <Ionicons name="swap-horizontal-outline" size={20} color="#EA580C" />
            <Text style={styles.bannerText}>
              {Strings.dashboard.subAccountViewing(currentProfile?.full_name || '')}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.bannerBtn} 
            onPress={async () => {
              const mainUser = familyMembers.find(m => !m.manager_id);
              if (mainUser) {
                await switchProfile(mainUser.id);
                showToast.success(Strings.tabs.switchedBack);
              }
            }}
          >
            <Text style={styles.bannerBtnText}>{Strings.tabs.switchBack}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.pageTitle}>إعدادات الحساب</Text>

        {/* 1. زرار تعديل البيانات الشخصية */}
        <TouchableOpacity 
          style={[styles.subBtn, activeSection === 'profile' && styles.subBtnActive]} 
          onPress={() => setActiveSection(activeSection === 'profile' ? null : 'profile')}
        >
          <View style={styles.subBtnLeft}>
            <Ionicons name={activeSection === 'profile' ? "chevron-down" : "chevron-back"} size={20} color="#2A4B46" />
          </View>
          <View style={styles.subBtnRight}>
            <Text style={styles.subBtnTitle}>البيانات والصورة</Text>
            <Text style={styles.subBtnDesc}>تعديل الاسم والصورة الشخصية</Text>
          </View>
          <View style={[styles.subBtnIcon, {backgroundColor: '#2A4B46'}]}>
            <Ionicons name="person" size={24} color="#FFF" />
          </View>
        </TouchableOpacity>

        {/* فورم البيانات الشخصية */}
        {activeSection === 'profile' && (
          <View style={styles.expandedCard}>
            <View style={styles.avatarSection}>
              <TouchableOpacity style={styles.avatarWrapper} onPress={handleAvatarUpload} disabled={loading}>
                {avatarDisplayUrl ? (
                  <Image source={{ uri: avatarDisplayUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{fullName ? fullName[0].toUpperCase() : 'H'}</Text>
                  </View>
                )}
                <View style={styles.cameraIconBadge}>
                  <Ionicons name="camera" size={18} color="#FFF" />
                </View>
                {loading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color="#F97316" />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.avatarHint}>اضغط على الصورة للتغيير</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>الاسم بالكامل</Text>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="اكتب اسمك هنا" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>البريد الإلكتروني (غير قابل للتعديل)</Text>
              <TextInput style={[styles.input, styles.disabledInput]} value={user?.email || ''} editable={false} />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateProfile} disabled={loading}>
              <Text style={styles.saveBtnText}>حفظ التغييرات</Text>
              <Ionicons name="save-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        {!isSubAccount && (
          <>
            {/* 2. زرار الأمان وكلمة المرور */}
            <TouchableOpacity 
              style={[styles.subBtn, activeSection === 'security' && styles.subBtnActive]} 
              onPress={() => setActiveSection(activeSection === 'security' ? null : 'security')}
            >
              <View style={styles.subBtnLeft}>
                <Ionicons name={activeSection === 'security' ? "chevron-down" : "chevron-back"} size={20} color="#F97316" />
              </View>
              <View style={styles.subBtnRight}>
                <Text style={styles.subBtnTitle}>الأمان وكلمة المرور</Text>
                <Text style={styles.subBtnDesc}>تغيير كلمة المرور الخاصة بحسابك</Text>
              </View>
              <View style={[styles.subBtnIcon, {backgroundColor: '#F97316'}]}>
                <Ionicons name="lock-closed" size={24} color="#FFF" />
              </View>
            </TouchableOpacity>

            {/* فورم كلمة المرور */}
            {activeSection === 'security' && (
              <View style={styles.expandedCard}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>كلمة المرور الجديدة</Text>
                  <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="••••••••" secureTextEntry />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>تأكيد كلمة المرور</Text>
                  <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="••••••••" secureTextEntry />
                </View>

                <TouchableOpacity style={[styles.outlineBtn, (!newPassword || loading) && { opacity: 0.5 }]} onPress={handleChangePassword} disabled={!newPassword || loading}>
                  <Text style={styles.outlineBtnText}>تحديث كلمة المرور</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 3. إدارة الاشتراك */}
            <TouchableOpacity style={styles.subBtn} onPress={() => router.push('/subscriptions')}>
              <View style={styles.subBtnLeft}>
                <Ionicons name="chevron-back" size={20} color="#2A4B46" />
              </View>
              <View style={styles.subBtnRight}>
                <Text style={styles.subBtnTitle}>إدارة الاشتراك</Text>
                <Text style={styles.subBtnDesc}>تجديد، تعديل الباقة، وتأكيد الدفع</Text>
              </View>
              <View style={[styles.subBtnIcon, {backgroundColor: '#2A4B46'}]}>
                <Ionicons name="card" size={24} color="#FFF" />
              </View>
            </TouchableOpacity>

            {/* 4. إدارة العائلة */}
            <TouchableOpacity style={styles.subBtn} onPress={() => router.push('/family')}>
              <View style={styles.subBtnLeft}>
                <Ionicons name="chevron-back" size={20} color="#F97316" />
              </View>
              <View style={styles.subBtnRight}>
                <Text style={styles.subBtnTitle}>إدارة العائلة</Text>
                <Text style={styles.subBtnDesc}>أضف وبدل بين أفراد عائلتك</Text>
              </View>
              <View style={[styles.subBtnIcon, {backgroundColor: '#F97316'}]}>
                <Ionicons name="people" size={24} color="#FFF" />
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* زر تسجيل الخروج */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutBtnText}>تسجيل الخروج</Text>
        </TouchableOpacity>

      </ScrollView>
      <SupportFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F6F0' },
  subAccountBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderBottomWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  bannerInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  bannerText: {
    fontSize: 14,
    color: '#C2410C',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  bannerBtn: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bannerBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  pageTitle: { fontSize: 28, fontWeight: '900', color: '#2A4B46', textAlign: 'right', marginBottom: 25 },
  
  // تنسيقات الأزرار الرئيسية (المنيو)
  subBtn: { flexDirection: 'row', backgroundColor: '#FFF', padding: 20, borderRadius: 25, marginBottom: 15, elevation: 2, alignItems: 'center', justifyContent: 'space-between' },
  subBtnActive: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', elevation: 0 },
  subBtnIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  subBtnRight: { flex: 1, alignItems: 'flex-end' },
  subBtnTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  subBtnDesc: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  subBtnLeft: { padding: 5 },

  // تنسيقات الكارت الممتد (الفورم)
  expandedCard: { backgroundColor: '#FFF', padding: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, marginBottom: 15, elevation: 2, borderTopWidth: 0 },

  avatarSection: { alignItems: 'center', marginBottom: 25 },
  avatarWrapper: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: 'rgba(42, 75, 70, 0.2)', position: 'relative' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 55 },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 55, backgroundColor: '#2A4B46', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 40, fontWeight: 'bold', color: '#FFF' },
  cameraIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#F97316', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 55, justifyContent: 'center', alignItems: 'center' },
  avatarHint: { color: '#9CA3AF', fontSize: 12, marginTop: 10, fontWeight: 'bold' },

  inputGroup: { marginBottom: 15 },
  inputLabel: { fontSize: 13, color: '#6B7280', fontWeight: 'bold', textAlign: 'right', marginBottom: 8 },
  input: { backgroundColor: '#F3F4F6', height: 55, borderRadius: 15, paddingHorizontal: 15, textAlign: 'right', fontSize: 15, color: '#1F2937' },
  disabledInput: { color: '#9CA3AF', backgroundColor: '#F9FAFB' },

  saveBtn: { backgroundColor: '#2A4B46', height: 55, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  outlineBtn: { backgroundColor: '#FFF', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', marginTop: 10 },
  outlineBtnText: { color: '#4B5563', fontSize: 16, fontWeight: 'bold' },

  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 10, paddingVertical: 15, backgroundColor: '#FEF2F2', borderRadius: 15, borderWidth: 1, borderColor: '#FEE2E2' },
  logoutBtnText: { color: '#EF4444', fontSize: 16, fontWeight: 'bold' },
});