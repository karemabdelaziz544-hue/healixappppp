import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/src/lib/supabase';
import { Text } from '@/components/AppText';
import { AppColors, AppRadius, AppSpacing, AppFontFamily, AppFontSize } from '@/constants/AppTheme';
import { AnimatedButton } from '@/components/animations/AnimatedButton';
import { showToast } from '@/components/AppToast';
import { useAuth } from '@/src/context/AuthContext';
import { getCachedSignedUrl } from '@/src/lib/storageCache';

const { width } = Dimensions.get('window');

interface EventType {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  max_capacity: number | null;
  price: number | null;
  image_url: string | null;
  category: string | null;
  duration: string | null;
}

export default function EventBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const user = session?.user;

  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [receiptDisplayUrl, setReceiptDisplayUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setEvent(data);
      } catch (err: any) {
        showToast.error('فشل تحميل تفاصيل الفعالية');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  const handleImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      showToast.info('نحتاج لصلاحية الوصول لمعرض الصور لرفع الإيصال.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (pickerResult.canceled || !pickerResult.assets[0].base64) return;

    setUploadingImage(true);
    try {
      const base64FileData = pickerResult.assets[0].base64;
      const fileExt = pickerResult.assets[0].uri.split('.').pop() || 'jpeg';
      const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const fileName = `events/${user?.id}/${fileId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, decode(base64FileData), { contentType: `image/${fileExt}` });

      if (uploadError) throw uploadError;

      setReceiptPath(fileName);
      const signedUrl = await getCachedSignedUrl('receipts', fileName, 3600);
      setReceiptDisplayUrl(signedUrl || pickerResult.assets[0].uri);
      showToast.success('تم رفع إيصال التحويل بنجاح!');
    } catch (err: any) {
      showToast.error('فشل رفع الإيصال: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!event || !user) return;
    
    const isPaid = event.price && event.price > 0;
    if (isPaid && !receiptPath) {
      showToast.info('يرجى رفع صورة إيصال التحويل البنكي أولاً لتأكيد الحجز.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: bkData, error: bkErr } = await supabase
        .from('event_bookings')
        .insert({
          event_id: event.id,
          user_id: user.id,
          payment_proof: receiptPath,
          status: isPaid ? 'pending' : 'confirmed', // Auto-confirm if free
          attended: false,
        })
        .select()
        .single();

      if (bkErr) throw bkErr;

      showToast.success(isPaid ? 'تم إرسال طلب الحجز، قيد المراجعة الآن ⏳' : 'تم تأكيد حجزك بنجاح! 🎉');
      router.replace(`/events/ticket?id=${bkData.id}`);
    } catch (err: any) {
      showToast.error('فشل تأكيد الحجز: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  if (!event) return null;

  const isPaid = event.price && event.price > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={24} color={AppColors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>إتمام الدفع</Text>
          <Text style={styles.headerSubtitle}>تبقى خطوة واحدة لتأكيد حجزك</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Event Summary Card */}
        <View style={styles.eventSummaryCard}>
          <Text style={styles.summaryLabel}>الفعالية المختارة</Text>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={AppColors.textSecondary} />
            <Text style={styles.metaText}>
              {new Date(event.event_date).toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <Ionicons name="location-outline" size={14} color={AppColors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={styles.metaText}>{event.location || 'حضوري في مقر هيلكس'}</Text>
          </View>
        </View>

        {/* Pricing Summary */}
        <View style={styles.pricingCard}>
          <Text style={styles.cardTitle}>ملخص التكلفة</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>سعر التذكرة</Text>
            <Text style={styles.priceValue}>{isPaid ? `${event.price} جنيه` : 'مجاني'}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>ضريبة القيمة المضافة (15%)</Text>
            <Text style={styles.priceValue}>{isPaid ? 'مشمولة' : '0 جنيه'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>المجموع الإجمالي</Text>
            <Text style={styles.totalValue}>{isPaid ? `${event.price} جنيه` : '0 جنيه'}</Text>
          </View>
        </View>

        {/* Bank/Wallet details if paid */}
        {isPaid && (
          <View style={styles.bankCard}>
            <Text style={styles.cardTitle}>طرق الدفع المتاحة</Text>
            <Text style={styles.bankInstruction}>
              يرجى تحويل مبلغ التذكرة عبر إحدى الطرق التالية وإرفاق إيصال التحويل:
            </Text>
            
            <View style={styles.bankDetailRow}>
              <Text style={styles.bankDetailLabel}>فودافون كاش:</Text>
              <Text style={styles.bankDetailValue}>010XXXXXXXX</Text>
            </View>
            <View style={styles.bankDetailRow}>
              <Text style={styles.bankDetailLabel}>إنستاباي (InstaPay):</Text>
              <Text style={[styles.bankDetailValue, styles.ibanText]}>healix@instapay</Text>
            </View>
          </View>
        )}

        {/* Receipt upload if paid */}
        {isPaid && (
          <View style={styles.uploadCard}>
            <Text style={styles.cardTitle}>إرفاق إيصال التحويل</Text>
            
            {uploadingImage ? (
              <View style={styles.uploadPlaceholder}>
                <ActivityIndicator size="small" color={AppColors.primary} />
                <Text style={styles.uploadPlaceholderText}>جاري رفع الصورة...</Text>
              </View>
            ) : receiptDisplayUrl ? (
              <View style={styles.receiptPreviewContainer}>
                <Image source={{ uri: receiptDisplayUrl }} style={styles.receiptPreview} />
                <TouchableOpacity style={styles.removeReceiptBtn} onPress={() => { setReceiptPath(null); setReceiptDisplayUrl(null); }}>
                  <Ionicons name="trash-outline" size={18} color="#FFF" />
                  <Text style={styles.removeReceiptText}>حذف وإعادة رفع</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadPlaceholder} onPress={handleImagePick}>
                <Ionicons name="cloud-upload-outline" size={36} color={AppColors.primary} />
                <Text style={styles.uploadPlaceholderText}>اضغط هنا لرفع إيصال التحويل</Text>
                <Text style={styles.uploadHintText}>يُقبل بصيغ PNG, JPG, JPEG</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={styles.bottomActions}>
        <AnimatedButton
          style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
          onPress={handleConfirmBooking}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.confirmBtnText}>
              {isPaid ? 'تأكيد الحجز وإرسال إيصال الدفع' : 'تأكيد حجز التذكرة المجانية'}
            </Text>
          )}
        </AnimatedButton>
      </View>
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
    alignItems: 'center',
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: AppSpacing.xs,
  },
  headerTextCol: {
    flex: 1,
    marginRight: AppSpacing.md,
  },
  headerTitle: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.lg,
    color: AppColors.primary,
    textAlign: 'left',
  },
  headerSubtitle: {
    fontFamily: AppFontFamily.regular,
    fontSize: AppFontSize.xs + 1,
    color: AppColors.textSecondary,
    textAlign: 'left',
    marginTop: 2,
  },
  scrollContent: {
    padding: AppSpacing.xl,
    gap: AppSpacing.lg,
    paddingBottom: 100,
  },
  eventSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryLabel: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.xs,
    color: AppColors.primary,
    textAlign: 'left',
    marginBottom: AppSpacing.xs,
  },
  eventTitle: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.md + 1,
    color: AppColors.textPrimary,
    textAlign: 'left',
    marginBottom: AppSpacing.sm,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.xs + 1,
    color: AppColors.textSecondary,
  },
  pricingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.sm + 1,
    color: AppColors.textPrimary,
    textAlign: 'left',
    marginBottom: AppSpacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.sm,
  },
  priceLabel: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.sm,
    color: AppColors.textSecondary,
  },
  priceValue: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.sm,
    color: AppColors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: AppSpacing.sm,
  },
  totalLabel: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.md,
    color: AppColors.textPrimary,
  },
  totalValue: {
    fontFamily: AppFontFamily.extraBold,
    fontSize: AppFontSize.lg,
    color: AppColors.primary,
  },
  bankCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bankInstruction: {
    fontFamily: AppFontFamily.regular,
    fontSize: AppFontSize.sm,
    color: AppColors.textSecondary,
    lineHeight: 22,
    textAlign: 'left',
    marginBottom: AppSpacing.md,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.sm,
  },
  bankDetailLabel: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.xs + 1,
    color: AppColors.textSecondary,
  },
  bankDetailValue: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.sm,
    color: AppColors.textPrimary,
  },
  ibanText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.xs + 1,
    color: AppColors.primary,
  },
  uploadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  uploadPlaceholder: {
    height: 160,
    borderRadius: AppRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: AppColors.primary,
    backgroundColor: '#F7FAF6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: AppSpacing.md,
  },
  uploadPlaceholderText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.sm,
    color: AppColors.primary,
    marginTop: AppSpacing.sm,
  },
  uploadHintText: {
    fontFamily: AppFontFamily.regular,
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
    marginTop: AppSpacing.xs,
  },
  receiptPreviewContainer: {
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  receiptPreview: {
    width: '100%',
    height: 200,
    borderRadius: AppRadius.md,
    resizeMode: 'contain',
    backgroundColor: '#F3F4F6',
  },
  removeReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.xs,
    borderRadius: AppRadius.full,
  },
  removeReceiptText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.xs,
    color: '#FFFFFF',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    padding: AppSpacing.lg,
  },
  confirmBtn: {
    backgroundColor: AppColors.primary,
    height: 50,
    borderRadius: AppRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  confirmBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  confirmBtnText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.md,
    color: '#FFFFFF',
  },
});
