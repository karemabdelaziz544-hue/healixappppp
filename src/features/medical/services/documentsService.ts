import { supabase } from '../../../lib/supabase';
import { executeQuery } from '../../../lib/apiClient';
import type { ClientDocument } from '../../../../src/types';

import { getCachedSignedUrl } from '../../../lib/storageCache';

export const documentsService = {
  uploadFile: async (filePath: string, arrayBuffer: ArrayBuffer, contentType: string) => {
    // 🌟 Safely upload using ArrayBuffer instead of FormData for cross-platform RN stability
    const { error } = await executeQuery(
      supabase.storage.from('medical-docs').upload(filePath, arrayBuffer, { contentType }),
      { retries: 1 }
    );
    if (error) throw error;
  },

  insertDocumentRecord: async (record: Omit<ClientDocument, 'id' | 'created_at'>) => {
    const { error } = await executeQuery(
      supabase.from('client_documents').insert(record),
      { retries: 1, isIdempotent: true }
    );
    if (error) throw error;
  },

  getSignedUrl: async (pathOrUrl: string) => {
    const signedUrl = await getCachedSignedUrl('medical-docs', pathOrUrl, 3600);
    if (!signedUrl) throw new Error('Failed to generate signed URL');
    return signedUrl;
  }
};
