import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../../components/AppToast';
import { logger } from '../../lib/logger';
import { MedicalTabProps } from './medical.types';
import { medicalStyles as styles } from './medicalStyles';
import type { ClientDocument } from '../../types';

interface DocumentsTabProps extends MedicalTabProps {
  docs: ClientDocument[];
  onRefresh: () => Promise<void>;
}

export default function DocumentsTab({ userId, docs, uploading, setUploading, onRefresh }: DocumentsTabProps) {
  
  // 🔥 رفع من الجاليري (صور)
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setUploading(true);
        const file = result.assets[0];
        const uriParts = file.uri.split('.');
        const fileExt = uriParts[uriParts.length - 1] || 'jpg';
        const fileName = `docs/${userId}/${Date.now()}.${fileExt}`;
        const displayName = `تحليل_${new Date().toLocaleDateString('ar-EG')}.${fileExt}`;

        // تحويل الصورة لـ FormData للرفع
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          name: `${Date.now()}.${fileExt}`,
          type: file.mimeType || `image/${fileExt}`,
        } as any);

        const { error: uploadError } = await supabase.storage.from('medical-docs').upload(fileName, formData);
        if (uploadError) throw uploadError;

        await supabase.from('client_documents').insert({
          user_id: userId,
          file_name: displayName,
          file_url: fileName,
          file_type: fileExt,
        });
        await onRefresh();
        showToast.success('تم رفع الصورة بنجاح');
      }
    } catch (err) {
      logger.error(err);
      showToast.error('فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  // 🔥 رفع ملف (PDF, Word, etc)
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled && result.assets.length > 0) {
        setUploading(true);
        const file = result.assets[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `docs/${userId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('medical-docs').upload(fileName, file as any);
        if (uploadError) throw uploadError;
        await supabase.from('client_documents').insert({
          user_id: userId,
          file_name: file.name,
          file_url: fileName,
          file_type: fileExt,
        });
        await onRefresh();
        showToast.success('تم رفع الملف بنجاح');
      }
    } catch (err) {
      logger.error(err);
      showToast.error('فشل رفع الملف');
    } finally {
      setUploading(false);
    }
  };

  // 🔥 قائمة اختيار: صورة أم ملف
  const handleUploadPress = () => {
    Alert.alert(
      "رفع تحليل أو مستند",
      "اختر طريقة الرفع",
      [
        { text: "صورة من الاستوديو 🖼️", onPress: handlePickImage },
        { text: "ملف / مستند 📄", onPress: handlePickDocument },
        { text: "إلغاء", style: "cancel" },
      ]
    );
  };

  const handleViewDocument = async (pathOrUrl: string) => {
    try {
      const { data } = await supabase.storage.from('medical-docs').createSignedUrl(pathOrUrl, 3600);
      if (data?.signedUrl) Linking.openURL(data.signedUrl);
    } catch (err) {
      showToast.error('لا يمكن فتح الملف');
    }
  };

  return (
    <View style={styles.fadeContainer}>
      <TouchableOpacity style={styles.uploadDocBtn} onPress={handleUploadPress} disabled={uploading}>
        {uploading ? (
          <ActivityIndicator size="large" color="#2A4B46" />
        ) : (
          <>
            <Ionicons name="cloud-upload" size={48} color="#2A4B46" />
            <Text style={styles.uploadDocTitle}>اضغط لرفع صورة أو ملف</Text>
            <Text style={styles.uploadDocSub}>صور تحاليل، روشتة، أو أي مستند طبي</Text>
          </>
        )}
      </TouchableOpacity>
      <View style={styles.docsList}>
        {docs.length === 0 ? (
          <Text style={styles.emptyText}>لا يوجد مستندات مرفوعة</Text>
        ) : (
          docs.map(doc => (
            <View key={doc.id} style={styles.docCard}>
              <TouchableOpacity style={styles.viewDocBtn} onPress={() => handleViewDocument(doc.file_url)}>
                <Text style={styles.viewDocBtnText}>عرض</Text>
              </TouchableOpacity>
              <View style={styles.docInfo}>
                <Text style={styles.docName} numberOfLines={1}>{doc.file_name}</Text>
                <Text style={styles.docDate}>{new Date(doc.created_at).toLocaleDateString('ar-EG')}</Text>
              </View>
              <View style={styles.docIconBox}>
                <Ionicons name="document-text" size={24} color="#3B82F6" />
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
