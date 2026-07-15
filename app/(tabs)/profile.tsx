import { Text, TextInput } from '@/components/AppText';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';;
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { executeQuery } from '../../src/lib/apiClient';
import * as WebBrowser from 'expo-web-browser';
import { logger } from '../../src/lib/logger';
import { useAuth } from '../../src/context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useRouter } from 'expo-router';
import { useFamily } from '../../src/context/FamilyContext';
import { getCachedSignedUrl } from '../../src/lib/storageCache';
import { showToast } from '../../components/AppToast';
import { AppColors, AppFontFamily, AppSpacing } from '../../constants/AppTheme';
import { Strings } from '../../constants/strings';
import { AnimatedButton } from '../../components/animations/AnimatedButton';
import { FadeInView } from '../../components/animations/FadeInView';
import { SlideInView } from '../../components/animations/SlideInView';

export default function ProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const user = session?.user;
  const { currentProfile, familyMembers, switchProfile } = useFamily();
  const insets = useSafeAreaInsets();

  const isSubAccount = currentProfile?.manager_id !== null && currentProfile?.manager_id !== undefined;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [fullName, setFullName] = useState('');
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarDisplayUrl, setAvatarDisplayUrl] = useState<string | null>(null);
  
  const [gender, setGender] = useState<'male' | 'female' | string>('male');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [activeSection, setActiveSection] = useState<'profile' | 'security' | null>(null);

  useEffect(() => {
    const loadAvatar = async () => {
      if (currentProfile) {
        setFullName(currentProfile.full_name || '');
        setGender(currentProfile.gender || 'male');
        setAge(currentProfile.age ? String(currentProfile.age) : '');
        setHeight(currentProfile.height ? String(currentProfile.height) : '');
        setWeight(currentProfile.weight ? String(currentProfile.weight) : '');
        const path = currentProfile.avatar_url;
        if (path) {
          setAvatarPath(path);
          if (!path.startsWith('http')) {
            try {
              const signedUrl = await getCachedSignedUrl('avatars', path, 3600); // 1 hour expiry
              if (signedUrl) setAvatarDisplayUrl(signedUrl);
            } catch (err) {
              logger.error('Error fetching avatar url:', err);
            }
          } else {
            setAvatarDisplayUrl(path);
          }
        } else {
          setAvatarPath(null);
          setAvatarDisplayUrl(null);
        }
      } else {
        setFullName('');
        setGender('male');
        setAge('');
        setHeight('');
        setWeight('');
        setAvatarPath(null);
        setAvatarDisplayUrl(null);
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
      const currentYear = new Date().getFullYear();
      const ageNum = parseInt(age, 10);
      let calculatedBirthDate = null;
      if (!isNaN(ageNum) && ageNum > 0) {
        calculatedBirthDate = `${currentYear - ageNum}-01-01`;
      }

      const updates = {
        id: profileId,
        full_name: fullName,
        avatar_url: avatarPath,
        gender: gender,
        age: !isNaN(ageNum) ? ageNum : null,
        birth_date: calculatedBirthDate,
        height: height ? Number(height) : null,
        weight: weight ? Number(weight) : null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      showToast.success('تم تحديث الملف الشخصي بنجاح!');
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
      showToast.info('يجب إعطاء صلاحية الوصول للصور لتتمكن من تغيير صورتك.');
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

      setAvatarPath(fileName);

      const signedUrl = await getCachedSignedUrl('avatars', fileName, 3600);

      if (signedUrl) {
        setAvatarDisplayUrl(signedUrl);
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
    if (newPassword !== confirmPassword) {
      showToast.info('كلمات المرور غير متطابقة');
      return;
    }
    if (newPassword.length < 6) {
      showToast.info('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast.success('تم تغيير كلمة المرور بنجاح!');
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

  const handleDeleteAccount = () => {
    Alert.alert(
      Strings.profile.deleteAccountConfirmTitle,
      Strings.profile.deleteAccountConfirmDesc,
      [
        { text: Strings.common.cancel, style: 'cancel' },
        {
          text: Strings.profile.deleteAccount,
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await executeQuery(
                supabase.functions.invoke('delete-account'),
                { timeoutMs: 15000, retries: 0 }
              );
              if (error) throw error;
              
              showToast.success(Strings.profile.deleteAccountSuccess);
              await supabase.auth.signOut();
            } catch (err: any) {
              logger.error('Error deleting account:', err);
              showToast.error(Strings.profile.deleteAccountError);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Centered TopAppBar Header */}
      <FadeInView delay={100} style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={() => router.canGoBack() ? router.back() : null}
          accessibilityRole="button"
          accessibilityLabel={Strings.common.back || 'رجوع'}
        >
          <Ionicons name="arrow-forward" size={24} color="#121c2a" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>حسابي</Text>
          <Text style={styles.headerSubtitle}>إدارة حسابك وإعدادات التطبيق</Text>
        </View>

        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={() => router.push('/notifications')}
          accessibilityRole="button"
          accessibilityLabel="الإشعارات"
        >
          <Ionicons name="notifications-outline" size={24} color="#121c2a" />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </FadeInView>

      {/* Sub-profile viewing switch banner */}
      {isSubAccount && (
        <View style={styles.subAccountBanner}>
          <View style={styles.bannerInfo}>
            <Ionicons name="swap-horizontal-outline" size={20} color={AppColors.accent} />
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
            accessibilityRole="button"
            accessibilityLabel={Strings.tabs.switchBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.bannerBtnText}>{Strings.tabs.switchBack}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card */}
        <FadeInView delay={200} style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              {avatarDisplayUrl ? (
                <Image source={{ uri: avatarDisplayUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{fullName ? fullName[0].toUpperCase() : 'H'}</Text>
                </View>
              )}
            </View>
            {/* Purely Decorative Verified Badge */}
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.profileDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{fullName || currentProfile?.full_name || ''}</Text>
              {currentProfile?.subscription_status ? (
                <View style={styles.subscriptionBadge}>
                  <Text style={styles.subscriptionBadgeText}>
                    {currentProfile.subscription_status}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.profileEmail}>{user?.email || ''}</Text>
            {user?.phone ? (
              <Text style={styles.profilePhone}>{user.phone}</Text>
            ) : null}

            <AnimatedButton 
              style={styles.editProfileCardBtn}
              onPress={() => setActiveSection(activeSection === 'profile' ? null : 'profile')}
              accessibilityRole="button"
              accessibilityLabel="تعديل الملف الشخصي"
            >
              <Ionicons name="create-outline" size={14} color="#2A4D44" />
              <Text style={styles.editProfileCardBtnText}>تعديل الملف الشخصي</Text>
            </AnimatedButton>
          </View>
        </FadeInView>

        {/* Profile Personal Data Edit Accordion Section */}
        {activeSection === 'profile' && (
          <SlideInView direction="down" style={styles.expandedFormCard}>
            <View style={styles.avatarSection}>
              <TouchableOpacity 
                style={styles.formAvatarWrapper} 
                onPress={handleAvatarUpload} 
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={Strings.profile.avatarHint}
              >
                {avatarDisplayUrl ? (
                  <Image source={{ uri: avatarDisplayUrl }} style={styles.formAvatarImage} />
                ) : (
                  <View style={styles.formAvatarPlaceholder}>
                    <Text style={styles.formAvatarInitial}>{fullName ? fullName[0].toUpperCase() : 'H'}</Text>
                  </View>
                )}
                <View style={styles.cameraIconBadge}>
                  <Ionicons name="camera" size={16} color="#FFF" />
                </View>
                {loading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color="#F26E11" />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.avatarHint}>اضغط على الصورة للتغيير</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>الاسم بالكامل</Text>
              <TextInput 
                style={styles.input} 
                value={fullName} 
                onChangeText={setFullName} 
                placeholder="اكتب اسمك هنا" 
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>النوع</Text>
              <View style={styles.genderToggle}>
                <AnimatedButton 
                  style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]} 
                  onPress={() => setGender('male')}
                >
                  <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>ذكر</Text>
                </AnimatedButton>
                <AnimatedButton 
                  style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]} 
                  onPress={() => setGender('female')}
                >
                  <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>أنثى</Text>
                </AnimatedButton>
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>العمر (بالسنوات)</Text>
                <TextInput 
                  style={styles.input} 
                  value={age} 
                  onChangeText={setAge} 
                  placeholder="مثال: 25" 
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={{ width: AppSpacing.md }} />
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>الطول (سم)</Text>
                <TextInput 
                  style={styles.input} 
                  value={height} 
                  onChangeText={setHeight} 
                  placeholder="مثال: 175" 
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={{ width: AppSpacing.md }} />
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>الوزن (كجم)</Text>
                <TextInput 
                  style={styles.input} 
                  value={weight} 
                  onChangeText={setWeight} 
                  placeholder="مثال: 70" 
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>البريد الإلكتروني (غير قابل للتعديل)</Text>
              <TextInput 
                style={[styles.input, styles.disabledInput]} 
                value={user?.email || ''} 
                editable={false} 
              />
            </View>

            <AnimatedButton 
              style={styles.saveBtn} 
              onPress={handleUpdateProfile} 
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={Strings.common.save}
            >
              <Ionicons name="save-outline" size={18} color="#FFF" />
              <Text style={styles.saveBtnText}>حفظ التغييرات</Text>
            </AnimatedButton>
          </SlideInView>
        )}

        {/* Settings List Container */}
        <FadeInView delay={300} style={styles.settingsCard}>
          {/* Row 1: Personal Info */}
          <AnimatedButton 
            style={styles.settingsRow} 
            onPress={() => setActiveSection(activeSection === 'profile' ? null : 'profile')}
            accessibilityRole="button"
            accessibilityLabel="البيانات الشخصية"
            accessibilityState={{ expanded: activeSection === 'profile' }}
          >
            <View style={styles.settingsRowContent}>
              <View style={styles.settingsIconWrapper}>
                <Ionicons name="person-outline" size={20} color="#2A4D44" />
              </View>
              <View style={styles.settingsTextContainer}>
                <Text style={styles.settingsTitle}>البيانات الشخصية</Text>
                <Text style={styles.settingsSubtitle}>تعديل بياناتك الشخصية والصورة والبريد الإلكتروني ورقم الهاتف</Text>
              </View>
            </View>
            <Ionicons name="chevron-back" size={18} color="#717975" />
          </AnimatedButton>

          <View style={styles.divider} />

          {/* Row 2: Diet Programs */}
          <AnimatedButton 
            style={styles.settingsRow} 
            onPress={() => router.push('/plans-history')}
            accessibilityRole="button"
            accessibilityLabel="الأنظمة الغذائية"
          >
            <View style={styles.settingsRowContent}>
              <View style={styles.settingsIconWrapper}>
                <Ionicons name="restaurant-outline" size={20} color="#2A4D44" />
              </View>
              <View style={styles.settingsTextContainer}>
                <Text style={styles.settingsTitle}>الأنظمة الغذائية</Text>
                <Text style={styles.settingsSubtitle}>استعرض جميع الأنظمة الغذائية الخاصة بك وتفاصيلها</Text>
              </View>
            </View>
            <Ionicons name="chevron-back" size={18} color="#717975" />
          </AnimatedButton>

          <View style={styles.divider} />

          {/* Row 3: Blog Articles / المقالات */}
          <AnimatedButton 
            style={styles.settingsRow} 
            onPress={() => router.push('/blog')}
            accessibilityRole="button"
            accessibilityLabel="المقالات"
          >
            <View style={styles.settingsRowContent}>
              <View style={styles.settingsIconWrapper}>
                <Ionicons name="document-text-outline" size={20} color="#2A4D44" />
              </View>
              <View style={styles.settingsTextContainer}>
                <Text style={styles.settingsTitle}>المقالات</Text>
                <Text style={styles.settingsSubtitle}>تعرف على أحدث المقالات الصحية من فريق Healix</Text>
              </View>
            </View>
            <Ionicons name="chevron-back" size={18} color="#717975" />
          </AnimatedButton>

          <View style={styles.divider} />

          {/* Row 4: Events / الفعاليات */}
          <AnimatedButton 
            style={styles.settingsRow} 
            onPress={() => router.push('/events')}
            accessibilityRole="button"
            accessibilityLabel="الفعاليات واللقاءات"
          >
            <View style={styles.settingsRowContent}>
              <View style={styles.settingsIconWrapper}>
                <Ionicons name="calendar-outline" size={20} color="#2A4D44" />
              </View>
              <View style={styles.settingsTextContainer}>
                <Text style={styles.settingsTitle}>الفعاليات واللقاءات</Text>
                <Text style={styles.settingsSubtitle}>شارك في الورش والمؤتمرات واللقاءات الصحية</Text>
              </View>
            </View>
            <Ionicons name="chevron-back" size={18} color="#717975" />
          </AnimatedButton>

          {!isSubAccount && (
            <>
              <View style={styles.divider} />

              {/* Row 3: Security & Password */}
              <AnimatedButton 
                style={styles.settingsRow} 
                onPress={() => setActiveSection(activeSection === 'security' ? null : 'security')}
                accessibilityRole="button"
                accessibilityLabel="الأمان وكلمة المرور"
                accessibilityState={{ expanded: activeSection === 'security' }}
              >
                <View style={styles.settingsRowContent}>
                  <View style={styles.settingsIconWrapper}>
                    <Ionicons name="shield-outline" size={20} color="#2A4D44" />
                  </View>
                  <View style={styles.settingsTextContainer}>
                    <Text style={styles.settingsTitle}>الأمان وكلمة المرور</Text>
                    <Text style={styles.settingsSubtitle}>تغيير كلمة المرور وإعدادات الأمان الخاصة بحسابك</Text>
                  </View>
                </View>
                <Ionicons name="chevron-back" size={18} color="#717975" />
              </AnimatedButton>
            </>
          )}

          {!isSubAccount && (
            <>
              <View style={styles.divider} />

              {/* Row 4: Subscription Management */}
              <AnimatedButton 
                style={styles.settingsRow} 
                onPress={() => router.push('/subscriptions')}
                accessibilityRole="button"
                accessibilityLabel="إدارة الاشتراك"
              >
                <View style={styles.settingsRowContent}>
                  <View style={styles.settingsIconWrapper}>
                    <Ionicons name="card-outline" size={20} color="#2A4D44" />
                  </View>
                  <View style={styles.settingsTextContainer}>
                    <Text style={styles.settingsTitle}>إدارة الاشتراك</Text>
                    <Text style={styles.settingsSubtitle}>عرض تفاصيل الاشتراك وتجديد الباقة وإدارة الفواتير</Text>
                  </View>
                </View>
                <Ionicons name="chevron-back" size={18} color="#717975" />
              </AnimatedButton>

              <View style={styles.divider} />

              {/* Row 5: Family Management */}
              <AnimatedButton 
                style={styles.settingsRow} 
                onPress={() => router.push('/family')}
                accessibilityRole="button"
                accessibilityLabel="إدارة العائلة"
              >
                <View style={styles.settingsRowContent}>
                  <View style={styles.settingsIconWrapper}>
                    <Ionicons name="people-outline" size={20} color="#2A4D44" />
                  </View>
                  <View style={styles.settingsTextContainer}>
                    <Text style={styles.settingsTitle}>إدارة العائلة</Text>
                    <Text style={styles.settingsSubtitle}>إدارة الحسابات الفرعية وأفراد العائلة</Text>
                  </View>
                </View>
                <Ionicons name="chevron-back" size={18} color="#717975" />
              </AnimatedButton>
            </>
          )}

          <View style={styles.divider} />

          {/* Row 6: Contact Support */}
          <AnimatedButton 
            style={styles.settingsRow} 
            onPress={() => router.push('/support')}
            accessibilityRole="button"
            accessibilityLabel="التواصل مع خدمة العملاء"
          >
            <View style={styles.settingsRowContent}>
              <View style={styles.settingsIconWrapper}>
                <Ionicons name="headset-outline" size={20} color="#2A4D44" />
              </View>
              <View style={styles.settingsTextContainer}>
                <Text style={styles.settingsTitle}>التواصل مع خدمة العملاء</Text>
                <Text style={styles.settingsSubtitle}>تواصل مع فريق الدعم الفني للحصول على المساعدة</Text>
              </View>
            </View>
            <Ionicons name="chevron-back" size={18} color="#717975" />
          </AnimatedButton>
        </FadeInView>

        {/* Security & Password Accordion Form */}
        {activeSection === 'security' && !isSubAccount && (
          <SlideInView direction="down" style={styles.expandedFormCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>كلمة المرور الجديدة</Text>
              <TextInput 
                style={styles.input} 
                value={newPassword} 
                onChangeText={setNewPassword} 
                placeholder="••••••••" 
                secureTextEntry 
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>تأكيد كلمة المرور</Text>
              <TextInput 
                style={styles.input} 
                value={confirmPassword} 
                onChangeText={setConfirmPassword} 
                placeholder="••••••••" 
                secureTextEntry 
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <AnimatedButton 
              style={[styles.outlineBtn, (!newPassword || loading) && { opacity: 0.5 }]} 
              onPress={handleChangePassword} 
              disabled={!newPassword || loading}
              accessibilityRole="button"
              accessibilityLabel={Strings.profile.updatePassword}
            >
              <Text style={styles.outlineBtnText}>تحديث كلمة المرور</Text>
            </AnimatedButton>
          </SlideInView>
        )}

        {/* Danger Zone */}
        <FadeInView delay={400} style={styles.dangerZoneContainer}>
          <Text style={styles.sectionTitle}>إجراءات الحساب</Text>

          {/* Logout standalone card */}
          <AnimatedButton 
            style={styles.logoutCard} 
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel={Strings.profile.logout}
          >
            <View style={styles.logoutContent}>
              <View style={styles.logoutIconWrapper}>
                <Ionicons name="log-out-outline" size={20} color="#414846" />
              </View>
              <Text style={styles.logoutText}>تسجيل الخروج</Text>
            </View>
            <Ionicons name="chevron-back" size={18} color="#717975" />
          </AnimatedButton>

          {/* Delete Account standalone card */}
          {!isSubAccount && (
            <AnimatedButton 
              style={styles.deleteAccountCard} 
              onPress={handleDeleteAccount} 
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={Strings.profile.deleteAccount}
            >
              <View style={styles.deleteContent}>
                <View style={styles.deleteIconWrapper}>
                  <Ionicons name="trash-outline" size={20} color="#ba1a1a" />
                </View>
                <View style={styles.deleteTextContainer}>
                  <Text style={styles.deleteTitle}>حذف الحساب نهائياً</Text>
                  <Text style={styles.deleteSubtitle}>سيتم حذف جميع بياناتك نهائياً ولا يمكن استعادتها</Text>
                </View>
              </View>
            </AnimatedButton>
          )}
        </FadeInView>

        {/* Legal Links Footer */}
        <View style={styles.legalFooter}>
          <TouchableOpacity 
            onPress={() => WebBrowser.openBrowserAsync('https://healix.app/terms')}
            accessibilityRole="link"
            accessibilityLabel={Strings.profile.termsOfService}
          >
            <Text style={styles.legalLink}>{Strings.profile.termsOfService}</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}> • </Text>
          <TouchableOpacity 
            onPress={() => WebBrowser.openBrowserAsync('https://healix.app/privacy')}
            accessibilityRole="link"
            accessibilityLabel={Strings.profile.privacyPolicy}
          >
            <Text style={styles.legalLink}>{Strings.profile.privacyPolicy}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F8F3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F8F3',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 70,
    backgroundColor: '#F9F8F3',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(113, 121, 117, 0.1)',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: AppFontFamily.bold,
    color: '#2A4D44',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: AppFontFamily.regular,
    color: '#414846',
    textAlign: 'center',
    marginTop: 2,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    end: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F26E11',
  },
  subAccountBanner: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  bannerText: {
    fontSize: 14,
    color: '#D97706',
    fontFamily: AppFontFamily.bold,
    textAlign: 'left',
  },
  bannerBtn: {
    backgroundColor: '#F26E11',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bannerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: AppFontFamily.bold,
  },
  scrollContent: {
    padding: 24,
  },
  
  // User Profile Card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#c4ebde',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2A4D44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontFamily: AppFontFamily.bold,
    color: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    end: 0,
    backgroundColor: '#2A4D44',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileDetails: {
    alignItems: 'center',
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  profileName: {
    fontSize: 20,
    fontFamily: AppFontFamily.bold,
    color: '#2A4D44',
  },
  subscriptionBadge: {
    backgroundColor: 'rgba(242, 110, 17, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  subscriptionBadgeText: {
    color: '#F26E11',
    fontSize: 10,
    fontFamily: AppFontFamily.bold,
    textTransform: 'uppercase',
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: AppFontFamily.medium,
    color: '#717975',
    marginBottom: 2,
    textAlign: 'center',
  },
  profilePhone: {
    fontSize: 14,
    fontFamily: AppFontFamily.medium,
    color: '#717975',
    marginBottom: 12,
    textAlign: 'center',
  },
  editProfileCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(42, 77, 68, 0.15)',
    marginTop: 4,
  },
  editProfileCardBtnText: {
    fontSize: 12,
    fontFamily: AppFontFamily.medium,
    color: '#2A4D44',
  },

  // Expanded profile edit form card
  expandedFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    marginBottom: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  formAvatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(42, 77, 68, 0.15)',
    position: 'relative',
  },
  formAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  formAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: '#2A4D44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formAvatarInitial: {
    fontSize: 36,
    fontFamily: AppFontFamily.bold,
    color: '#FFFFFF',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    end: 0,
    backgroundColor: '#F26E11',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: {
    color: '#717975',
    fontSize: 12,
    marginTop: 8,
    fontFamily: AppFontFamily.medium,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: '#414846',
    fontFamily: AppFontFamily.bold,
    textAlign: 'left',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 20,
    textAlign: 'left',
    fontSize: 15,
    color: '#121c2a',
    fontFamily: AppFontFamily.medium,
  },
  disabledInput: {
    color: '#717975',
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  saveBtn: {
    backgroundColor: '#2A4D44',
    height: 56,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: AppFontFamily.bold,
  },
  outlineBtn: {
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
  },
  outlineBtnText: {
    color: '#414846',
    fontSize: 16,
    fontFamily: AppFontFamily.bold,
  },

  // Settings Card (Grouped Settings)
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    marginBottom: 24,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
  },
  settingsRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  settingsIconWrapper: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(42, 77, 68, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  settingsTitle: {
    fontSize: 16,
    fontFamily: AppFontFamily.bold,
    color: '#2A4D44',
  },
  settingsSubtitle: {
    fontSize: 12,
    fontFamily: AppFontFamily.regular,
    color: '#414846',
    marginTop: 4,
    textAlign: 'left',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(113, 121, 117, 0.1)',
    marginHorizontal: 16,
  },

  // Danger Zone
  dangerZoneContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: AppFontFamily.bold,
    color: '#2A4D44',
    paddingHorizontal: 8,
    marginBottom: 12,
    textAlign: 'left',
  },
  logoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    marginBottom: 12,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoutIconWrapper: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(65, 72, 70, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontFamily: AppFontFamily.bold,
    color: '#2A4D44',
  },
  deleteAccountCard: {
    backgroundColor: 'rgba(186, 26, 26, 0.05)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  deleteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  deleteIconWrapper: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  deleteTitle: {
    fontSize: 16,
    fontFamily: AppFontFamily.bold,
    color: '#ba1a1a',
  },
  deleteSubtitle: {
    fontSize: 12,
    fontFamily: AppFontFamily.regular,
    color: 'rgba(186, 26, 26, 0.7)',
    marginTop: 4,
    textAlign: 'left',
  },

  // Legal Footer
  legalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  legalLink: {
    color: '#414846',
    fontSize: 13,
    fontFamily: AppFontFamily.medium,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    color: '#717975',
    fontSize: 13,
    marginHorizontal: 8,
  },
  genderToggle: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    height: 45,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  genderBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  genderBtnActive: {
    backgroundColor: '#FFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  genderText: {
    fontSize: 14,
    fontFamily: AppFontFamily.bold,
    color: '#9CA3AF',
  },
  genderTextActive: {
    color: '#2A4D44',
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});