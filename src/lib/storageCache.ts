import { supabase } from './supabase';

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const signedUrlCache = new Map<string, CacheEntry>();

export async function getCachedSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string | null> {
  if (!path) return null;
  const cacheKey = `${bucket}:${path}`;
  const now = Date.now();
  
  const cached = signedUrlCache.get(cacheKey);
  // Add a 5-minute buffer before actual expiry to refresh early
  if (cached && cached.expiresAt > now + 300000) {
    return cached.url;
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error || !data?.signedUrl) {
      console.error(`Error generating signed URL for ${cacheKey}:`, error);
      return null;
    }

    signedUrlCache.set(cacheKey, {
      url: data.signedUrl,
      expiresAt: now + (expiresIn * 1000)
    });

    return data.signedUrl;
  } catch (err) {
    console.error(`Failed to create signed URL for ${cacheKey}:`, err);
    return null;
  }
}

export function invalidateCachedUrl(bucket: string, path: string) {
  signedUrlCache.delete(`${bucket}:${path}`);
}

export function clearSignedUrlCache() {
  signedUrlCache.clear();
}
