import { useState } from 'react';
import { showToast } from '../../../../components/AppToast';
import { logger } from '../../../lib/logger';
import { lifestyleProfileService } from '../services/lifestyleProfileService';
import type { LifestyleProfile } from '../../../../src/types';

/** Form state uses strings for numeric fields (parsed to number on submit) */
interface LifestyleFormState extends Omit<LifestyleProfile, 'id' | 'user_id' | 'water_liters' | 'sleep_hours' | 'exercise_details'> {
  water_liters: string;
  sleep_hours: string;
  exercise_details: { type: string; days: string };
}

export function useLifestyleProfile(
  userId: string, 
  initialProfile: LifestyleProfile | null, 
  onRefresh: () => Promise<void>, 
  setUploading: (val: boolean) => void
) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<LifestyleFormState>(
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
      // Convert string form fields back to numbers for the DB schema
      const profileData: LifestyleProfile = {
        ...form,
        user_id: userId,
        water_liters: parseFloat(form.water_liters) || 0,
        sleep_hours: parseFloat(form.sleep_hours) || 0,
        exercise_details: {
          type: form.exercise_details.type,
          days: form.exercise_details.days,
        },
      };
      await lifestyleProfileService.upsertProfile(profileData);
      await onRefresh();
      setIsEditing(false);
      showToast.success('تم حفظ نمط الحياة بنجاح');
    } catch (err: unknown) {
      logger.error('[saveLifestyleProfile]', err);
      showToast.error('خطأ في الحفظ', err instanceof Error ? err.message : undefined);
    } finally {
      setUploading(false);
    }
  };

  return {
    state: { isEditing, form },
    actions: { setIsEditing, setForm, saveProfile }
  };
}
