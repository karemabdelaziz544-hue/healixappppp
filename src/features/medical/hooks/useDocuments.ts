import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { showToast } from '../../../../components/AppToast';
import { logger } from '../../../lib/logger';
import { documentsService } from '../services/documentsService';

export function useDocuments(userId: string, onRefresh: () => Promise<void>, setUploading: (val: boolean) => void) {
  
  const handlePickImage = useCallback(async () => {
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
        const contentType = file.mimeType || `image/${fileExt}`;

        // Fetch ArrayBuffer for stable upload
        const response = await fetch(file.uri);
        const arrayBuffer = await response.arrayBuffer();

        await documentsService.uploadFile(fileName, arrayBuffer, contentType);

        await documentsService.insertDocumentRecord({
          user_id: userId,
          file_name: displayName,
          file_url: fileName,
          file_type: fileExt,
        });

        await onRefresh();
        showToast.success('تم رفع الصورة بنجاح');
      }
    } catch (err) {
      logger.error('[handlePickImage]', err);
      showToast.error('فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  }, [userId, onRefresh, setUploading]);

  const handlePickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled && result.assets.length > 0) {
        setUploading(true);
        const file = result.assets[0];
        const fileExt = file.name.split('.').pop() || 'file';
        const fileName = `docs/${userId}/${Date.now()}.${fileExt}`;
        const contentType = file.mimeType || 'application/octet-stream';

        const response = await fetch(file.uri);
        const arrayBuffer = await response.arrayBuffer();

        await documentsService.uploadFile(fileName, arrayBuffer, contentType);

        await documentsService.insertDocumentRecord({
          user_id: userId,
          file_name: file.name,
          file_url: fileName,
          file_type: fileExt,
        });

        await onRefresh();
        showToast.success('تم رفع الملف بنجاح');
      }
    } catch (err) {
      logger.error('[handlePickDocument]', err);
      showToast.error('فشل رفع الملف');
    } finally {
      setUploading(false);
    }
  }, [userId, onRefresh, setUploading]);

  const handleUploadPress = useCallback(() => {
    Alert.alert(
      "رفع تحليل أو مستند",
      "اختر طريقة الرفع",
      [
        { text: "صورة من الاستوديو 🖼️", onPress: handlePickImage },
        { text: "ملف / مستند 📄", onPress: handlePickDocument },
        { text: "إلغاء", style: "cancel" },
      ]
    );
  }, [handlePickImage, handlePickDocument]);

  const handleViewDocument = useCallback(async (pathOrUrl: string) => {
    try {
      const signedUrl = await documentsService.getSignedUrl(pathOrUrl);
      if (signedUrl) Linking.openURL(signedUrl);
    } catch (err) {
      logger.error('[handleViewDocument]', err);
      showToast.error('لا يمكن فتح الملف');
    }
  }, []);

  return {
    actions: {
      handleUploadPress,
      handleViewDocument
    }
  };
}
