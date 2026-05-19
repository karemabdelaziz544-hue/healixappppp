import { useState, useEffect } from 'react';

// Bounded LRU Cache Implementation to prevent memory growth
class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, V>;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  clear() {
    this.cache.clear();
  }
}

const CACHE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes
const globalCache = new LRUCache<string, { data: any; timestamp: number }>(50);

// 🔴 C2-FIX: Exported so AuthContext can flush on SIGNED_OUT, preventing
// cross-session data leaks (User A's cached data served to User B).
export function clearQueryCache() {
  globalCache.clear();
}

export function useSupabaseQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options = { cacheTime: CACHE_EXPIRATION_MS }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = async (ignoreCache = false) => {
    try {
      setLoading(true);
      setError(null);

      const cachedItem = globalCache.get(key);

      if (!ignoreCache && cachedItem) {
        const isExpired = Date.now() - cachedItem.timestamp > options.cacheTime;
        if (!isExpired) {
          setData(cachedItem.data);
          setLoading(false);
          return;
        }
      }

      const result = await queryFn();
      globalCache.set(key, { data: result, timestamp: Date.now() });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, [key]);

  return { data, loading, error, refetch: () => fetch(true) };
}
