import { logger } from './logger';
import { showToast } from '../../components/AppToast';
import * as Sentry from '@sentry/react-native';

export interface ErrorOptions {
  silent?: boolean;
  userMessage?: string;
}

const ARABIC_AUTH_ERRORS: Record<string, string> = {
  'invalid_credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  'invalid login credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  'user not found': 'لا يوجد حساب بهذا البريد الإلكتروني',
  'email not confirmed': 'يرجى تأكيد البريد الإلكتروني من خلال الرسالة المرسلة لبريدك',
  'user_already_exists': 'البريد الإلكتروني مُسجّل بالفعل، حاول تسجيل الدخول',
  'user already registered': 'البريد الإلكتروني مُسجّل بالفعل، حاول تسجيل الدخول',
  'password should be at least 6 characters': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
  'invalid api key': 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً',
  'invalid_api_key': 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً',
  'jwt expired': 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً',
};

/**
 * Global Error Handler
 * Unified way to handle and report errors across the app.
 */
export function handleError(error: unknown, context: string = 'App', options?: ErrorOptions) {
  let message = options?.userMessage;

  const rawMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
  console.log(`[Healix Raw Error] [${context}]:`, rawMessage);

  const lowerRawMessage = rawMessage.toLowerCase();

  // If a stale or deleted session token returned invalid api key/jwt expired, sign out cleanly
  if (lowerRawMessage.includes('invalid api key') || lowerRawMessage.includes('jwt expired')) {
    import('./supabase').then(({ supabase }) => {
      supabase.auth.signOut().catch(() => {});
    });
  }

  if (!message) {
    for (const [key, arabicMsg] of Object.entries(ARABIC_AUTH_ERRORS)) {
      if (lowerRawMessage.includes(key.toLowerCase())) {
        message = arabicMsg;
        break;
      }
    }

    if (!message) {
      message = rawMessage || 'حدث خطأ غير متوقع';
    }
  }

  const isAuthUserError = Object.keys(ARABIC_AUTH_ERRORS).some(key => 
    rawMessage.toLowerCase().includes(key.toLowerCase())
  );

  if (isAuthUserError) {
    logger.warn(`[Healix Auth Warning] [${context}]: ${message}`);
  } else {
    logger.error(`[Healix Error] [${context}]`, error);

    try {
      if (error instanceof Error) {
        Sentry.captureException(error, { tags: { context } });
      } else {
        Sentry.captureMessage(String(error), { tags: { context } });
      }
    } catch (e) {
      // Sentry might not be fully initialized yet
    }
  }

  if (!options?.silent) {
    showToast.error(message);
  }
}
