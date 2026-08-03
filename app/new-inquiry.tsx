import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppColors, AppFontFamily, AppRadius } from '../constants/AppTheme';
import { showToast } from '../components/AppToast';
import { useFamily } from '../src/context/FamilyContext';
import { useChatAttachments } from '../src/features/chat/hooks/useChatAttachments';
import { supabase } from '../src/lib/supabase';
import { generateUUID } from '../src/lib/offlineQueue';
import NetInfo from '@react-native-community/netinfo';
import { AnimatedButton } from '../components/animations/AnimatedButton';
import { FadeInView } from '../components/animations/FadeInView';
import { SlideInView } from '../components/animations/SlideInView';

const CATEGORIES = [
  { id: 'nutrition', label: 'النظام الغذائي', icon: 'restaurant-outline' },
  { id: 'meals', label: 'الوجبات', icon: 'fast-food-outline' },
  { id: 'weight', label: 'الوزن', icon: 'scale-outline' },
  { id: 'exercises', label: 'التمارين', icon: 'barbell-outline' },
  { id: 'symptoms', label: 'الأعراض', icon: 'medical-outline' },
  { id: 'other', label: 'مشكلة أخرى', icon: 'help-circle-outline' },
];

export default function NewInquiryScreen() {
  const router = useRouter();
  const { currentProfile } = useFamily();
  const currentUserId = currentProfile?.id;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('nutrition');
  const [content, setContent] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);

  const { attachment, setAttachment, handleAttachmentClick } = useChatAttachments();

  const handleSubmit = async () => {
    if (!currentUserId) return;
    if (!content.trim()) {
      showToast.error('يرجى كتابة تفاصيل الاستفسار');
      return;
    }
    if (category === 'weight' && !weight.trim()) {
      showToast.error('يرجى إدخال وزنك الحالي');
      return;
    }

    setLoading(true);
    try {
      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        showToast.error('يجب أن تكون متصلاً بالإنترنت لإنشاء استفسار جديد');
        setLoading(false);
        return;
      }

      // 1. Fetch doctor ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('assigned_doctor_id')
        .eq('id', currentUserId)
        .maybeSingle();
      
      const doctorId = profile?.assigned_doctor_id;
      if (!doctorId) {
        showToast.error('لم يتم تعيين طبيب لحسابك بعد');
        setLoading(false);
        return;
      }

      // 2. Upload attachment if exists
      let attachmentPath = null;
      let attachmentType = null;
      
      if (attachment) {
        attachmentType = attachment.mimeType.startsWith('image/') ? 'image' : attachment.mimeType.startsWith('audio/') ? 'audio' : 'file';
        const fileExt = attachment.name.split('.').pop() || 'file';
        const filePath = `${currentUserId}/${Date.now()}.${fileExt}`;
        const fileResponse = await fetch(attachment.uri);
        const arrayBuffer = await fileResponse.arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, arrayBuffer, { contentType: attachment.mimeType || 'application/octet-stream' });
        
        if (uploadError) throw uploadError;
        attachmentPath = filePath;
      }

      // 3. Insert Inquiry
      const finalTitle = title.trim() ? title : CATEGORIES.find(c => c.id === category)?.label || 'استفسار جديد';
      const { data: inquiry, error: inquiryErr } = await supabase
        .from('inquiries')
        .insert({
          user_id: currentUserId,
          title: finalTitle,
          category,
          status: 'open'
        })
        .select('id')
        .maybeSingle();
      
      if (inquiryErr || !inquiry) throw inquiryErr;

      // 4. Insert Initial Message
      let finalContent = content.trim();
      if (category === 'weight') {
        finalContent = `الوزن الحالي: ${weight} كجم\n\n${finalContent}`;
      }

      const messageId = generateUUID();
      const { error: msgErr } = await supabase
        .from('messages')
        .insert({
          id: messageId,
          sender_id: currentUserId,
          receiver_id: doctorId,
          content: finalContent,
          attachment_url: attachmentPath,
          attachment_type: attachmentType,
          recipient_type: 'doctor',
          inquiry_id: inquiry.id,
          is_read: false
        });

      if (msgErr) throw msgErr;

      showToast.success('تم إرسال استفسارك بنجاح');
      
      // Navigate to the chat view for this inquiry
      router.replace({
        pathname: '/inquiry/[id]',
        params: { id: inquiry.id, status: 'open', title: finalTitle }
      });

    } catch (err) {
      console.error(err);
      showToast.error('حدث خطأ أثناء الإرسال، يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FadeInView delay={50} style={styles.header}>
          <AnimatedButton onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={24} color={AppColors.textPrimary} />
          </AnimatedButton>
          <Text style={styles.headerTitle}>استفسار جديد</Text>
          <View style={{ width: 40 }} />
        </FadeInView>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>موضوع الاستفسار</Text>
          <FlatList
            data={CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.categoriesContainer}
            renderItem={({ item, index }) => {
              const isSelected = category === item.id;
              return (
                <FadeInView delay={index * 50}>
                <AnimatedButton
                  style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                  onPress={() => setCategory(item.id)}
                >
                  <Ionicons name={item.icon as any} size={20} color={isSelected ? '#FFF' : AppColors.textSecondary} />
                  <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>{item.label}</Text>
                </AnimatedButton>
                </FadeInView>
              );
            }}
          />

          <SlideInView delay={100} direction="up" style={styles.formGroup}>
            <Text style={styles.label}>عنوان الاستفسار (اختياري)</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: أريد تغيير وجبة الفطور"
              value={title}
              onChangeText={setTitle}
              textAlign="left"
            />
          </SlideInView>

          {category === 'weight' && (
            <SlideInView delay={150} direction="up" style={styles.formGroup}>
              <Text style={styles.label}>وزنك الحالي (كجم)</Text>
              <TextInput
                style={styles.input}
                placeholder="أدخل وزنك بالكيلوجرام"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                textAlign="left"
              />
            </SlideInView>
          )}

          <SlideInView delay={200} direction="up" style={styles.formGroup}>
            <Text style={styles.label}>التفاصيل</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="اكتب تفاصيل استفسارك أو مشكلتك هنا..."
              value={content}
              onChangeText={setContent}
              multiline
              textAlign="left"
              textAlignVertical="top"
            />
          </SlideInView>

          <SlideInView delay={250} direction="up" style={styles.formGroup}>
            <Text style={styles.label}>المرفقات</Text>
            {attachment ? (
              <View style={styles.attachmentPreview}>
                <Ionicons name="document-attach-outline" size={24} color={AppColors.primary} />
                <Text style={styles.attachmentName} numberOfLines={1}>{attachment.name}</Text>
                <AnimatedButton onPress={() => setAttachment(null)}>
                  <Ionicons name="close-circle" size={24} color={AppColors.danger} />
                </AnimatedButton>
              </View>
            ) : (
              <AnimatedButton style={styles.attachBtn} onPress={handleAttachmentClick}>
                <Ionicons name="cloud-upload-outline" size={24} color={AppColors.textSecondary} />
                <Text style={styles.attachBtnText}>إرفاق صورة أو ملف (اختياري)</Text>
              </AnimatedButton>
            )}
          </SlideInView>

        </ScrollView>

        <SlideInView delay={300} direction="up" style={styles.footer}>
          <AnimatedButton 
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
            onPress={handleSubmit} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>إرسال الاستفسار</Text>
            )}
          </AnimatedButton>
        </SlideInView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: AppColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  backBtn: { padding: 8 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    fontFamily: AppFontFamily.bold,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
    marginBottom: 12,
    fontFamily: AppFontFamily.bold,
    textAlign: 'left',
  },
  categoriesContainer: {
    paddingBottom: 20,
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
    gap: 8,
  },
  categoryChipActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  categoryText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontFamily: AppFontFamily.medium,
  },
  categoryTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: AppColors.textPrimary,
    marginBottom: 8,
    fontFamily: AppFontFamily.medium,
    textAlign: 'left',
  },
  input: {
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: AppRadius.md,
    padding: 14,
    fontSize: 15,
    color: AppColors.textPrimary,
    fontFamily: AppFontFamily.regular,
  },
  textArea: {
    minHeight: 120,
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderStyle: 'dashed',
    borderRadius: AppRadius.md,
    padding: 20,
    gap: 10,
  },
  attachBtnText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontFamily: AppFontFamily.medium,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primaryLight,
    padding: 15,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderColor: AppColors.primary,
    gap: 10,
  },
  attachmentName: {
    flex: 1,
    fontSize: 14,
    color: AppColors.textPrimary,
    fontFamily: AppFontFamily.medium,
    textAlign: 'left',
  },
  footer: {
    padding: 16,
    backgroundColor: AppColors.surface,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  submitBtn: {
    backgroundColor: AppColors.primary,
    paddingVertical: 15,
    borderRadius: AppRadius.full,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: AppFontFamily.bold,
  },
});
