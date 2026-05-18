import { supabase } from '../../../lib/supabase';
import { executeQuery } from '../../../lib/apiClient';

export const healthProfileService = {
  upsertProfile: async (profileData: any) => {
    const { error } = await executeQuery(
      supabase.from('health_profile').upsert(profileData),
      { retries: 2, isIdempotent: true }
    );
    if (error) throw error;
  }
};
