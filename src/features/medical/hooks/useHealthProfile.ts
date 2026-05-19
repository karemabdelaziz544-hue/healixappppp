import { useState } from 'react';
import { showToast } from '../../../../components/AppToast';
import { logger } from '../../../lib/logger';
import { healthProfileService } from '../services/healthProfileService';
import type { HealthProfile } from '../../../../src/types';

export function useHealthProfile(
  userId: string, 
  initialProfile: HealthProfile | null, 
  onRefresh: () => Promise<void>, 
  setUploading: (val: boolean) => void
) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<HealthProfile>(
    initialProfile || {
      user_id: userId,
      diseases: [],
      has_allergies: false,
      allergies_details: '',
      diet_type: 'عادي',
      family_history: [],
      medications: '',
      surgeries: '',
      injuries: '',
      digestive_issues: [],
      hormonal_status: '',
    }
  );

  const toggleArrayItem = (arrayName: 'diseases' | 'family_history' | 'digestive_issues', item: string) => {
    setForm((prev: HealthProfile) => {
      const arr: string[] = (prev[arrayName] as string[]) || [];
      return {
        ...prev,
        [arrayName]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item],
      };
    });
  };

  const saveProfile = async () => {
    setUploading(true);
    try {
      await healthProfileService.upsertProfile({ ...form, user_id: userId });
      await onRefresh();
      setIsEditing(false);
      showToast.success('تم حفظ الملف الطبي بنجاح');
    } catch (err: any) {
      logger.error('[saveHealthProfile]', err);
      showToast.error('خطأ في الحفظ', err?.message);
    } finally {
      setUploading(false);
    }
  };

  return {
    state: { isEditing, form },
    actions: { setIsEditing, setForm, toggleArrayItem, saveProfile }
  };
}
