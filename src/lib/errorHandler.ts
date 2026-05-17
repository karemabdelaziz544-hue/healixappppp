import { Alert } from 'react-native';
import { logger } from './logger';

/**
 * Global Error Handler
 * Unified way to handle and report errors across the app.
 */
export function handleError(error: unknown, context: string = 'App') {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'حدث خطأ غير متوقع';
  
  logger.error(`[Healix Error] [${context}]`, error);
  
  // Future: Sentry.captureException(error)
  
  Alert.alert('عذراً', message);
}
