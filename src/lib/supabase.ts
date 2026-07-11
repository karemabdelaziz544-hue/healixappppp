import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { validateEnv } from './validateEnv';

// Custom Storage Adapter for Supabase Auth
// 🔴 C1-FIX: setItem and removeItem MUST return their Promises.
// Discarding them (fire-and-forget) means Supabase cannot await the write,
// causing silent token persistence failures across app launches.
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      // ignore
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      // ignore
    }
  },
};

// 🔴 AUDIT FIX: Fail-fast env validation.
// In production: throws immediately if vars are missing (prevents silent broken state).
// In DEV: warns but continues to allow debugging without a real .env.
const { supabaseUrl, supabaseAnonKey } = validateEnv();

/**
 * XHR-based fetch fallback.
 * Expo Go on iOS intercepts the global `fetch` and wraps responses as blob: URLs,
 * which Supabase's auth-js cannot parse — causing AuthRetryableFetchError.
 * Using XMLHttpRequest bypasses the Expo debugger network layer entirely.
 */
const xhrFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  return new Promise((resolve, reject) => {
    let url = '';
    let method = 'GET';
    let rawHeaders: HeadersInit | undefined;
    let body: any = null;
    const signal = init?.signal;

    if (typeof input === 'string') {
      url = input;
      method = init?.method || 'GET';
      rawHeaders = init?.headers;
      body = init?.body;
    } else if (input instanceof URL) {
      url = input.toString();
      method = init?.method || 'GET';
      rawHeaders = init?.headers;
      body = init?.body;
    } else {
      url = input.url;
      method = init?.method || input.method || 'GET';
      rawHeaders = init?.headers || input.headers;
      body = init?.body || (input as any)._bodyInit || (input as any).body;
    }

    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.responseType = 'text';

    // HeadersInit can be: Headers instance | string[][] | Record<string,string>
    if (rawHeaders) {
      if (rawHeaders instanceof Headers) {
        rawHeaders.forEach((value, key) => xhr.setRequestHeader(key, value));
      } else if (Array.isArray(rawHeaders)) {
        (rawHeaders as string[][]).forEach(([key, value]) => xhr.setRequestHeader(key, value));
      } else {
        Object.entries(rawHeaders as Record<string, string>).forEach(([key, value]) => xhr.setRequestHeader(key, value));
      }
    }

    // Honour AbortSignal — allows cancellation
    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return reject(new DOMException('Aborted', 'AbortError'));
      }
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }

    xhr.onload = () => {
      const responseHeaders = new Headers();
      const raw = xhr.getAllResponseHeaders();
      if (raw) {
        raw.trim().split(/[\r\n]+/).forEach(line => {
          const parts = line.split(': ');
          const key = parts.shift()!;
          responseHeaders.append(key, parts.join(': '));
        });
      }
      resolve(new Response(xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: responseHeaders,
      }));
    };

    xhr.onerror = () => reject(new TypeError('Network request failed'));
    xhr.ontimeout = () => reject(new TypeError('Network request timed out'));

    xhr.send(body ?? null);
  });
};

/**
 * Safe fetch:
 * - On iOS Expo Go in development, we use XHR for all requests to bypass the debugger interception
 *   which wraps responses as blob: URLs that cannot be resolved in the React Native environment.
 * - Otherwise, use originalFetch if available, or fallback to default fetch.
 */
const safeFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  // Prefer the un-patched native fetch saved by the debugger, if available
  const nativeFetch =
    (global as any).originalFetch ||
    (global as any).__fetch_original ||
    null;

  if (nativeFetch) {
    return nativeFetch(input, init);
  }

  // Bypasses the Expo Go debugger network wrapping for all requests in iOS development
  if (Platform.OS === 'ios' && __DEV__) {
    return xhrFetch(input, init);
  }

  return fetch(input, init);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? localStorage : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: safeFetch,
  },
});