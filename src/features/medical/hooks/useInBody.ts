import { useState, useCallback, useMemo } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { showToast } from '../../../../components/AppToast';
import { logger } from '../../../../lib/logger';
import { inBodyService } from '../services/inBodyService';
import type { InbodyRecord } from '../../../types';

export function useInBody(userId: string, inbodyRecords: InbodyRecord[], onRefresh: () => Promise<void>, setUploading: (val: boolean) => void) {
  const [showForm, setShowForm] = useState(false);
  const [weight, setWeight] = useState('');
  const [muscle, setMuscle] = useState('');
  const [fat, setFat] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<string>('');

  const [selectedRecord, setSelectedRecord] = useState<InbodyRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const resetForm = useCallback(() => {
    setShowForm(false);
    setWeight('');
    setMuscle('');
    setFat('');
    setImageUrl(null);
    setAiReport('');
  }, []);

  const handleAnalyzeImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.2, // Compress
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        setAnalyzing(true);
        const file = result.assets[0];
        
        if (!file.base64) throw new Error('No image data found');

        const fileName = await inBodyService.uploadImage(userId, file);
        setImageUrl(fileName);

        const fnData: any = await inBodyService.analyzeImage(fileName);

        if (fnData?.extracted?.weight) setWeight(String(fnData.extracted.weight));
        if (fnData?.extracted?.muscle) setMuscle(String(fnData.extracted.muscle));
        if (fnData?.extracted?.fat) setFat(String(fnData.extracted.fat));
        if (fnData?.analysis) setAiReport(fnData.analysis);

        setAnalyzing(false);
        showToast.success('تم تحليل الورقة! راجع الأرقام وتأكد منها.');
        setShowForm(true);
      }
    } catch (err: any) {
      setAnalyzing(false);
      showToast.error('حدث خطأ أثناء رفع الصورة أو التحليل');
      logger.error('[handleAnalyzeImage]', err);
    }
  }, [userId]);

  const handleSubmit = useCallback(async () => {
    if (!weight) return showToast.error('الرجاء إدخال الوزن');
    
    setUploading(true);
    try {
      await inBodyService.insertRecord({
        user_id: userId,
        weight: parseFloat(weight),
        muscle_mass: muscle ? parseFloat(muscle) : null,
        fat_percent: fat ? parseFloat(fat) : null,
        record_date: new Date().toISOString(),
        image_url: imageUrl,
        ai_summary: aiReport,
      });

      await onRefresh();
      resetForm();
      showToast.success('تم حفظ القياس بنجاح!');
    } catch (err) {
      showToast.error('فشل حفظ القياس');
      logger.error('[handleSubmit]', err);
    } finally {
      setUploading(false);
    }
  }, [userId, weight, muscle, fat, imageUrl, aiReport, onRefresh, resetForm, setUploading]);

  const openRecordDetails = useCallback((record: InbodyRecord) => {
    setSelectedRecord(record);
    setModalVisible(true);
  }, []);

  const chartData = useMemo(() => {
    const recent = inbodyRecords.slice(-5);
    if (recent.length === 0) return null;
    return {
        labels: recent.map(r => new Date(r.record_date).getDate().toString()),
        datasets: [{ data: recent.map(r => r.weight) }]
    };
  }, [inbodyRecords]);

  const lastRec = useMemo(() => {
    return inbodyRecords.length > 0 ? inbodyRecords[inbodyRecords.length - 1] : null;
  }, [inbodyRecords]);

  return {
    state: {
      showForm, weight, muscle, fat, analyzing, imageUrl, aiReport,
      selectedRecord, modalVisible, chartData, lastRec
    },
    actions: {
      setWeight, setMuscle, setFat, setShowForm, setModalVisible,
      handleAnalyzeImage, handleSubmit, resetForm, openRecordDetails
    }
  };
}
