import { useState } from 'react';
import { showToast } from '../../../../components/AppToast';
import { logger } from '../../../lib/logger';
import { lifestyleProfileService } from '../services/lifestyleProfileService';
import type { LifestyleProfile } from '../../../../src/types';

export function useLifestyleProfile(
  userId: string, 
  initialProfile: LifestyleProfile | null, 
  onRefresh: () => Promise<void>, 
  setUploading: (val: boolean) => void
) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>(
    initialProfile
      ? {
          ...initialProfile,
          water_liters: initialProfile.water_liters?.toString() || '2',
          sleep_hours: initialProfile.sleep_hours?.toString() || '7',
          exercise_details: {
            type: initialProfile.exercise_details?.type || '',
            days: initialProfile.exercise_details?.days?.toString() || '0',
          },
        }
      : {
          goal: 'خسارة وزن',
          meals_per_day: '3',
          has_breakfast: true,
          has_snacks: false,
          late_night_eating: false,
          favorite_foods: '',
          disliked_foods: '',
          water_liters: '2',
          beverages: [],
          activity_level: 'متوسط',
          does_exercise: false,
          exercise_details: { type: '', days: '0' },
          sleep_hours: '7',
          sleep_quality: 'جيد',
          smoker: false,
          stress_level: 'متوسط',
          work_nature: 'مكتبي (جالس)',
          emotional_eating: false,
          diet_history: '',
          supplements: '',
          caffeine_intake: '',
          appetite_level: 'عادية',
          weight_plateau: false,
        }
  );

  const saveProfile = async () => {
    setUploading(true);
    try {
      await lifestyleProfileService.upsertProfile({ ...form, user_id: userId });
      await onRefresh();
      setIsEditing(false);
      showToast.success('تم حفظ نمط الحياة بنجاح');
    } catch (err: any) {
      logger.error('[saveLifestyleProfile]', err);
      showToast.error('خطأ في الحفظ', err?.message);
    } finally {
      setUploading(false);
    }
  };

  return {
    state: { isEditing, form },
    actions: { setIsEditing, setForm, saveProfile }
  };
}
