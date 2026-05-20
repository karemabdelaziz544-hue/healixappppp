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
  log: (...args: unknown[]) => {
    if (__DEV__) console.log(...args);
  },
  error: (...args: unknown[]) => {
    if (__DEV__) {
      console.error(...args);
    } else {
      // 🔴 AUDIT FIX: Capture the full Error object (with stack trace) when available.
      // captureMessage only sends the message string — captureException sends the full stack.
      const errorObj = args.find((a): a is Error => a instanceof Error);
      if (errorObj) {
        Sentry.captureException(errorObj, {
          extra: { contexts: args.filter(a => a !== errorObj) },
        });
      } else {
        const message = args.map(a => String(a)).join(' ');
        Sentry.captureMessage(message, 'error');
      }
    }
  },
  warn: (...args: unknown[]) => {
    if (__DEV__) console.warn(...args);
  },
};

