import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform, Keyboard, Image } from 'react-native';
import { Text } from '@/components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { executeQuery } from '../src/lib/apiClient';
import { logger } from '../src/lib/logger';
import { useFamily } from '../src/context/FamilyContext';
import { useRouter } from 'expo-router';
import { showToast } from '../components/AppToast';
import { useSubscriptionDetails } from '../src/features/subscriptions/hooks/useSubscriptionData';
import { resolveSubscriptionState } from '../src/features/subscriptions/resolveSubscriptionState';
import { AnimatedButton } from '../components/animations/AnimatedButton';
import { FadeInView } from '../components/animations/FadeInView';
import { SlideInView } from '../components/animations/SlideInView';
import { Modal } from 'react-native';
import { useEntitlements } from '../src/features/subscriptions/useEntitlements';
import { PremiumGate } from '../src/components/PremiumGate';
import { getCachedSignedUrl } from '../src/lib/storageCache';

const toEnglishDigits = (str: string): string => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '٨', '٩'];
  return str
    .replace(/,/g, '.')
    .replace(/[٠-٩]/g, (w) => arabicDigits.indexOf(w).toString())
    .replace(/[۰-۹]/g, (w) => persianDigits.indexOf(w).toString());
};

import { FamilyActivationWizardModal } from '../src/features/family/components/FamilyActivationWizardModal';

export default function FamilyScreen() {
  const router = useRouter();
  const { familyMembers, currentProfile, switchProfile, refreshFamily, accountProfileId } = useFamily();
  
  const { canUse, userRole } = useEntitlements();
  const [subAccountModalMember, setSubAccountModalMember] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(false);

  // Decomposed details hook for manager quota
  const { details } = useSubscriptionDetails(accountProfileId);

  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAvatars = async () => {
      const urls: Record<string, string> = {};
      for (const member of familyMembers) {
        if (member.avatar_url) {
          if (member.avatar_url.startsWith('http')) {
            urls[member.id] = member.avatar_url;
          } else {
            try {
              const signedUrl = await getCachedSignedUrl('avatars', member.avatar_url, 3600);
              if (signedUrl) urls[member.id] = signedUrl;
            } catch (err) {
              logger.error('Error fetching member avatar url:', err);
            }
          }
        }
      }
      setAvatarUrls(urls);
    };
    fetchAvatars();
  }, [familyMembers]);

  // Validate active subscription state
  const subscriptionState = resolveSubscriptionState(currentProfile, null, currentProfile?.entitlement);
  const isSubscribed = subscriptionState === 'active' || subscriptionState === 'expiring_soon' || subscriptionState === 'admin';

  const familyQuota = details?.family_quota ?? 0;
  const childMembers = familyMembers.filter(m => m.manager_id);
  const slotsUsed = childMembers.filter(m => m.subscription_status === 'active').length;

  const [formData, setFormData] = useState({
    fullName: '', gender: 'male', height: '', weight: '', birthYear: '', relation: 'son'
  });

  const handleAddMember = async () => {
    if (!isSubscribed) {
      showToast.info("يجب تفعيل أو تجديد الاشتراك أولاً لتتمكن من إضافة أفراد.");
      return;
    }

    if (slotsUsed >= familyQuota) {
      showToast.info("لقد استنفدت الحد الأقصى للمقاعد المتاحة بالباقة. يمكنك ترقية الباقة لزيادة المقاعد.");
      return;
    }

    if (!formData.fullName || !formData.height || !formData.weight || !formData.birthYear) {
      showToast.info("يرجى إكمال جميع البيانات المطلوبة");
      return;
    }

    if (formData.fullName.trim().length < 2) {
      showToast.info("الاسم يجب أن يكون حرفين على الأقل");
      return;
    }

    const cleanHeight = toEnglishDigits(formData.height || '');
    const heightNum = parseFloat(cleanHeight);
    if (isNaN(heightNum) || heightNum < 30 || heightNum > 250) {
      showToast.info("يرجى إدخال الطول بالسنتيمتر (مثال: 170 سم - بين 30 و 250)");
      return;
    }

    const cleanWeight = toEnglishDigits(formData.weight || '');
    const weightNum = parseFloat(cleanWeight);
    if (isNaN(weightNum) || weightNum < 2 || weightNum > 400) {
      showToast.info("يرجى إدخال الوزن بالكيلوجرام (مثال: 75 كجم - بين 2 و 400)");
      return;
    }

    const cleanBirthYear = toEnglishDigits(formData.birthYear || '');
    let birthYearNum = parseInt(cleanBirthYear, 10);
    if (isNaN(birthYearNum) || birthYearNum <= 0) {
      showToast.info("يرجى إدخال سنة ميلاد صحيحة");
      return;
    }

    // Convert age to birth year if user typed age (e.g. 28)
    const currentYear = new Date().getFullYear();
    if (birthYearNum < 120) {
      birthYearNum = currentYear - birthYearNum;
    }
    if (birthYearNum < 1900 || birthYearNum > currentYear) {
      showToast.info("سنة الميلاد المدخلة غير منطقية");
      return;
    }

    setLoading(true);
    try {
      const { error } = await executeQuery(
        supabase.rpc('create_sub_member', {
          member_name: formData.fullName.trim(),
          member_gender: formData.gender,
          member_birth: `${birthYearNum}-01-01`,
          member_relation: formData.relation,
          member_height: heightNum,
          member_weight: weightNum
        }),
        { retries: 0 }
      );

      if (error) throw error;

      showToast.success("تم إضافة الفرد بنجاح");
      setShowForm(false);
      setFormData({ fullName: '', gender: 'male', height: '', weight: '', birthYear: '', relation: 'son' });
      Keyboard.dismiss();
      refreshFamily();

    } catch (error: any) {
      let msg = "فشل إضافة الفرد";
      const rawMsg = error?.message || (error instanceof Error ? error.message : '');
      if (rawMsg.includes('Invalid family member details')) {
        msg = "يرجى التأكد من البيانات: الطول بالسنتيمتر (30-250) والوزن بالكيلوجرام (2-400).";
      } else if (rawMsg.includes('Family member quota has been reached')) {
        msg = "تم الوصول للحد الأقصى لأفراد العائلة بالباقة الحالية.";
      } else if (rawMsg.includes('An active subscription is required')) {
        msg = "يلزم وجود اشتراك عائلي مفعل لإضافة أفراد.";
      } else if (rawMsg) {
        msg = rawMsg;
      }
      showToast.error(msg);
      logger.error('[family] add member:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    const memberToDelete = familyMembers.find(m => m.id === id);
    if (!memberToDelete || !memberToDelete.manager_id) {
      showToast.error("لا يمكن حذف الحساب الرئيسي.");
      return;
    }
    if (currentProfile?.id !== memberToDelete.manager_id) {
      showToast.error("فقط صاحب الحساب الرئيسي يمكنه حذف أفراد العائلة.");
      return;
    }

    Alert.alert("تأكيد الحذف", "هل أنت متأكد من حذف هذا الفرد نهائياً؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: async () => {
          try {
            const { error } = await executeQuery(
              supabase.from('profiles').delete().eq('id', id),
              { retries: 0 }
            );
            if (error) throw error;
            showToast.success("تم الحذف");
            refreshFamily();
            if (currentProfile?.id === id) {
              const mainUser = familyMembers.find(m => !m.manager_id);
              if (mainUser) switchProfile(mainUser.id);
            }
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'فشل الحذف';
            showToast.error("فشل الحذف. يرجى المحاولة مرة أخرى.");
            logger.error('[family] delete member:', msg);
          }
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <FadeInView delay={100} style={styles.header}>
        <AnimatedButton 
          onPress={() => router.back()} 
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="رجوع للرئيسية"
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="arrow-forward" size={24} color="#1F2937" />
        </AnimatedButton>
        <View style={styles.headerTitleBox}>
          <Text style={styles.title}>إدارة العائلة <Ionicons name="people" size={24} color="#F97316" /></Text>
          <Text style={styles.subtitle}>أضف وبدل بين أفراد عائلتك بسهولة</Text>
        </View>
      </FadeInView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Quota Banner */}
          {isSubscribed && !currentProfile?.manager_id && (
            <TouchableOpacity style={styles.quotaBanner} onPress={() => setShowWizard(true)} activeOpacity={0.85}>
              <Ionicons name="key-outline" size={20} color="#2A4B46" />
              <Text style={[styles.quotaText, { flex: 1 }]}>
                حالة التراخيص: {slotsUsed} / {familyQuota} Activated 🟢 (اضغط لإدارة التفعيل)
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#2A4B46" />
            </TouchableOpacity>
          )}

          {/* Action Header */}
          <View style={styles.actionHeader}>
            {currentProfile?.manager_id ? (
              <AnimatedButton 
                style={[styles.addBtn, { backgroundColor: '#EF4444' }]} 
                onPress={() => {
                  const mainUser = familyMembers.find(m => !m.manager_id);
                  if (mainUser) {
                    switchProfile(mainUser.id);
                    showToast.success('عدت إلى حسابك الرئيسي');
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel="العودة لحسابي الرئيسي"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-undo-outline" size={20} color="#FFF" />
                <Text style={styles.addBtnText}>العودة لحسابي الرئيسي</Text>
              </AnimatedButton>
            ) : (
              isSubscribed ? (
                slotsUsed < familyQuota ? (
                  <AnimatedButton 
                    style={[styles.addBtn, showForm && styles.cancelBtn]} 
                    onPress={() => setShowForm(!showForm)}
                    accessibilityRole="button"
                    accessibilityLabel={showForm ? 'إلغاء الإضافة' : 'إضافة فرد جديد'}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name={showForm ? "close" : "add"} size={20} color="#FFF" />
                    <Text style={styles.addBtnText}>{showForm ? 'إلغاء الإضافة' : 'إضافة فرد جديد'}</Text>
                  </AnimatedButton>
                ) : (
                  <AnimatedButton 
                    style={styles.upgradeBtn} 
                    onPress={() => router.push('/subscription-management')}
                    accessibilityRole="button"
                    accessibilityLabel="ترقية الباقة لزيادة المقاعد"
                  >
                    <Ionicons name="rocket-outline" size={20} color="#FFF" />
                    <Text style={styles.addBtnText}>ترقية الباقة لزيادة المقاعد</Text>
                  </AnimatedButton>
                )
              ) : (
                <AnimatedButton 
                  style={styles.lockedBtn} 
                  onPress={() => router.push('/subscriptions')}
                  accessibilityRole="button"
                  accessibilityLabel="اشترك الآن لإمكانية الإضافة"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="lock-closed" size={16} color="#EA580C" />
                  <Text style={styles.lockedBtnText}>اشترك للإضافة</Text>
                </AnimatedButton>
              )
            )}
          </View>

          {/* Add Form */}
          {showForm && isSubscribed && (
            <SlideInView direction="up" delay={50} style={styles.formCard}>
              <Text style={styles.formTitle}>بيانات الفرد الجديد</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>الاسم بالكامل</Text>
                <TextInput style={styles.input} placeholder="مثال: يوسف أحمد" value={formData.fullName} onChangeText={t => setFormData({...formData, fullName: t})} />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, {flex: 1}]}><Text style={styles.label}>الوزن (Kg)</Text><TextInput style={styles.input} value={formData.weight} onChangeText={t => setFormData({...formData, weight: t})} keyboardType="numeric" /></View>
                <View style={[styles.inputGroup, {flex: 1}]}><Text style={styles.label}>الطول (Cm)</Text><TextInput style={styles.input} value={formData.height} onChangeText={t => setFormData({...formData, height: t})} keyboardType="numeric" /></View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>النوع</Text>
                <View style={styles.genderToggle}>
                  <AnimatedButton style={[styles.genderBtn, formData.gender === 'male' && styles.genderBtnActive]} onPress={() => setFormData({...formData, gender: 'male'})}><Text style={[styles.genderText, formData.gender === 'male' && styles.genderTextActive]}>ذكر</Text></AnimatedButton>
                  <AnimatedButton style={[styles.genderBtn, formData.gender === 'female' && styles.genderBtnActive]} onPress={() => setFormData({...formData, gender: 'female'})}><Text style={[styles.genderText, formData.gender === 'female' && styles.genderTextActive]}>أنثى</Text></AnimatedButton>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, {flex: 1}]}><Text style={styles.label}>سنة الميلاد</Text><TextInput style={styles.input} placeholder="مثال: 2005" value={formData.birthYear} onChangeText={t => setFormData({...formData, birthYear: t})} keyboardType="numeric" /></View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>العلاقة</Text>
                <View style={styles.genderToggle}>
                  {[
                    { key: 'son', label: 'ابن' },
                    { key: 'daughter', label: 'ابنة' },
                    { key: 'husband', label: 'زوج' },
                    { key: 'wife', label: 'زوجة' },
                    { key: 'brother', label: 'أخ' },
                    { key: 'sister', label: 'أخت' },
                  ].map(rel => (
                    <AnimatedButton key={rel.key} style={[styles.relationBtn, formData.relation === rel.key && styles.genderBtnActive]} onPress={() => setFormData({...formData, relation: rel.key})}>
                      <Text style={[styles.genderText, formData.relation === rel.key && styles.genderTextActive]}>{rel.label}</Text>
                    </AnimatedButton>
                  ))}
                </View>
              </View>

              <AnimatedButton 
                style={styles.submitBtn} 
                onPress={handleAddMember} 
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="حفظ وإضافة فرد عائلة جديد"
              >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>حفظ وإضافة</Text>}
              </AnimatedButton>
            </SlideInView>
          )}

          {/* Family Members List */}
          <View style={styles.membersList}>
            {familyMembers.map(member => {
              const isMain = !member.manager_id;
              const isActiveProfile = currentProfile?.id === member.id;
              
              // Resolve specific membership access state
              const memberState = resolveSubscriptionState(member, null, member.entitlement);
              const isLocked = !isMain && (memberState === 'family_expired' || memberState === 'family_removed');

              return (
                <FadeInView delay={100} key={member.id}>
                <View 
                  style={[
                    styles.memberCard, 
                    isActiveProfile && styles.activeMemberCard,
                    isLocked && { opacity: 0.6, borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' }
                  ]}
                >
                  {/* Photo or Lock */}
                  <View style={[styles.avatarBox, isActiveProfile && {backgroundColor: '#FFF'}, isLocked && {backgroundColor: '#FEE2E2'}]}>
                    {isLocked ? (
                      <Ionicons name="lock-closed" size={24} color="#EF4444" />
                    ) : avatarUrls[member.id] ? (
                      <Image source={{ uri: avatarUrls[member.id] }} style={styles.memberAvatarImage} />
                    ) : (
                      <Ionicons 
                        name="person" 
                        size={24} 
                        color="#2A4B46" 
                      />
                    )}
                  </View>

                  {/* Profile Info */}
                  <View style={styles.memberInfo}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.memberName, isActiveProfile && {color: '#FFF'}, isLocked && {color: '#991B1B', textDecorationLine: 'line-through'}]}>
                        {member.full_name}
                      </Text>
                      {isMain && <View style={styles.mainBadge}><Ionicons name="star" size={10} color="#FFF" /><Text style={styles.mainBadgeText}>رئيسي</Text></View>}
                    </View>
                    <Text style={[styles.memberDetails, isActiveProfile && {color: 'rgba(255,255,255,0.8)'}, isLocked && {color: '#EF4444'}]}>
                      {isLocked ? (
                        memberState === 'family_removed' ? 'مستبعد من الباقة' : 'الاشتراك منتهي'
                      ) : (
                        `${member.gender === 'male' ? 'ذكر' : 'أنثى'} • ${member.weight || '-'} كجم`
                      )}
                    </Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.cardActions}>
                    {!isActiveProfile && (
                      <AnimatedButton 
                        style={[styles.switchBtn, isLocked && { backgroundColor: '#FEE2E2' }]} 
                        onPress={() => { 
                          if (!isMain && !canUse('SUB_ACCOUNTS') && userRole !== 'admin' && userRole !== 'doctor') {
                            setSubAccountModalMember(member);
                          } else if (isLocked) {
                            showToast.info('هذا الحساب غير مفعل حالياً. يرجى تجديد الباقة أو إضافته لتفعيله.');
                          } else {
                            switchProfile(member.id); 
                            showToast.success(`تم التبديل لحساب ${member.full_name}`); 
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`تبديل الحساب إلى ${member.full_name}`}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={[styles.switchBtnText, isLocked && { color: '#EF4444' }]}>
                          {isLocked ? 'مقفل' : 'تبديل'}
                        </Text>
                      </AnimatedButton>
                    )}
                    {!isMain && (
                      <AnimatedButton 
                        style={styles.deleteBtn} 
                        onPress={() => handleDeleteMember(member.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`حذف ${member.full_name}`}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash" size={18} color="#EF4444" />
                      </AnimatedButton>
                    )}
                  </View>

                </View>
                </FadeInView>
              );
            })}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {subAccountModalMember && (
        <Modal transparent visible animationType="fade" onRequestClose={() => setSubAccountModalMember(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 24, alignItems: 'center' }}>
              <TouchableOpacity style={{ alignSelf: 'flex-start', marginBottom: 12 }} onPress={() => setSubAccountModalMember(null)}>
                <Ionicons name="close" size={28} color="#4B5563" />
              </TouchableOpacity>
              <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 12 }}>
                <Text style={{ fontFamily: 'Thmanyah-Bold', fontSize: 12, color: '#065F46' }}>الحساب الفرعي جاهز ✔️</Text>
              </View>
              <Text style={{ fontFamily: 'Thmanyah-Bold', fontSize: 18, color: '#111827', textAlign: 'center', marginBottom: 8 }}>
                لقد قمت بإنشاء حساب {subAccountModalMember.full_name} بنجاح
              </Text>
              <Text style={{ fontFamily: 'Thmanyah-Medium', fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16, lineHeight: 22 }}>
                اشترك الآن لتفعيل هذا الحساب وإرسال: النظام الغذائي، برنامج التمارين، الملف الطبي، المتابعة مع الدكتور، والذكاء الاصطناعي.
              </Text>
              <View style={{ width: '100%', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12, marginBottom: 20, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Thmanyah-Bold', fontSize: 13, color: '#374151' }}>
                  عدد الحسابات المنشأة: {familyMembers.length}
                </Text>
              </View>
              <AnimatedButton
                style={{ width: '100%', height: 48, backgroundColor: '#EA580C', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
                onPress={() => {
                  setSubAccountModalMember(null);
                  router.push('/subscriptions?returnUrl=/family&featureId=SUB_ACCOUNTS' as any);
                }}
              >
                <Text style={{ fontFamily: 'Thmanyah-Bold', fontSize: 15, color: '#FFF' }}>اشترك الآن لتفعيل الحسابات الفرعية 🔒</Text>
              </AnimatedButton>
            </View>
          </View>
        </Modal>
      )}

      {/* Family Activation Wizard Modal */}
      <FamilyActivationWizardModal
        visible={showWizard}
        onClose={() => setShowWizard(false)}
        familyMembers={familyMembers}
        purchasedLicenses={familyQuota}
        onRefresh={async () => { await refreshFamily(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F6F0' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', gap: 15 },
  backBtn: { padding: 5 },
  headerTitleBox: { alignItems: 'flex-start', flex: 1 },
  title: { fontSize: 22, fontWeight: '900', color: '#1F2937', textAlign: 'left' },
  subtitle: { fontSize: 12, color: '#6B7280', fontWeight: 'bold', textAlign: 'left' },
  scrollContent: { padding: 20 },

  quotaBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F3F1', padding: 12, borderRadius: 14, marginBottom: 20 },
  quotaText: { fontSize: 12, fontWeight: '700', color: '#2A4B46' },

  actionHeader: { alignItems: 'flex-start', marginBottom: 20 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#2A4B46', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 },
  cancelBtn: { backgroundColor: '#EF4444' },
  upgradeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F97316', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 },
  addBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  lockedBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF7ED', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#FFEDD5' },
  lockedBtnText: { color: '#EA580C', fontWeight: 'bold', fontSize: 13 },

  formCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 25, marginBottom: 25, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', textAlign: 'left', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 10 },
  inputGroup: { marginBottom: 15 },
  row: { flexDirection: 'row', gap: 15 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#6B7280', textAlign: 'left', marginBottom: 5 },
  input: { backgroundColor: '#F9FAFB', height: 45, borderRadius: 12, paddingHorizontal: 15, textAlign: 'left', fontSize: 14, borderWidth: 1, borderColor: '#F3F4F6' },
  genderToggle: { flexDirection: 'row', backgroundColor: '#F9FAFB', height: 45, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#F3F4F6' },
  genderBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  genderBtnActive: { backgroundColor: '#FFF', elevation: 1 },
  genderText: { fontSize: 13, fontWeight: 'bold', color: '#9CA3AF' },
  genderTextActive: { color: '#2A4B46' },
  submitBtn: { backgroundColor: '#F97316', height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  submitBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

  membersList: { gap: 15 },
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', elevation: 1, gap: 15 },
  activeMemberCard: { backgroundColor: '#2A4B46', borderColor: '#2A4B46', transform: [{scale: 1.02}], elevation: 5 },
  avatarBox: { width: 50, height: 50, backgroundColor: '#E8F3F1', borderRadius: 15, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  memberAvatarImage: { width: '100%', height: '100%' },
  memberInfo: { flex: 1, alignItems: 'flex-start' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  memberName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', textAlign: 'left' },
  mainBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F97316', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  mainBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  memberDetails: { fontSize: 12, color: '#6B7280', fontWeight: 'bold', textAlign: 'left' },
  cardActions: { flexDirection: 'row', gap: 10 },
  switchBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  switchBtnText: { fontSize: 12, fontWeight: 'bold', color: '#4B5563' },
  deleteBtn: { backgroundColor: '#FEF2F2', padding: 6, borderRadius: 8 },
  relationBtn: { paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
});