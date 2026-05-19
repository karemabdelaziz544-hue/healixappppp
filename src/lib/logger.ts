import * as Sentry from '@sentry/react-native';

/**
 * Healix Logger — بديل آمن لـ console.log/error في الإنتاج
 * ==========================================================
 * - في DEV: يطبع في Console.
 * - في Production: logger.error يُرسل تلقائياً لـ Sentry لضمان رؤية الأخطاء.
 *   كان سابقاً no-op في الإنتاج، مما يعني أن كل الأخطاء في catch blocks
 *   كانت غير مرئية تماماً بعد النشر.
 */
export const logger = {
  log: (...args: any[]) => {
    if (__DEV__) console.log(...args);
  },
  error: (...args: any[]) => {
    if (__DEV__) {
      console.error(...args);
    } else {
      // 🔴 H1-FIX: Always capture errors in Sentry for production observability
      const message = args.map(a => (a instanceof Error ? a.message : String(a))).join(' ');
      Sentry.captureMessage(message, 'error');
    }
  },
  warn: (...args: any[]) => {
    if (__DEV__) console.warn(...args);
  },
};

