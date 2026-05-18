import { decode } from 'base64-arraybuffer';
import { supabase } from '../../../lib/supabase';
import { executeQuery } from '../../../lib/apiClient';

export const inBodyService = {
  uploadImage: async (userId: string, file: any): Promise<string> => {
    const uriParts = file.uri.split('.');
    const fileExt = uriParts[uriParts.length - 1];
    const fileName = `inbody/${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await executeQuery(
      supabase.storage
        .from('medical-docs')
        .upload(fileName, decode(file.base64), {
          contentType: file.mimeType || `image/${fileExt}`,
        }),
      { retries: 1 }
    );

    if (uploadError) throw uploadError;
    return fileName;
  },

  analyzeImage: async (fileName: string) => {
    const { data: fnData, error: fnError } = await executeQuery(
      supabase.functions.invoke('analyze-inbody', {
        body: { imagePath: fileName },
      }),
      { timeoutMs: 30000, retries: 0 } // Analysis can take long, but we shouldn't retry it blindly
    );

    if (fnError) throw fnError;
    return fnData;
  },

  insertRecord: async (recordData: any) => {
    const { error } = await executeQuery(
      supabase.from('inbody_records').insert(recordData),
      { retries: 1, isIdempotent: true }
    );
    if (error) throw error;
  }
};
