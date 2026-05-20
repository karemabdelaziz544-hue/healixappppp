import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/lib/supabase';
import { executeQuery } from '../src/lib/apiClient';
import { logger } from '../src/lib/logger';
import { useFamily } from '../src/context/FamilyContext';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Skeleton from '../components/Skeleton';
import type { PaymentRequest } from '../src/types';
import { SubscriptionConfig } from '../constants/subscriptionConfig';
import { showToast } from '../components/AppToast';

// 🔴 CF-02 FIX: File validation constants
const MAX_RECEIPT_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf'];

/** Typed receipt file — replaces the previous `any` */
interface ReceiptFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}


export default function SubscriptionsScreen() {
  const router = useRouter();
  
  const { currentProfile, familyMembers } = useFamily();
  const userId = currentProfile?.id;

  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [history, setHistory] = useState<PaymentRequest[]>([]);
  const [pendingRequest, setPendingRequest] = useState<PaymentRequest | null>(null);

  const subMembers = familyMembers.filter(m => m.manager_id === userId);
  const subAccountsCount = subMembers.length;

  const [showRenewForm, setShowRenewForm] = useState(false);
  const [step, setStep] = useState(1);
  const [newSubCount, setNewSubCount] = useState(0);
  const [selectedMembersToKeep, setSelectedMembersToKeep] = useState<string[]>([]);
  const [receiptFile, setReceiptFile] = useState<ReceiptFile | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (userId) {
      setNewSubCount(subAccountsCount);
      fetchData();
    }
  }, [userId, subAccountsCount]);

  // 🔴 CF-01 FIX: All Supabase calls now go through executeQuery
  const fetchData = async () => {
    try {
      const selectCols = 'id, user_id, amount, plan_type, status, receipt_url, renewal_metadata, created_at';

      const [pendingRes, histRes] = await Promise.all([
        executeQuery<PaymentRequest | null>(
          supabase.from('payment_requests').select(selectCols).eq('user_id', userId).eq('status', 'pending').maybeSingle(),
          { isIdempotent: true }
        ),
        executeQuery<PaymentRequest[]>(
          supabase.from('payment_requests').select(selectCols).eq('user_id', userId).order('created_at', { ascending: false }),
          { isIdempotent: true }
        ),
      ]);

      setPendingRequest(pendingRes.data);
      setHistory(histRes.data || []);

      if (pendingRes.error) logger.error('[subscriptions] fetch pending:', pendingRes.error.message);
      if (histRes.error) logger.error('[subscriptions] fetch history:', histRes.error.message);
    } catch (error) {
      logger.error("Error fetching sub data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const isActive = currentProfile?.subscription_status === 'active' && 
                   currentProfile?.subscription_end_date && 
                   new Date(currentProfile.subscription_end_date) > new Date();
                   
  const isSubAccount = !!currentProfile?.manager_id;
  const totalPrice = SubscriptionConfig.calculateTotal(newSubCount);

  const handleNextStep = () => {
    if (step === 1) {
      if (newSubCount < subAccountsCount) {
        setSelectedMembersToKeep([]);
        setStep(2);
      } else {
        setSelectedMembersToKeep(subMembers.map(m => m.id));
        setStep(3);
      }
    } else if (step === 2) {
      if (selectedMembersToKeep.length !== newSubCount) {
        return Alert.alert("تنبيه", `يرجى اختيار ${newSubCount} أفراد للإبقاء عليهم.`);
      }
      setStep(3);
    }
  };

  const toggleMemberSelection = (id: string) => {
    setSelectedMembersToKeep(prev => {
      if (prev.includes(id)) {
        return prev.filter(mId => mId !== id);
      } else {
        if (prev.length < newSubCount) {
          return [...prev, id];
        } else {
          Alert.alert("تنبيه", `أقصى عدد مسموح به في باقتك الجديدة هو ${newSubCount} أفراد`);
          return prev;
        }
      }
    });
  };

  // 👇 اختيار صورة من الجاليري
  const handlePickReceiptImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        const uriParts = file.uri.split('.');
        const fileExt = uriParts[uriParts.length - 1] || 'jpg';
        const mimeType = file.mimeType || `image/${fileExt}`;

        // 🔴 CF-02 FIX: MIME type validation
        if (!ALLOWED_RECEIPT_TYPES.includes(mimeType)) {
          return showToast.error('نوع الملف غير مدعوم. يُسمح فقط بـ JPEG, PNG, HEIC, PDF');
        }
        // 🔴 CF-02 FIX: File size validation (if available from picker)
        if (file.fileSize && file.fileSize > MAX_RECEIPT_SIZE) {
          return showToast.error('حجم الملف يتجاوز 10 ميغابايت');
        }

        setReceiptFile({
          uri: file.uri,
          name: `receipt_${Date.now()}.${fileExt}`,
          mimeType,
          size: file.fileSize ?? undefined,
        });
      }
    } catch (err) {
      Alert.alert('خطأ', 'لا يمكن الوصول للاستوديو');
    }
  };

  // 👇 اختيار ملف (PDF)
  const handlePickReceiptFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ 
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'application/octet-stream';

      // 🔴 CF-02 FIX: MIME type validation
      if (!ALLOWED_RECEIPT_TYPES.includes(mimeType)) {
        return showToast.error('نوع الملف غير مدعوم. يُسمح فقط بـ JPEG, PNG, HEIC, PDF');
      }
      // 🔴 CF-02 FIX: File size validation
      if (asset.size && asset.size > MAX_RECEIPT_SIZE) {
        return showToast.error('حجم الملف يتجاوز 10 ميغابايت');
      }

      setReceiptFile({
        uri: asset.uri,
        name: asset.name,
        mimeType,
        size: asset.size ?? undefined,
      });
    }
  };

  // 👇 قائمة اختيار: صورة أم ملف
  const handlePickReceipt = () => {
    Alert.alert(
      "إرفاق إيصال الدفع",
      "اختر طريقة الرفع",
      [
        { text: "صورة من الاستوديو 🖼️", onPress: handlePickReceiptImage },
        { text: "ملف PDF 📄", onPress: handlePickReceiptFile },
        { text: "إلغاء", style: "cancel" },
      ]
    );
  };

  const handleSubmitRequest = async () => {
    if (!receiptFile) return Alert.alert("تنبيه", "يرجى إرفاق صورة الإيصال أولاً");
    setUploading(true);
    try {
      const fileExt = receiptFile.name.split('.').pop() || 'jpg';
      const fileName = `payment_${userId}_${Date.now()}.${fileExt}`;
      
      const response = await fetch(receiptFile.uri);
      const blob = await response.blob();

      // 🔴 CF-02 FIX: File size validation at upload time (blob.size is reliable)
      if (blob.size > MAX_RECEIPT_SIZE) {
        setUploading(false);
        return showToast.error('حجم الملف يتجاوز 10 ميغابايت');
      }
      // 🔴 CF-02 FIX: MIME type double-check on blob
      if (blob.type && !ALLOWED_RECEIPT_TYPES.includes(blob.type)) {
        setUploading(false);
        return showToast.error('نوع الملف غير مدعوم');
      }

      // 🔴 CF-01 FIX: Storage upload through executeQuery for timeout/error classification
      const { error: uploadError } = await executeQuery(
        supabase.storage.from('receipts').upload(fileName, blob),
        { retries: 1, timeoutMs: 30000 }
      );
      if (uploadError) throw uploadError;

      // 🔴 CF-01 FIX: DB insert through executeQuery
      const { error: dbError } = await executeQuery(
        supabase.from('payment_requests').insert([{
          user_id: userId,
          amount: totalPrice,
          plan_type: 'helix_integrated',
          status: 'pending',
          receipt_url: fileName,
          renewal_metadata: { 
            sub_count: newSubCount,
            keep_member_ids: selectedMembersToKeep,
            action_type: newSubCount < subAccountsCount ? 'downgrade' : 'upgrade'
          }
        }]),
        { retries: 0 } // Don't retry payment inserts — not idempotent
      );

      if (dbError) throw dbError;

      showToast.success('تم إرسال طلبك بنجاح!', 'سيتم مراجعته وتفعيل الباقة قريباً');
      setShowRenewForm(false);
      setStep(1);
      fetchData(); 
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'حدث خطأ أثناء إرسال الطلب';
      showToast.error(msg);
      logger.error('[subscriptions] submit error:', error);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Skeleton width={30} height={30} borderRadius={15} />
          <View style={[styles.headerTitleBox, { alignItems: 'flex-start' }]}>
            <Skeleton width={120} height={20} borderRadius={8} style={{ marginBottom: 5 }} />
            <Skeleton width={150} height={15} borderRadius={5} />
          </View>
        </View>
        <View style={{ padding: 20 }}>
          <Skeleton width="100%" height={150} borderRadius={25} style={{ marginBottom: 20 }} />
          <Skeleton width="100%" height={100} borderRadius={20} />
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // 🚨 شاشة التحذير للحسابات الفرعية المستثناة 🚨
  // ==========================================
  if (isSubAccount && !isActive) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={28} color="#1F2937" /></TouchableOpacity>
        </View>
        <View style={styles.alertContainer}>
          <View style={styles.alertIconBox}>
            <Ionicons name="warning" size={50} color="#EF4444" />
          </View>
          <Text style={styles.alertTitle}>تنبيه بخصوص اشتراكك ⚠️</Text>
          <Text style={styles.alertText}>
            نحيطك علماً بأنه <Text style={{fontWeight: 'bold', color: '#EF4444'}}>تم استثناء هذا الحساب</Text> من الاشتراك العائلي الجديد، أو أن الباقة قد انتهت صلاحيتها حالياً.
          </Text>
          
          <View style={styles.alertStepsBox}>
            <Text style={styles.alertStepsTitle}>ماذا تفعل الآن؟</Text>
            <Text style={styles.alertStep}>• تواصل مع مدير الحساب الأساسي</Text>
            <Text style={styles.alertStep}>• أو تحدث مع خدمة عملائنا للمساعدة</Text>
          </View>

          <TouchableOpacity style={styles.alertBtn} onPress={() => router.replace('/chat')}>
            <Text style={styles.alertBtnText}>تحدث مع خدمة العملاء</Text>
            <Ionicons name="chatbubbles" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color="#1F2937" /></TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.title}>إدارة الاشتراك</Text>
          <Text style={styles.subtitle}>تحكم في باقة عائلة هيليكس</Text>
        </View>
      </View>

      <View style={styles.tabSwitcher}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]} onPress={() => setActiveTab('history')}>
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>السجل المالي</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'current' && styles.tabBtnActive]} onPress={() => setActiveTab('current')}>
          <Text style={[styles.tabText, activeTab === 'current' && styles.tabTextActive]}>باقتي</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2A4B46" />}
      >
        
        {/* ======================= شاشة باقتي (Current) ======================= */}
        {activeTab === 'current' && (
          <View>
            {!showRenewForm ? (
              <>
                <View style={[styles.vipCard, isActive ? styles.vipCardActive : styles.vipCardExpired]}>
                  <View style={styles.vipHeader}>
                    <View style={styles.vipIconBox}>
                      <Ionicons name={isActive ? "shield-checkmark" : "warning"} size={32} color={isActive ? "#4ADE80" : "#EF4444"} />
                    </View>
                    <View style={styles.vipTextBox}>
                      <Text style={[styles.vipTitle, isActive ? {color: '#FFF'} : {color: '#1F2937'}]}>هيليكس المتكاملة</Text>
                      <Text style={isActive ? styles.vipStatusActive : styles.vipStatusExpired}>
                        {isActive ? '● اشتراكك نشط وفعال' : '● الاشتراك منتهي'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.vipDivider} />
                  <View style={styles.vipFooter}>
                    <View style={styles.vipFooterItem}>
                      <Text style={styles.vipFooterLabel}>ينتهي في</Text>
                      <Text style={[styles.vipFooterValue, isActive ? {color: '#FFF'} : {color: '#1F2937'}]}>
                        {currentProfile?.subscription_end_date ? new Date(currentProfile.subscription_end_date).toLocaleDateString('ar-EG') : 'غير محدد'}
                      </Text>
                    </View>
                    <View style={styles.vipFooterItem}>
                      <Text style={styles.vipFooterLabel}>أفراد العائلة</Text>
                      <Text style={[styles.vipFooterValue, isActive ? {color: '#FFF'} : {color: '#1F2937'}]}>{subAccountsCount + 1} فرد</Text>
                    </View>
                  </View>
                </View>

                {pendingRequest ? (
                  <View style={styles.pendingBox}>
                    <Ionicons name="time" size={40} color="#D97706" style={{ marginBottom: 10 }} />
                    <Text style={styles.pendingText}>طلبك قيد المراجعة حالياً.. سيتم تفعيل الباقة فور التأكد من التحويل.</Text>
                  </View>
                ) : isActive ? (
                  <View style={styles.activeBenefitsBox}>
                    <Ionicons name="checkmark-circle" size={40} color="#10B981" style={{ marginBottom: 10 }} />
                    <Text style={styles.activeBenefitsTitle}>كل شيء على ما يرام!</Text>
                    <Text style={styles.activeBenefitsText}>
                      أنت وعائلتك تتمتعون بجميع ميزات "هيليكس". استمروا في تحقيق أهدافكم الصحية.
                    </Text>
                  </View>
                ) : isSubAccount ? (
                  <View style={styles.activeBenefitsBox}>
                    <Ionicons name="information-circle" size={40} color="#3B82F6" style={{ marginBottom: 10 }} />
                    <Text style={styles.activeBenefitsTitle}>تجديد الاشتراك</Text>
                    <Text style={styles.activeBenefitsText}>
                      اشتراكك مرتبط بعائلة. الرجاء التواصل مع مدير العائلة لتجديد الاشتراك لك ولجميع أفراد العائلة.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.actionGrid}>
                    <TouchableOpacity style={styles.actionCard} onPress={() => { setShowRenewForm(true); setStep(1); }}>
                      <View style={styles.actionIconBox}><Ionicons name="refresh" size={28} color="#F97316" /></View>
                      <Text style={styles.actionCardTitle}>إدارة وتجديد الاشتراك</Text>
                      <Text style={styles.actionCardSub}>تعديل أفراد العائلة وإرفاق الإيصال</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              /* ======================= فورم التجديد المتعدد الخطوات ======================= */
              <View style={styles.renewForm}>
                <View style={styles.renewHeader}>
                  <TouchableOpacity onPress={() => setShowRenewForm(false)}><Ionicons name="close-circle" size={28} color="#EF4444" /></TouchableOpacity>
                  <Text style={styles.renewTitle}>إعداد الباقة والدفع</Text>
                </View>

                {/* الخطوة 1: تحديد العدد */}
                {step === 1 && (
                  <View style={styles.stepContainer}>
                    <View style={styles.stepIcon}><Ionicons name="people" size={40} color="#2A4B46" /></View>
                    <Text style={styles.counterLabel}>عدد الأفراد المضافين (بخلافك)</Text>
                    <View style={styles.counterControls}>
                      <TouchableOpacity onPress={() => setNewSubCount(Math.max(0, newSubCount - 1))} style={styles.counterBtn}><Text style={styles.counterBtnText}>-</Text></TouchableOpacity>
                      <Text style={styles.counterValue}>{newSubCount}</Text>
                      <TouchableOpacity onPress={() => setNewSubCount(newSubCount + 1)} style={styles.counterBtn}><Text style={styles.counterBtnText}>+</Text></TouchableOpacity>
                    </View>
                    <View style={styles.priceBox}>
                      <Text style={styles.priceLabel}>التكلفة الإجمالية الجديدة</Text>
                      <Text style={styles.priceValue}>{totalPrice} EGP</Text>
                    </View>
                  </View>
                )}

                {/* الخطوة 2: اختيار الأفراد المستبعدين */}
                {step === 2 && (
                  <View style={styles.stepContainer}>
                    <View style={styles.alertSoftBox}>
                      <Ionicons name="alert-circle" size={20} color="#D97706" />
                      <Text style={styles.alertSoftText}>
                        لقد اخترت {newSubCount} أفراد. يرجى الضغط على الأسماء التي تريد "تفعيلها" في الباقة الجديدة.
                      </Text>
                    </View>
                    
                    <View style={styles.selectionList}>
                      {subMembers.map(member => {
                        const isSelected = selectedMembersToKeep.includes(member.id);
                        return (
                          <TouchableOpacity 
                            key={member.id} 
                            style={[styles.memberSelectCard, isSelected && styles.memberSelectCardActive]}
                            onPress={() => toggleMemberSelection(member.id)}
                            activeOpacity={0.8}
                          >
                            <View style={styles.memberSelectLeft}>
                              <Text style={[styles.memberSelectName, isSelected && {color: '#2A4B46'}]}>{member.full_name}</Text>
                              {isSelected ? (
                                <Text style={styles.memberBadgeActive}>مُختار للتجديد</Text>
                              ) : (
                                <Text style={styles.memberBadgeInactive}>سيتم إيقافه</Text>
                              )}
                            </View>
                            <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                              {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* الخطوة 3: الدفع والرفع */}
                {step === 3 && (
                  <View style={styles.stepContainer}>
                    <View style={styles.priceBoxFinal}>
                      <Text style={styles.priceLabel}>المبلغ المطلوب تحويله لـ فودافون كاش</Text>
                      <Text style={styles.priceValue}>{totalPrice} EGP</Text>
                    </View>

                    <TouchableOpacity style={styles.uploadBtn} onPress={handlePickReceipt}>
                      <Ionicons name={receiptFile ? "checkmark-circle" : "cloud-upload"} size={40} color={receiptFile ? "#10B981" : "#9CA3AF"} />
                      <Text style={[styles.uploadText, receiptFile && {color: '#10B981'}]}>
                        {receiptFile ? receiptFile.name : 'اضغط لإرفاق صورة أو إيصال التحويل'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* أزرار التنقل */}
                <View style={styles.formFooter}>
                  {step > 1 && (
                    <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(step - 1)}>
                      <Text style={styles.backStepText}>رجوع</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity 
                    style={[styles.submitBtn, (step === 3 && !receiptFile) && {opacity: 0.5}]} 
                    onPress={step < 3 ? handleNextStep : handleSubmitRequest} 
                    disabled={(step === 3 && !receiptFile) || uploading}
                  >
                    {uploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>{step === 3 ? 'تأكيد الطلب وإرسال' : 'التالي'}</Text>}
                  </TouchableOpacity>
                </View>

              </View>
            )}
          </View>
        )}

        {/* ======================= شاشة السجل المالي (History) ======================= */}
        {activeTab === 'history' && (
          <View style={styles.historyList}>
            {history.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Ionicons name="receipt-outline" size={60} color="#D1D5DB" />
                <Text style={styles.emptyHistoryText}>لا توجد معاملات مالية مسجلة</Text>
              </View>
            ) : (
              history.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyAmount}>{item.amount} EGP</Text>
                    <View style={[styles.statusBadge, item.status === 'approved' ? styles.badgeApproved : item.status === 'rejected' ? styles.badgeRejected : styles.badgePending]}>
                      <Text style={[styles.badgeText, item.status === 'approved' ? styles.badgeTextApproved : item.status === 'rejected' ? styles.badgeTextRejected : styles.badgeTextPending]}>
                        {item.status === 'approved' ? 'مقبول' : item.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyPlanName}>{item.plan_type === 'helix_integrated' ? 'الباقة المتكاملة' : 'تجديد اشتراك'}</Text>
                    <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString('ar-EG')}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F6F0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 5 },
  headerTitleBox: { alignItems: 'flex-end' },
  title: { fontSize: 22, fontWeight: '900', color: '#1F2937' },
  subtitle: { fontSize: 12, color: '#6B7280', fontWeight: 'bold' },

  tabSwitcher: { flexDirection: 'row', backgroundColor: '#E5E7EB', margin: 20, borderRadius: 15, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabBtnActive: { backgroundColor: '#FFF', elevation: 2 },
  tabText: { fontSize: 14, fontWeight: 'bold', color: '#6B7280' },
  tabTextActive: { color: '#2A4B46' },

  vipCard: { padding: 25, borderRadius: 30, marginBottom: 20, elevation: 5 },
  vipCardActive: { backgroundColor: '#2A4B46' },
  vipCardExpired: { backgroundColor: '#FFF', borderWidth: 2, borderColor: '#FEE2E2' },
  vipHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 15, marginBottom: 20 },
  vipIconBox: { width: 55, height: 55, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  vipTextBox: { flex: 1, alignItems: 'flex-end' },
  vipTitle: { fontSize: 20, fontWeight: '900' },
  vipStatusActive: { color: '#4ADE80', fontWeight: 'bold', marginTop: 4, fontSize: 12 },
  vipStatusExpired: { color: '#EF4444', fontWeight: 'bold', marginTop: 4, fontSize: 12 },
  vipDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 20 },
  vipFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  vipFooterItem: { alignItems: 'flex-end' },
  vipFooterLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  vipFooterValue: { fontSize: 16, fontWeight: '900' },

  activeBenefitsBox: { backgroundColor: '#ECFDF5', padding: 30, borderRadius: 25, alignItems: 'center', borderWidth: 1, borderColor: '#D1FAE5' },
  activeBenefitsTitle: { color: '#065F46', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  activeBenefitsText: { color: '#047857', textAlign: 'center', lineHeight: 22, fontWeight: 'bold' },

  pendingBox: { backgroundColor: '#FEF3C7', padding: 30, borderRadius: 25, alignItems: 'center', borderWidth: 1, borderColor: '#FDE68A' },
  pendingText: { color: '#B45309', fontWeight: 'bold', textAlign: 'center', lineHeight: 22 },

  actionGrid: { marginTop: 10 },
  actionCard: { backgroundColor: '#FFF', padding: 30, borderRadius: 25, alignItems: 'center', borderWidth: 2, borderColor: '#FFEDD5', borderStyle: 'dashed' },
  actionIconBox: { width: 60, height: 60, backgroundColor: '#FFF7ED', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  actionCardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 5 },
  actionCardSub: { fontSize: 13, color: '#6B7280', textAlign: 'center' },

  renewForm: { backgroundColor: '#FFF', padding: 25, borderRadius: 30, elevation: 5 },
  renewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 15 },
  renewTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  
  stepContainer: { alignItems: 'center' },
  stepIcon: { width: 80, height: 80, backgroundColor: '#E8F3F1', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  counterLabel: { fontSize: 15, fontWeight: 'bold', color: '#4B5563', marginBottom: 15 },
  counterControls: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 25 },
  counterBtn: { width: 50, height: 50, backgroundColor: '#F3F4F6', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  counterBtnText: { fontSize: 26, fontWeight: 'bold', color: '#1F2937' },
  counterValue: { fontSize: 40, fontWeight: '900', color: '#2A4B46', width: 50, textAlign: 'center' },

  priceBox: { backgroundColor: '#F9FAFB', width: '100%', padding: 20, borderRadius: 20, alignItems: 'center' },
  priceBoxFinal: { backgroundColor: '#FFF7ED', width: '100%', padding: 25, borderRadius: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#FFEDD5' },
  priceLabel: { fontSize: 12, color: '#6B7280', fontWeight: 'bold', marginBottom: 5 },
  priceValue: { fontSize: 32, fontWeight: '900', color: '#EA580C' },

  alertSoftBox: { flexDirection: 'row-reverse', backgroundColor: '#FEF3C7', padding: 15, borderRadius: 15, gap: 10, marginBottom: 20 },
  alertSoftText: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: 'bold', textAlign: 'right', lineHeight: 18 },
  
  selectionList: { width: '100%', gap: 10 },
  memberSelectCard: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderRadius: 15, borderWidth: 2, borderColor: '#F3F4F6' },
  memberSelectCardActive: { borderColor: '#2A4B46', backgroundColor: '#E8F3F1' },
  memberSelectLeft: { alignItems: 'flex-end' },
  memberSelectName: { fontSize: 16, fontWeight: 'bold', color: '#6B7280', marginBottom: 4 },
  memberBadgeActive: { fontSize: 10, color: '#FFF', backgroundColor: '#2A4B46', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, fontWeight: 'bold' },
  memberBadgeInactive: { fontSize: 10, color: '#9CA3AF', fontWeight: 'bold' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#2A4B46', borderColor: '#2A4B46' },

  uploadBtn: { borderStyle: 'dashed', borderWidth: 2, borderColor: '#D1D5DB', padding: 30, borderRadius: 20, alignItems: 'center', width: '100%' },
  uploadText: { marginTop: 15, fontSize: 15, fontWeight: 'bold', color: '#6B7280' },

  formFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 25, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  backStepBtn: { padding: 15, justifyContent: 'center' },
  backStepText: { color: '#6B7280', fontWeight: 'bold', fontSize: 15 },
  submitBtn: { backgroundColor: '#F97316', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 15, alignItems: 'center', flex: 1, marginLeft: 10 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  historyList: { gap: 15 },
  emptyHistory: { alignItems: 'center', padding: 50 },
  emptyHistoryText: { marginTop: 15, color: '#9CA3AF', fontWeight: 'bold' },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#F3F4F6' },
  historyLeft: { alignItems: 'flex-start' },
  historyAmount: { fontSize: 18, fontWeight: '900', color: '#1F2937', marginBottom: 5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  badgeApproved: { backgroundColor: '#DCFCE7' }, badgeTextApproved: { color: '#166534' },
  badgeRejected: { backgroundColor: '#FEE2E2' }, badgeTextRejected: { color: '#991B1B' },
  badgePending: { backgroundColor: '#FEF3C7' }, badgeTextPending: { color: '#92400E' },
  historyRight: { alignItems: 'flex-end' },
  historyPlanName: { fontSize: 15, fontWeight: 'bold', color: '#1F2937', marginBottom: 5 },
  historyDate: { fontSize: 12, color: '#9CA3AF', fontWeight: 'bold' },

  alertContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  alertIconBox: { width: 100, height: 100, backgroundColor: '#FEE2E2', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  alertTitle: { fontSize: 24, fontWeight: '900', color: '#1F2937', marginBottom: 10, textAlign: 'center' },
  alertText: { textAlign: 'center', color: '#6B7280', lineHeight: 26, fontSize: 15, marginBottom: 30 },
  alertStepsBox: { backgroundColor: '#F3F4F6', padding: 20, borderRadius: 20, width: '100%', marginBottom: 30 },
  alertStepsTitle: { fontSize: 14, fontWeight: 'bold', color: '#4B5563', marginBottom: 10, textAlign: 'right' },
  alertStep: { fontSize: 14, color: '#6B7280', textAlign: 'right', marginBottom: 5, fontWeight: 'bold' },
  alertBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#1F2937', width: '100%', padding: 18, borderRadius: 15 },
  alertBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});