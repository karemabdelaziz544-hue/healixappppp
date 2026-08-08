import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { encode } from 'base64-arraybuffer';
import { supabase } from '../../../lib/supabase';
import { executeQuery } from '../../../lib/apiClient';
import { logger } from '../../../lib/logger';
import { showToast } from '../../../../components/AppToast';
import { SubscriptionConfig } from '../../../../constants/subscriptionConfig';
import type { PaymentRequest, Profile } from '../../../types';
import type { PaymentType, SubscriptionDetails } from '../subscription.types';
import { ALLOWED_RECEIPT_TYPES, MAX_RECEIPT_SIZE } from '../paymentConfig';

export interface ReceiptFile { uri: string; name: string; mimeType: string; size?: number; base64?: string; }

// =========================================================================
// Hook 1: usePaymentHistory — fetches payment records with realtime updates
// =========================================================================
export function usePaymentHistory(userId: string | undefined) {
  const [loading, setLoading] = useState(Boolean(userId));
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<PaymentRequest[]>([]);
  const [pendingRequest, setPendingRequest] = useState<PaymentRequest | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setHistory([]); setPendingRequest(null); setLoading(false); return;
    }
    try {
      const columns = 'id,user_id,amount,expected_amount,declared_transferred_amount,admin_confirmed_amount,plan_type,status,receipt_url,renewal_metadata,previous_request_id,attempt_group_id,rejection_reason,admin_notes,reviewed_at,invoice_number,created_at,payment_type,requested_family_quota,keep_member_ids';
      const { data, error } = await executeQuery<PaymentRequest[]>(
        supabase.from('payment_requests').select(columns).eq('user_id', userId).order('created_at', { ascending: false }).limit(50), { isIdempotent: true },
      );
      if (error) throw error;
      const requests = data ?? [];
      setHistory(requests);
      setPendingRequest(requests.find(request => request.status === 'pending') ?? null);
    } catch (error) {
      logger.error('[usePaymentHistory] fetch error:', error);
    } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => {
    setLoading(Boolean(userId)); fetchData();
  }, [userId, fetchData]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`payment-requests-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_requests', filter: `user_id=eq.${userId}` }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchData]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };
  const latestRequest = history[0] ?? null;

  return { loading, refreshing, history, pendingRequest, latestRequest, onRefresh, refetch: fetchData };
}

// =========================================================================
// Hook 2: useSubscriptionDetails — fetches current subscription from backend
// =========================================================================
export function useSubscriptionDetails(userId: string | undefined) {
  const [details, setDetails] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));

  const fetchDetails = useCallback(async () => {
    if (!userId) { setDetails(null); setLoading(false); return; }
    try {
      const { data, error } = await supabase.rpc('get_my_subscription_details');
      if (error) throw error;
      setDetails(data && Array.isArray(data) && data[0] ? (data[0] as SubscriptionDetails) : null);
    } catch (error) {
      logger.error('[useSubscriptionDetails] fetch error:', error);
    } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => {
    setLoading(Boolean(userId)); fetchDetails();
  }, [userId, fetchDetails]);

  return { details, loading, refetch: fetchDetails };
}

// =========================================================================
// Hook 3: useBackendPrice — fetches price from backend RPC
// =========================================================================
export function useBackendPrice(subCount: number) {
  const [price, setPrice] = useState<number>(SubscriptionConfig.estimateTotal(subCount));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Immediately show estimated price for responsive UI
    setPrice(SubscriptionConfig.estimateTotal(subCount));

    // Then fetch authoritative price from backend
    let cancelled = false;
    
    async function fetchPrice() {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_subscription_price', { sub_count: subCount });
        if (cancelled) return;
        if (!error && typeof data === 'number') {
          setPrice(data);
        }
      } catch (err) {
        logger.error('[useBackendPrice] error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPrice();
    return () => { cancelled = true; };
  }, [subCount]);

  return { price, loading };
}

// =========================================================================
// Hook 4: usePaymentSubmission — receipt handling and payment form state
// =========================================================================
export function usePaymentSubmission(userId: string | undefined) {
  const [receiptFile, setReceiptFile] = useState<ReceiptFile | null>(null);
  const [uploading, setUploading] = useState(false);

  const setPickedReceipt = (file: ReceiptFile) => {
    if (!(ALLOWED_RECEIPT_TYPES as readonly string[]).includes(file.mimeType)) return showToast.error('نوع الملف غير مدعوم. يُسمح بـ JPEG وPNG وHEIC وPDF.');
    if (file.size && file.size > MAX_RECEIPT_SIZE) return showToast.error('حجم الملف يتجاوز 10 ميغابايت');
    setReceiptFile(file);
  };

  const handlePickReceiptImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, base64: true });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]; const extension = asset.uri.split('.').pop() || 'jpg';
        setPickedReceipt({ uri: asset.uri, name: `receipt.${extension}`, mimeType: asset.mimeType || `image/${extension}`, size: asset.fileSize ?? undefined, base64: asset.base64 ?? undefined });
      }
    } catch { Alert.alert('خطأ', 'لا يمكن الوصول للاستوديو'); }
  };

  const handlePickReceiptFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]; setPickedReceipt({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || 'application/octet-stream', size: asset.size ?? undefined });
      }
    } catch { Alert.alert('خطأ', 'لا يمكن فتح الملفات'); }
  };

  const handlePickReceipt = () => Alert.alert('إرفاق إيصال الدفع', 'اختر طريقة الرفع', [
    { text: 'صورة من الاستوديو 🖼️', onPress: handlePickReceiptImage }, { text: 'ملف PDF 📄', onPress: handlePickReceiptFile }, { text: 'إلغاء', style: 'cancel' },
  ]);

  const handleSubmitRequest = async (
    newSubCount: number,
    selectedMembersToKeep: string[],
    paymentType: PaymentType,
    declaredTransferredAmount?: number,
    previousRequestId?: string,
  ): Promise<PaymentRequest | null> => {
    if (!userId) { showToast.error('تعذر التحقق من الحساب. أعد تسجيل الدخول ثم حاول مجدداً.'); return null; }
    if (!receiptFile) { Alert.alert('تنبيه', 'يرجى إرفاق الإيصال أولاً'); return null; }
    setUploading(true);
    try {
      let base64 = receiptFile.base64;
      if (!base64) {
        const response = await fetch(receiptFile.uri);
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_RECEIPT_SIZE || !(ALLOWED_RECEIPT_TYPES as readonly string[]).includes(receiptFile.mimeType)) {
          throw new Error('INVALID_RECEIPT');
        }
        base64 = encode(arrayBuffer);
      }
      const { data, error } = await supabase.functions.invoke<{ request: PaymentRequest }>('submit-payment-request', {
        body: {
          receiptBase64: base64,
          contentType: receiptFile.mimeType,
          subCount: newSubCount,
          paymentType,
          keepMemberIds: selectedMembersToKeep,
          declaredTransferredAmount: declaredTransferredAmount ?? null,
          previousRequestId: previousRequestId ?? null,
        },
      });
      if (error || !data?.request) throw error ?? new Error('SUBMIT_FAILED');
      showToast.success('تم إرسال طلبك بنجاح!', 'سيتم مراجعته وتفعيل الباقة قريباً');
      setReceiptFile(null);
      return data.request;
    } catch (error: any) {
      logger.error('[usePaymentSubmission] submit error:', error);
      if (error && error.context && typeof error.context.text === 'function') {
        try {
          const bodyText = await error.context.text();
          logger.error('[usePaymentSubmission] error body:', bodyText);
          let errorMsg = bodyText;
          try {
            const parsed = JSON.parse(bodyText);
            if (parsed.error) errorMsg = parsed.error;
          } catch {}
          showToast.error(`خطأ: ${errorMsg}`);
          return null;
        } catch (e) {
          logger.error('[usePaymentSubmission] failed to parse error context:', e);
        }
      }
      showToast.error('تعذر إرسال طلب الدفع. يرجى التحقق من البيانات والمحاولة مجدداً.');
      return null;
    } finally { setUploading(false); }
  };

  const resetForm = () => { setReceiptFile(null); };

  return { receiptFile, uploading, handlePickReceipt, handleSubmitRequest, resetForm };
}

// =========================================================================
// Hook 5: useFamilySelection — manages family member counter and selection
// =========================================================================
export function useFamilySelection(subMembers: Profile[], initialCount?: number) {
  const subAccountsCount = subMembers.length;
  const [newSubCount, setNewSubCount] = useState(initialCount ?? subAccountsCount);
  const [selectedMembersToKeep, setSelectedMembersToKeep] = useState<string[]>([]);

  const requiresSelection = newSubCount < subAccountsCount;

  // Auto-select all members when count is >= current
  useEffect(() => {
    if (newSubCount >= subAccountsCount) {
      setSelectedMembersToKeep(subMembers.map(m => m.id));
    }
  }, [newSubCount, subAccountsCount]);

  const toggleMemberSelection = (id: string) => setSelectedMembersToKeep(previous => {
    if (previous.includes(id)) return previous.filter(memberId => memberId !== id);
    if (previous.length >= newSubCount) { Alert.alert('تنبيه', `أقصى عدد مسموح به هو ${newSubCount} أفراد.`); return previous; }
    return [...previous, id];
  });

  /** Determine payment type based on current vs new state */
  const determinePaymentType = (hasActiveSubscription: boolean, currentQuota: number): PaymentType => {
    if (!hasActiveSubscription) return 'new';
    if (newSubCount > currentQuota) return 'upgrade';
    if (newSubCount < currentQuota) return 'downgrade';
    return 'renewal';
  };

  const reset = () => {
    setNewSubCount(subAccountsCount);
    setSelectedMembersToKeep([]);
  };

  return {
    newSubCount, setNewSubCount,
    selectedMembersToKeep, setSelectedMembersToKeep,
    requiresSelection,
    toggleMemberSelection,
    determinePaymentType,
    reset,
  };
}

// =========================================================================
// Legacy compatibility wrapper — useSubscriptionData
// =========================================================================
/**
 * @deprecated Use the decomposed hooks instead:
 *   usePaymentHistory, useSubscriptionDetails, useBackendPrice,
 *   usePaymentSubmission, useFamilySelection
 *
 * This wrapper maintains backward compatibility during migration.
 */
export function useSubscriptionData(userId: string | undefined, subAccountsCount: number, subMembers: Profile[]) {
  const { loading: historyLoading, refreshing, history, pendingRequest, latestRequest, onRefresh } = usePaymentHistory(userId);
  const { newSubCount, setNewSubCount, selectedMembersToKeep, setSelectedMembersToKeep, toggleMemberSelection } = useFamilySelection(subMembers);
  const { price: totalPrice } = useBackendPrice(newSubCount);
  const { receiptFile, uploading, handlePickReceipt, handleSubmitRequest: submitPayment, resetForm } = usePaymentSubmission(userId);

  const loading = historyLoading;

  const handleSubmitRequest = async (declaredTransferredAmount?: number, previousRequestId?: string): Promise<PaymentRequest | null> => {
    return submitPayment(newSubCount, selectedMembersToKeep, 'new', declaredTransferredAmount, previousRequestId);
  };

  return {
    activeTab: 'current' as const, setActiveTab: () => {},
    loading, refreshing, history, pendingRequest, latestRequest,
    showRenewForm: false, setShowRenewForm: () => {},
    step: 1, setStep: () => {},
    newSubCount, setNewSubCount,
    selectedMembersToKeep, setSelectedMembersToKeep,
    receiptFile, uploading,
    onRefresh, totalPrice,
    handleNextStep: () => {},
    toggleMemberSelection, handlePickReceipt, handleSubmitRequest,
    resetRenewForm: resetForm,
  };
}
