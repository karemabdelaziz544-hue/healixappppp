/**
 * InBodyTab — قياسات الـ InBody والرسوم البيانية
 */
import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { ActivityIndicator, Dimensions, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import type { InbodyRecord } from '../../types';
import { useInBody } from './hooks/useInBody';
import { ARABIC_MONTHS, MedicalTabProps } from './medical.types';
import { medicalStyles as styles } from './medicalStyles';

const screenWidth = Dimensions.get('window').width;

interface InBodyTabProps extends MedicalTabProps {
  inbodyRecords: InbodyRecord[];
  onRefresh: () => Promise<void>;
}

// 🌟 Performance: Memoize History Card to prevent re-renders in lists
const HistoryCard = memo(({ record, onPress }: { record: InbodyRecord, onPress: (r: InbodyRecord) => void }) => {
  const d = new Date(record.record_date);
  return (
    <TouchableOpacity style={styles.historyCard} onPress={() => onPress(record)} activeOpacity={0.7}>
      <View style={styles.historyDateBox}>
        <Text style={styles.historyDay}>{d.getDate()}</Text>
        <Text style={styles.historyMonth}>{ARABIC_MONTHS[d.getMonth()]}</Text>
      </View>
      <View style={styles.historyDetails}>
        <Text style={[styles.historySummary, { color: '#4B5563', fontSize: 14 }]} numberOfLines={1}>
          {record.ai_summary ? record.ai_summary.split('\n')[0] : 'تم تسجيل قياس InBody'}
        </Text>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginTop: 8 }}>
          <Ionicons name="scan-outline" size={16} color="#F97316" />
          <Text style={localStyles.clickForMoreText}>اضغط لمزيد من التفاصيل</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function InBodyTab({ userId, inbodyRecords, uploading, setUploading, onRefresh }: InBodyTabProps) {
  const { state, actions } = useInBody(userId, inbodyRecords, onRefresh, setUploading);

  const {
    showForm, weight, muscle, fat, analyzing, imageUrl, aiReport,
    selectedRecord, modalVisible, chartData, lastRec
  } = state;

  const {
    setWeight, setMuscle, setFat, setShowForm, setModalVisible,
    handleAnalyzeImage, handleSubmit, resetForm, openRecordDetails
  } = actions;

  return (
    <View style={styles.fadeContainer}>
      {/* --- آخر قياس --- */}
      {lastRec ? (
        <>
          <View style={styles.lastRecordHeader}>
            <Text style={styles.lastRecordTitle}>آخر قياس تم تسجيله</Text>
            <Text style={styles.lastRecordDate}>{new Date(lastRec.record_date).toLocaleDateString('ar-EG')}</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderColor: '#E8F3F1' }]}>
              <Text style={styles.statLabel}>الوزن الحالي</Text>
              <Text style={styles.statValue}>{lastRec.weight} <Text style={styles.statUnit}>كجم</Text></Text>
            </View>
            <View style={[styles.statCard, { borderColor: '#FFEDD5' }]}>
              <Text style={styles.statLabel}>العضلات</Text>
              <Text style={styles.statValue}>{lastRec.muscle_mass || '-'} <Text style={styles.statUnit}>كجم</Text></Text>
            </View>
            <View style={[styles.statCard, { borderColor: '#DBEAFE' }]}>
              <Text style={styles.statLabel}>الدهون</Text>
              <Text style={styles.statValue}>{lastRec.fat_percent || '-'} <Text style={styles.statUnit}>%</Text></Text>
            </View>
          </View>
          {lastRec.ai_summary && !showForm && (
            <View style={styles.aiSummaryBox}>
              <Text style={styles.aiSummaryTitle}>رأي الكوتش الذكي:</Text>
              <Text style={styles.aiSummaryText}>{lastRec.ai_summary}</Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyAlert}><Text style={styles.emptyAlertText}>ليس لديك سجلات بعد، أضف أول قياس لتبدأ رحلتك! 🚀</Text></View>
      )}

      {/* --- التشارت والمقارنة --- */}
      {chartData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>تطور الوزن</Text>
          <LineChart
            data={chartData} width={screenWidth - 40} height={220}
            chartConfig={{ backgroundColor: '#FFF', backgroundGradientFrom: '#FFF', backgroundGradientTo: '#FFF', decimalPlaces: 1, color: (opacity = 1) => `rgba(42, 75, 70, ${opacity})`, labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`, propsForDots: { r: "6", strokeWidth: "2", stroke: "#F97316" } }}
            bezier style={{ borderRadius: 16 }}
          />
        </View>
      )}

      {/* --- أزرار الإضافة --- */}
      {!showForm && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: '#F97316', backgroundColor: '#FFF7ED' }]} onPress={handleAnalyzeImage} disabled={analyzing}>
            {analyzing ? <ActivityIndicator color="#F97316" /> : <Ionicons name="color-wand" size={28} color="#F97316" />}
            <Text style={[styles.actionBtnText, { color: '#F97316' }]}>{analyzing ? 'جاري التحليل...' : 'قراءة ذكية للورقة'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowForm(true)}>
            <Ionicons name="create-outline" size={28} color="#6B7280" />
            <Text style={styles.actionBtnText}>إدخال يدوي</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* --- فورم الإضافة --- */}
      {showForm && (
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={resetForm}>
              <Ionicons name="close-circle" size={28} color="#EF4444" />
            </TouchableOpacity>
            <Text style={styles.formTitle}>تسجيل قياس جديد</Text>
          </View>
          {aiReport ? (
            <View style={styles.aiSummaryBox}>
              <Text style={styles.aiSummaryTitle}>رأي الكوتش الذكي (تحقق من الأرقام):</Text>
              <Text style={styles.aiSummaryText}>{aiReport}</Text>
            </View>
          ) : imageUrl ? (
            <View style={[styles.aiSummaryBox, { borderColor: '#D1FAE5', backgroundColor: '#F0FDF4' }]}>
              <Text style={[styles.aiSummaryTitle, { color: '#065F46' }]}>✅ تم رفع صورة الورقة</Text>
              <Text style={[styles.aiSummaryText, { color: '#047857' }]}>راجع الأرقام وتأكد منها قبل الحفظ</Text>
            </View>
          ) : null}
          <View style={styles.inputRow}>
            <View style={styles.inputWrap}><Text style={styles.inputLabel}>الدهون %</Text><TextInput style={styles.input} value={fat} onChangeText={setFat} keyboardType="decimal-pad" /></View>
            <View style={styles.inputWrap}><Text style={styles.inputLabel}>العضلات (كجم)</Text><TextInput style={styles.input} value={muscle} onChangeText={setMuscle} keyboardType="decimal-pad" /></View>
            <View style={styles.inputWrap}><Text style={styles.inputLabel}>الوزن (كجم)</Text><TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" /></View>
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={uploading}>
            {uploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>حفظ في السجل</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* --- سجل القياسات (الكروت) --- */}
      {inbodyRecords.length > 0 && !showForm && (
        <View style={styles.historySection}>
          <Text style={styles.historySectionTitle}>سجل القياسات السابقة <Ionicons name="calendar-outline" size={18} /></Text>
          {inbodyRecords.slice().reverse().map(record => (
            <HistoryCard key={record.id} record={record} onPress={openRecordDetails} />
          ))}
        </View>
      )}

      {/* 🔴 Modal (Popup) لعرض التفاصيل */}
      {selectedRecord && (
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={localStyles.modalOverlay}>
            <View style={localStyles.modalContent}>

              {/* Header */}
              <View style={localStyles.modalHeader}>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={28} color="#4B5563" />
                </TouchableOpacity>
                <Text style={localStyles.modalTitle}>تفاصيل القياس</Text>
                <View style={{ width: 28 }} />
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* التاريخ */}
                <Text style={localStyles.modalDate}>
                  بتاريخ: {new Date(selectedRecord.record_date).toLocaleDateString('ar-EG')}
                </Text>

                {/* الأرقام الأساسية */}
                <View style={localStyles.modalStatsRow}>
                  <View style={localStyles.modalStatBox}>
                    <Text style={localStyles.modalStatLabel}>الوزن</Text>
                    <Text style={localStyles.modalStatValue}>{selectedRecord.weight} كجم</Text>
                  </View>
                  <View style={localStyles.modalStatBox}>
                    <Text style={localStyles.modalStatLabel}>العضلات</Text>
                    <Text style={localStyles.modalStatValue}>{selectedRecord.muscle_mass || '-'} كجم</Text>
                  </View>
                  <View style={localStyles.modalStatBox}>
                    <Text style={localStyles.modalStatLabel}>الدهون</Text>
                    <Text style={localStyles.modalStatValue}>{selectedRecord.fat_percent || '-'} %</Text>
                  </View>
                </View>

                {/* التقرير الذكي */}
                {selectedRecord.ai_summary ? (
                  <View style={localStyles.modalReportBox}>
                    <Text style={localStyles.modalReportTitle}><Ionicons name="sparkles" color="#F97316" /> التقرير والتحليل الذكي</Text>
                    <Text style={localStyles.modalReportText}>{selectedRecord.ai_summary}</Text>
                  </View>
                ) : (
                  <Text style={localStyles.noReportText}>لا يوجد تقرير ذكي مسجل لهذا القياس.</Text>
                )}

                {/* زر الإغلاق السفلي */}
                <TouchableOpacity style={localStyles.closeBtn} onPress={() => setModalVisible(false)}>
                  <Text style={localStyles.closeBtnText}>حسناً، إغلاق</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

// 🔴 تنسيقات الـ Popup الجديدة
const localStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
  },
  modalTitle: {
    fontFamily: 'Tajawal-Bold', // تأكد من اسم الخط المستخدم في مشروعك
    fontSize: 20,
    color: '#2A4B46',
  },
  modalDate: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalStatsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalStatBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalStatLabel: {
    fontFamily: 'Tajawal-Medium',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 5,
  },
  modalStatValue: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 16,
    color: '#2A4B46',
  },
  modalReportBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    marginBottom: 20,
  },
  modalReportTitle: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 16,
    color: '#9A3412',
    marginBottom: 10,
    textAlign: 'right',
  },
  modalReportText: {
    fontFamily: 'Tajawal-Medium',
    fontSize: 15,
    color: '#431407',
    lineHeight: 24,
    textAlign: 'right',
  },
  noReportText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginVertical: 20,
  },
  closeBtn: {
    backgroundColor: '#2A4B46',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  closeBtnText: {
    fontFamily: 'Tajawal-Bold',
    color: '#FFF',
    fontSize: 16,
  },
  clickForMoreText: {
    fontFamily: 'Tajawal-Medium', // أو أي خط بتستخدمه
    fontSize: 13,
    color: '#F97316',
    marginRight: 4,
  },
});