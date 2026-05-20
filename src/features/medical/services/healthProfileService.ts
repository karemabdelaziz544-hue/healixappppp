import { supabase } from '../../../lib/supabase';
import { executeQuery } from '../../../lib/apiClient';
import type { HealthProfile } from '../../../../src/types';

export const healthProfileService = {
  upsertProfile: async (profileData: HealthProfile) => {
    const { error } = await executeQuery(
      supabase.from('health_profile').upsert(profileData),
      { retries: 2, isIdempotent: true }
    );
    if (error) throw error;
  }
};
