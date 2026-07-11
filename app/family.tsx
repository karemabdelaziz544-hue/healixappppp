import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform, Keyboard, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { executeQuery } from '../src/lib/apiClient';
import { logger } from '../src/lib/logger';
import { useFamily } from '../src/context/FamilyContext';
import { useRouter } from 'expo-router';
import { showToast } from '../components/AppToast';

const toEnglishDigits = (str: string): string => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str
    .replace(/[٠-٩]/g, (w) => arabicDigits.indexOf(w).toString())
    .replace(/[۰-۹]/g, (w) => persianDigits.indexOf(w).toString());
};

export default function FamilyScreen() {
  const router = useRouter();
  const { familyMembers, currentProfile, switchProfile, refreshFamily } = useFamily();
  
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // التحقق من صلاحية الاشتراك للحساب الرئيسي
  const isSubscribed = currentProfile?.subscription_status === 'active' && 
                       (!currentProfile.subscription_end_date || new Date(currentProfile.subscription_end_date) > new Date());

  const [formData, setFormData] = useState({
    fullName: '', gender: 'male', height: '', weight: '', birthYear: '', relation: 'son'
  });

  const handleAddMember = async () => {
    if (!isSubscribed) {
      showToast.info("يجب تفعيل أو تجديد الاشتراك أولاً لتتمكن من إضافة أفراد.");
      return;
    }
    if (!formData.fullName || !formData.height || !formData.weight) {
      showToast.info("يرجى إكمال جميع البيانات");
      return;
    }

    setLoading(true);
    try {
      const cleanBirthYear = toEnglishDigits(formData.birthYear || '');
      const cleanHeight = toEnglishDigits(formData.height || '');
      const cleanWeight = toEnglishDigits(formData.weight || '');

      // 🔴 CF-01 FIX: Wrapped with executeQuery for timeout/error classification
      const { error } = await executeQuery(
        supabase.rpc('create_sub_member', {
          member_name: formData.fullName,
          member_gender: formData.gender,
          member_birth: cleanBirthYear ? `${cleanBirthYear}-01-01` : '2000-01-01',
          member_relation: formData.relation,
          member_height: Number(cleanHeight),
          member_weight: Number(cleanWeight)
        }),
        { retries: 0 } // Not idempotent — creates a new profile
      );

      if (error) throw error;

      showToast.success("تم إضافة الفرد بنجاح");
      setShowForm(false);
      setFormData({ fullName: '', gender: 'male', height: '', weight: '', birthYear: '', relation: 'son' });
      Keyboard.dismiss();
      refreshFamily();

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'فشل إضافة الفرد';
      showToast.error(msg);
      logger.error('[family] add member:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    // 🛡️ تأمين: التأكد إن المستخدم الحالي هو المدير قبل السماح بالحذف
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
            // 🔴 CF-01 FIX: Wrapped with executeQuery
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
            // 🔴 AUDIT FIX: Don't leak PostgreSQL error messages to users
            const msg = error instanceof Error ? error.message : 'فشل الحذف';
            showToast.error("فشل الحذف. يرجى المحاولة مرة أخرى.");
            logger.error('[family] delete member:', msg);
          }
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="رجوع للرئيسية"
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="arrow-forward" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.title}>إدارة العائلة <Ionicons name="people" size={24} color="#F97316" /></Text>
          <Text style={styles.subtitle}>أضف وبدل بين أفراد عائلتك بسهولة</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* أزرار الإضافة أو الرجوع */}
          <View style={styles.actionHeader}>
            {currentProfile?.manager_id ? (
              <TouchableOpacity 
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
              </TouchableOpacity>
            ) : (
              isSubscribed ? (
                <TouchableOpacity 
                  style={[styles.addBtn, showForm && styles.cancelBtn]} 
                  onPress={() => setShowForm(!showForm)}
                  accessibilityRole="button"
                  accessibilityLabel={showForm ? 'إلغاء الإضافة' : 'إضافة فرد جديد'}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name={showForm ? "close" : "add"} size={20} color="#FFF" />
                  <Text style={styles.addBtnText}>{showForm ? 'إلغاء الإضافة' : 'إضافة فرد جديد'}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.lockedBtn} 
                  onPress={() => router.push('/subscriptions')}
                  accessibilityRole="button"
                  accessibilityLabel="اشترك الآن لإمكانية الإضافة"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="lock-closed" size={16} color="#EA580C" />
                  <Text style={styles.lockedBtnText}>اشترك للإضافة</Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {/* فورم الإضافة */}
          {showForm && isSubscribed && (
            <View style={styles.formCard}>
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
                  <TouchableOpacity style={[styles.genderBtn, formData.gender === 'male' && styles.genderBtnActive]} onPress={() => setFormData({...formData, gender: 'male'})}><Text style={[styles.genderText, formData.gender === 'male' && styles.genderTextActive]}>ذكر</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.genderBtn, formData.gender === 'female' && styles.genderBtnActive]} onPress={() => setFormData({...formData, gender: 'female'})}><Text style={[styles.genderText, formData.gender === 'female' && styles.genderTextActive]}>أنثى</Text></TouchableOpacity>
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
                    <TouchableOpacity key={rel.key} style={[styles.relationBtn, formData.relation === rel.key && styles.genderBtnActive]} onPress={() => setFormData({...formData, relation: rel.key})}>
                      <Text style={[styles.genderText, formData.relation === rel.key && styles.genderTextActive]}>{rel.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleAddMember} 
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="حفظ وإضافة فرد عائلة جديد"
              >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>حفظ وإضافة</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* قائمة أفراد العائلة */}
          <View style={styles.membersList}>
            {familyMembers.map(member => {
              const isMain = !member.manager_id;
              const isActiveProfile = currentProfile?.id === member.id;
              
              // 🔥 التعديل السحري: الكشف عن الحساب الموقوف (المنتهي أو المستثنى)
              const isLocked = !isMain && member.subscription_status === 'expired';

              return (
                <View 
                  key={member.id} 
                  style={[
                    styles.memberCard, 
                    isActiveProfile && styles.activeMemberCard,
                    isLocked && { opacity: 0.6, borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' }
                  ]}
                >
                  {/* صورة الفرد (أو قفل) */}
                  <View style={[styles.avatarBox, isActiveProfile && {backgroundColor: 'colors.card'}, isLocked && {backgroundColor: '#FEE2E2'}]}>
                    <Ionicons 
                      name={isLocked ? "lock-closed" : "person"} 
                      size={24} 
                      color={isActiveProfile ? "#2A4B46" : isLocked ? "#EF4444" : "#2A4B46"} 
                    />
                  </View>

                  {/* بيانات الفرد */}
                  <View style={styles.memberInfo}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.memberName, isActiveProfile && {color: '#FFF'}, isLocked && {color: '#991B1B', textDecorationLine: 'line-through'}]}>
                        {member.full_name}
                      </Text>
                      {isMain && <View style={styles.mainBadge}><Ionicons name="star" size={10} color="#FFF" /><Text style={styles.mainBadgeText}>رئيسي</Text></View>}
                    </View>
                    <Text style={[styles.memberDetails, isActiveProfile && {color: 'rgba(255,255,255,0.8)'}, isLocked && {color: '#EF4444'}]}>
                      {isLocked ? 'الاشتراك منتهي/مستثنى' : `${member.gender === 'male' ? 'ذكر' : 'أنثى'} • ${member.weight || '-'} كجم`}
                    </Text>
                  </View>

                  {/* أزرار التحكم (حذف وتبديل) */}
                  <View style={styles.cardActions}>
                    {!isActiveProfile && (
                      <TouchableOpacity 
                        style={[styles.switchBtn, isLocked && { backgroundColor: '#FEE2E2' }]} 
                        onPress={() => { 
                          if (isLocked) {
                            showToast.info('هذا الحساب غير مفعل. يرجى تجديد أو تعديل الباقة لتفعيله.');
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
                      </TouchableOpacity>
                    )}
                    {!isMain && (
                      <TouchableOpacity 
                        style={styles.deleteBtn} 
                        onPress={() => handleDeleteMember(member.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`حذف ${member.full_name}`}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                </View>
              );
            })}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
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

  actionHeader: { alignItems: 'flex-start', marginBottom: 20 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#2A4B46', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 },
  cancelBtn: { backgroundColor: '#EF4444' },
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
  avatarBox: { width: 50, height: 50, backgroundColor: '#E8F3F1', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
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