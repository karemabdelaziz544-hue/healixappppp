/**
 * ALLOWED_NOTIFICATION_ROUTES — Allowlist for push notification deep-link navigation.
 *
 * 🔴 SECURITY FIX: The notification payload `data.screen` was previously cast to `any`
 * and pushed directly into the router (`router.push(data.screen as any)`).
 * This allows a malicious notification payload to navigate users to arbitrary internal
 * routes (e.g., `/admin`, `/debug`, `/subscriptions`) without any validation.
 *
 * All routes the server is legitimately allowed to deep-link into MUST be listed here.
 * Any other value is silently dropped — it will not crash the app and will not navigate.
 */
export const ALLOWED_NOTIFICATION_ROUTES = new Set([
  '/(tabs)',
  '/(tabs)/chat',
  '/(tabs)/medical',
  '/(tabs)/history',
  '/(tabs)/profile',
  '/subscriptions',
  '/verify',
] as const);

export type AllowedRoute = typeof ALLOWED_NOTIFICATION_ROUTES extends Set<infer R> ? R : never;

/**
 * Validates a notification deep-link screen value against the allowlist.
 * Returns the typed route if valid, null if the value is not in the allowlist.
 */
export function validateNotificationRoute(screen: unknown): string | null {
  if (typeof screen !== 'string') return null;
  if (ALLOWED_NOTIFICATION_ROUTES.has(screen as AllowedRoute)) return screen;
  return null;
}
