import { logger } from './logger';
import { showToast } from '../../components/AppToast';
import * as Sentry from '@sentry/react-native';

export interface ErrorOptions {
  silent?: boolean;
  userMessage?: string;
}

/**
 * Global Error Handler
 * Unified way to handle and report errors across the app.
 */
export function handleError(error: unknown, context: string = 'App', options?: ErrorOptions) {
  const message = options?.userMessage || (error instanceof Error ? error.message : typeof error === 'string' ? error : 'حدث خطأ غير متوقع');
  
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
  
  if (!options?.silent) {
    showToast.error(message);
  }
}
