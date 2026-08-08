import { Text, TextInput } from '@/components/AppText';
import React, { memo, useState, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MedicalTabProps } from './medical.types';
import { medicalStyles as styles } from './medicalStyles';
import type { ClientDocument } from '../../types';
import { useDocuments } from './hooks/useDocuments';
import { AppColors, AppRadius, AppFontFamily } from '../../../constants/AppTheme';
import { AnimatedButton } from '../../../components/animations/AnimatedButton';
import { SlideInView } from '../../../components/animations/SlideInView';

interface DocumentsTabProps extends MedicalTabProps {
  docs: ClientDocument[];
  onRefresh: () => Promise<void>;
}

const DocumentCard = memo(({ doc, onView, index }: { doc: ClientDocument; onView: (url: string) => void; index: number }) => (
  <SlideInView delay={100 + index * 50} direction="up" style={styles.docCard}>
    <View style={styles.docIconBox}>
      <Ionicons name="document-text" size={24} color="#3B82F6" />
    </View>
    <View style={styles.docInfo}>
      <Text style={styles.docName} numberOfLines={1}>{doc.file_name}</Text>
      <Text style={styles.docDate}>{new Date(doc.created_at).toLocaleDateString('ar-EG')}</Text>
    </View>
    <AnimatedButton style={styles.viewDocBtn} onPress={() => onView(doc.file_url)}>
      <Text style={styles.viewDocBtnText}>عرض</Text>
    </AnimatedButton>
  </SlideInView>
));

export default function DocumentsTab({ userId, docs, uploading, setUploading, onRefresh }: DocumentsTabProps) {
  const { actions: { handleUploadPress, handleViewDocument } } = useDocuments(userId, onRefresh, setUploading);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocs = useMemo(() => {
    if (!searchQuery) return docs;
    return docs.filter(doc =>
      doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [docs, searchQuery]);

  return (
    <View style={styles.fadeContainer}>
      <AnimatedButton style={styles.uploadDocBtn} onPress={handleUploadPress} disabled={uploading}>
        {uploading ? (
          <ActivityIndicator size="large" color={AppColors.primary} />
        ) : (
          <>
            <Ionicons name="cloud-upload" size={48} color={AppColors.primary} />
            <Text style={styles.uploadDocTitle}>اضغط لرفع صورة أو ملف</Text>
            <Text style={styles.uploadDocSub}>صور تحاليل، روشتة، أو أي مستند طبي</Text>
          </>
        )}
      </AnimatedButton>

      {docs.length > 0 && (
        <SlideInView delay={50} direction="up" style={localStyles.searchBar}>
          <Ionicons name="search-outline" size={20} color={AppColors.textSecondary} style={localStyles.searchIcon} />
          <TextInput
            style={localStyles.searchInput}
            placeholder="بحث باسم المستند..."
            placeholderTextColor={AppColors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign="left"
          />
          {searchQuery.length > 0 && (
            <AnimatedButton onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={AppColors.textMuted} />
            </AnimatedButton>
          )}
        </SlideInView>
      )}

      <View style={styles.docsList}>
        {docs.length === 0 ? (
          <Text style={styles.emptyText}>لا يوجد مستندات مرفوعة</Text>
        ) : filteredDocs.length === 0 ? (
          <Text style={styles.emptyText}>لا توجد نتائج تطابق بحثك.</Text>
        ) : (
          filteredDocs.map((doc, index) => (
            <DocumentCard key={doc.id} doc={doc} onView={handleViewDocument} index={index} />
          ))
        )}
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.inputBg,
    borderRadius: AppRadius.md,
    paddingHorizontal: 12,
    height: 44,
    marginVertical: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: AppFontFamily.regular,
    fontSize: 14,
    color: AppColors.textPrimary,
  },
});
