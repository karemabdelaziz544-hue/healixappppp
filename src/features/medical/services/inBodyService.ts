import { decode } from 'base64-arraybuffer';
import { supabase } from '../../../lib/supabase';
import { executeQuery } from '../../../lib/apiClient';
import type { InbodyRecord } from '../../../../src/types';

/** Shape returned by expo-image-picker for base64 uploads */
interface ImagePickerFile {
  uri: string;
  base64?: string | null;
  mimeType?: string;
}

export const inBodyService = {
  uploadImage: async (userId: string, file: ImagePickerFile): Promise<string> => {
    const uriParts = file.uri.split('.');
    const fileExt = uriParts[uriParts.length - 1];
    const fileName = `inbody/${userId}/${Date.now()}.${fileExt}`;

    if (!file.base64) {
      throw new Error('الصورة لا تحتوي على بيانات base64. يرجى إعادة اختيار الصورة.');
    }

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

  insertRecord: async (recordData: Omit<InbodyRecord, 'id' | 'created_at'>) => {
    const { error } = await executeQuery(
      supabase.from('inbody_records').insert(recordData),
      { retries: 1, isIdempotent: true }
    );
    if (error) throw error;
  }
};
