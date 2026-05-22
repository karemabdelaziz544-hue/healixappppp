import { useState, useEffect, useMemo } from 'react';

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

  /** 🔴 AUDIT FIX: Scoped invalidation — flush all keys matching a prefix */
  deleteByPrefix(prefix: string) {
    for (const key of this.cache.keys()) {
      if (typeof key === 'string' && key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

const CACHE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes
const globalCache = new LRUCache<string, { data: unknown; timestamp: number }>(50);

/**
 * 🔴 AUDIT FIX: Typed query key builder.
 * Creates structured cache keys as tuples (e.g. ['medical','profile', userId])
 * that are joined with '||' to prevent collision
 * (e.g. 'medical-profile-abc' vs 'medical-profile-abcd').
 *
 * @example
 * const key = createQueryKey('medical', 'profile', userId);
 * // → "medical||profile||abc-123"
 */
export function createQueryKey(...segments: (string | undefined | null)[]): string {
  return segments.filter(Boolean).join('||');
}

// 🔴 C2-FIX: Exported so AuthContext can flush on SIGNED_OUT, preventing
// cross-session data leaks (User A's cached data served to User B).
export function clearQueryCache() {
  globalCache.clear();
}

/**
 * 🔴 AUDIT FIX: Scoped cache invalidation.
 * Flushes all cached queries whose key starts with the given feature prefix.
 *
 * @example
 * invalidateQueries('medical'); // flushes all medical-related queries
 * invalidateQueries('chat');    // flushes all chat-related queries
 */
export function invalidateQueries(featurePrefix: string) {
  globalCache.deleteByPrefix(featurePrefix);
}

/**
 * useSupabaseQuery — lightweight server state hook with LRU caching.
 *
 * @param key     Cache key (use createQueryKey() for structured keys)
 * @param queryFn Async function that fetches data
 * @param options Cache configuration
 *
 * ⚠️ STABILITY CONTRACT:
 * The effect depends ONLY on `key` — NOT on `queryFn` or `options`.
 * This is intentional to prevent unnecessary refetches.
 *
 * Callers MUST ensure `queryFn` is referentially stable:
 *   ✅ useCallback(() => executeQuery(...), [userId])
 *   ✅ Inline arrow that closes over stable values
 *   ❌ New function reference on every render without memoization
 *
 * If you need queryFn changes to trigger refetch, change the `key` instead.
 */
export function useSupabaseQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options = { cacheTime: CACHE_EXPIRATION_MS }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = async (ignoreCache = false) => {
    // 🔴 AUDIT FIX: Check cache BEFORE setting loading=true to prevent flicker.
    if (!ignoreCache) {
      const cachedItem = globalCache.get(key);
      if (cachedItem) {
        const isExpired = Date.now() - cachedItem.timestamp > options.cacheTime;
        if (!isExpired) {
          setData(cachedItem.data as T);
          setLoading(false);
          return;
        }
      }
    }

    try {
      setLoading(true);
      setError(null);

      const result = await queryFn();
      globalCache.set(key, { data: result, timestamp: Date.now() });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: queryFn must be stable (see contract above)
  useEffect(() => {
    fetch();
  }, [key]);

  return { data, loading, error, refetch: () => fetch(true) };
}

