/**
 * Healix Logger — بديل آمن لـ console.log/error في الإنتاج
 * ==========================================================
 * يمنع تسريب بيانات الـ Payload ومعرفات المستخدمين في الـ Device Logs.
 * الدوال لا تطبع شيء في بيئة الإنتاج (__DEV__ = false).
 *
 * Usage:
 *   import { logger } from '@/src/lib/logger';
 *   logger.log('Debug info:', data);
 *   logger.error('Error:', err);
 */
export const logger = {
  log: (...args: any[]) => {
    if (__DEV__) console.log(...args);
  },
  error: (...args: any[]) => {
    if (__DEV__) console.error(...args);
  },
  warn: (...args: any[]) => {
    if (__DEV__) console.warn(...args);
  },
};
