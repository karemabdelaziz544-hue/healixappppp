import { supabase } from '../../../lib/supabase';
import { executeQuery } from '../../../lib/apiClient';

export const lifestyleProfileService = {
  upsertProfile: async (profileData: any) => {
    const { error } = await executeQuery(
      supabase.from('lifestyle_profile').upsert(profileData),
      { retries: 2, isIdempotent: true }
    );
    if (error) throw error;
  }
};
