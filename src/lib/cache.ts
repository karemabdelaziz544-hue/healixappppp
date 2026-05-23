import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

const CACHE_PREFIX = 'healix_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export const AppCache = {
  /**
   * Retrieves a typed value from cache. Returns null if missing or expired.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (jsonValue === null) return null;
      
      const entry = JSON.parse(jsonValue) as CacheEntry<T>;
      const now = Date.now();
      
      if (now > entry.expiry) {
        // Cache expired, remove it asynchronously
        await AsyncStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      
      return entry.data;
    } catch (e) {
      logger.error(`[AppCache] Error getting key ${key}:`, e);
      return null;
    }
  },

  /**
   * Saves a value to cache with a specified time-to-live in milliseconds.
   */
  async set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        expiry: Date.now() + ttlMs,
      };
      await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch (e) {
      logger.error(`[AppCache] Error setting key ${key}:`, e);
    }
  },

  /**
   * Invalidates (removes) a specific cache key.
   */
  async invalidate(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
    } catch (e) {
      logger.error(`[AppCache] Error invalidating key ${key}:`, e);
    }
  },

  /**
   * Clears all cache items containing a specific user ID to prevent cross-session leaks.
   */
  async clearUserCache(userId: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const userKeys = keys.filter(k => k.startsWith(CACHE_PREFIX) && k.includes(`_${userId}`));
      if (userKeys.length > 0) {
        await AsyncStorage.multiRemove(userKeys);
      }
    } catch (e) {
      logger.error(`[AppCache] Error clearing cache for user ${userId}:`, e);
    }
  },
};
