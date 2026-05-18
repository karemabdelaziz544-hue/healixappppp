import React, { memo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MedicalTabProps } from './medical.types';
import { medicalStyles as styles } from './medicalStyles';
import type { ClientDocument } from '../../types';
import { useDocuments } from './hooks/useDocuments';

interface DocumentsTabProps extends MedicalTabProps {
  docs: ClientDocument[];
  onRefresh: () => Promise<void>;
}

// 🌟 Memoize DocumentCard for performance
const DocumentCard = memo(({ doc, onView }: { doc: ClientDocument, onView: (url: string) => void }) => (
  <View style={styles.docCard}>
    <TouchableOpacity style={styles.viewDocBtn} onPress={() => onView(doc.file_url)}>
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
));

export default function DocumentsTab({ userId, docs, uploading, setUploading, onRefresh }: DocumentsTabProps) {
  const { actions: { handleUploadPress, handleViewDocument } } = useDocuments(userId, onRefresh, setUploading);

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
            <DocumentCard key={doc.id} doc={doc} onView={handleViewDocument} />
          ))
        )}
      </View>
    </View>
  );
}
