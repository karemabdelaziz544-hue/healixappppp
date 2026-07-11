import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import { executeQuery } from '../../../lib/apiClient';
import { logger } from '../../../lib/logger';
import { showToast } from '../../../../components/AppToast';
import { SubscriptionConfig } from '../../../../constants/subscriptionConfig';
import type { PaymentRequest, Profile } from '../../../types';

const MAX_RECEIPT_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf'];

export interface ReceiptFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

// Shared store to share state between different instances of the hook (across screens)
const sharedStore = {
  newSubCount: -1, // -1 means uninitialized
  selectedMembersToKeep: [] as string[],
  receiptFile: null as any,
  step: 1,
  showRenewForm: false,
  listeners: new Set<() => void>(),
  
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  },
  
  notify() {
    this.listeners.forEach(l => l());
  },
  
  setNewSubCount(val: number) {
    this.newSubCount = val;
    this.notify();
  },
  
  setSelectedMembersToKeep(val: string[]) {
    this.selectedMembersToKeep = val;
    this.notify();
  },
  
  setReceiptFile(val: any) {
    this.receiptFile = val;
    this.notify();
  },
  
  setStep(val: number) {
    this.step = val;
    this.notify();
  },
  
  setShowRenewForm(val: boolean) {
    this.showRenewForm = val;
    this.notify();
  },

  reset() {
    this.newSubCount = -1;
    this.selectedMembersToKeep = [];
    this.receiptFile = null;
    this.step = 1;
    this.showRenewForm = false;
    this.notify();
  }
};

export function useSubscriptionData(
  userId: string | undefined,
  subAccountsCount: number,
  subMembers: Profile[]
) {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<PaymentRequest[]>([]);
  const [pendingRequest, setPendingRequest] = useState<PaymentRequest | null>(null);

  const [showRenewForm, setShowRenewFormState] = useState(sharedStore.showRenewForm);
  const [step, setStepState] = useState(sharedStore.step);
  const [newSubCount, setNewSubCountState] = useState(sharedStore.newSubCount === -1 ? subAccountsCount : sharedStore.newSubCount);
  const [selectedMembersToKeep, setSelectedMembersToKeepState] = useState<string[]>(sharedStore.selectedMembersToKeep);
  const [receiptFile, setReceiptFileState] = useState<ReceiptFile | null>(sharedStore.receiptFile);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (sharedStore.newSubCount === -1 && userId) {
      sharedStore.setNewSubCount(subAccountsCount);
    }
  }, [userId, subAccountsCount]);

  useEffect(() => {
    const unsubscribe = sharedStore.subscribe(() => {
      setShowRenewFormState(sharedStore.showRenewForm);
      setStepState(sharedStore.step);
      setNewSubCountState(sharedStore.newSubCount === -1 ? subAccountsCount : sharedStore.newSubCount);
      setSelectedMembersToKeepState(sharedStore.selectedMembersToKeep);
      setReceiptFileState(sharedStore.receiptFile);
    });
    return unsubscribe;
  }, [subAccountsCount]);

  const setShowRenewForm = (val: boolean) => sharedStore.setShowRenewForm(val);
  const setStep = (val: number) => sharedStore.setStep(val);
  const setNewSubCount = (val: number | ((prev: number) => number)) => {
    if (typeof val === 'function') {
      sharedStore.setNewSubCount(val(sharedStore.newSubCount === -1 ? subAccountsCount : sharedStore.newSubCount));
    } else {
      sharedStore.setNewSubCount(val);
    }
  };
  const setSelectedMembersToKeep = (val: string[] | ((prev: string[]) => string[])) => {
    if (typeof val === 'function') {
      sharedStore.setSelectedMembersToKeep(val(sharedStore.selectedMembersToKeep));
    } else {
      sharedStore.setSelectedMembersToKeep(val);
    }
  };
  const setReceiptFile = (val: ReceiptFile | null) => sharedStore.setReceiptFile(val);

  const fetchData = useCallback(async () => {
    if (!userId) return;
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

      if (pendingRes.error) logger.error('[useSubscriptionData] fetch pending error:', pendingRes.error.message);
      if (histRes.error) logger.error('[useSubscriptionData] fetch history error:', histRes.error.message);
    } catch (error) {
      logger.error('[useSubscriptionData] Error fetching sub data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

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

        if (!ALLOWED_RECEIPT_TYPES.includes(mimeType)) {
          return showToast.error('نوع الملف غير مدعوم. يُسمح فقط بـ JPEG, PNG, HEIC, PDF');
        }
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

  const handlePickReceiptFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const mimeType = asset.mimeType || 'application/octet-stream';

        if (!ALLOWED_RECEIPT_TYPES.includes(mimeType)) {
          return showToast.error('نوع الملف غير مدعوم. يُسمح فقط بـ JPEG, PNG, HEIC, PDF');
        }
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
    } catch (err) {
      Alert.alert('خطأ', 'لا يمكن فتح الملفات');
    }
  };

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

      if (blob.size > MAX_RECEIPT_SIZE) {
        setUploading(false);
        return showToast.error('حجم الملف يتجاوز 10 ميغابايت');
      }
      if (blob.type && !ALLOWED_RECEIPT_TYPES.includes(blob.type)) {
        setUploading(false);
        return showToast.error('نوع الملف غير مدعوم');
      }

      const { error: uploadError } = await executeQuery(
        supabase.storage.from('receipts').upload(fileName, blob),
        { retries: 1, timeoutMs: 30000 }
      );
      if (uploadError) throw uploadError;

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
        { retries: 0 }
      );

      if (dbError) throw dbError;

      showToast.success('تم إرسال طلبك بنجاح!', 'سيتم مراجعته وتفعيل الباقة قريباً');
      setShowRenewForm(false);
      setStep(1);
      setReceiptFile(null);
      fetchData(); 
      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'حدث خطأ أثناء إرسال الطلب';
      showToast.error(msg);
      logger.error('[useSubscriptionData] submit error:', error);
      return false;
    } finally {
      setUploading(false);
    }
  };

  const resetRenewForm = () => {
    sharedStore.reset();
  };

  return {
    activeTab,
    setActiveTab,
    loading,
    refreshing,
    history,
    pendingRequest,
    showRenewForm,
    setShowRenewForm,
    step,
    setStep,
    newSubCount,
    setNewSubCount,
    selectedMembersToKeep,
    setSelectedMembersToKeep,
    receiptFile,
    uploading,
    onRefresh,
    totalPrice,
    handleNextStep,
    toggleMemberSelection,
    handlePickReceipt,
    handleSubmitRequest,
    resetRenewForm,
  };
}
