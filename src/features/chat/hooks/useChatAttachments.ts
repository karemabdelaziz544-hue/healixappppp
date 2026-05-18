import { useState } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export interface Attachment {
  uri: string;
  name: string;
  mimeType: string;
}

export function useChatAttachments() {
  const [attachment, setAttachment] = useState<Attachment | null>(null);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        const uriParts = file.uri.split('.');
        const fileExt = uriParts[uriParts.length - 1];
        setAttachment({
          uri: file.uri,
          name: `photo_${Date.now()}.${fileExt}`,
          mimeType: file.mimeType || `image/${fileExt}`,
        });
      }
    } catch (err) {
      Alert.alert('خطأ', 'لا يمكن الوصول للاستوديو');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        setAttachment({
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType || 'application/octet-stream',
        });
      }
    } catch (err) {
      if (__DEV__) console.log(err);
    }
  };

  const handleAttachmentClick = () => {
    Alert.alert('إرفاق', 'اختر نوع المرفق الذي تريد إرساله', [
      { text: 'صورة من الاستوديو 🖼️', onPress: pickImage },
      { text: 'ملف / مستند 📄', onPress: pickDocument },
      { text: 'إلغاء', style: 'cancel' },
    ]);
  };

  return { attachment, setAttachment, handleAttachmentClick };
}
