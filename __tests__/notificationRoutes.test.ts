import { validateNotificationRoute, ALLOWED_NOTIFICATION_ROUTES } from '../src/lib/notificationRoutes';

describe('notificationRoutes — validateNotificationRoute', () => {
  it('accepts all routes in the allowlist', () => {
    for (const route of ALLOWED_NOTIFICATION_ROUTES) {
      expect(validateNotificationRoute(route)).toBe(route);
    }
  });

  it('returns null for routes NOT in the allowlist', () => {
    expect(validateNotificationRoute('/admin')).toBeNull();
    expect(validateNotificationRoute('/debug')).toBeNull();
    expect(validateNotificationRoute('/subscriptions/cancel')).toBeNull();
    expect(validateNotificationRoute('/(hidden)')).toBeNull();
    expect(validateNotificationRoute('javascript:alert(1)')).toBeNull();
  });

  it('returns null for non-string values', () => {
    expect(validateNotificationRoute(null)).toBeNull();
    expect(validateNotificationRoute(undefined)).toBeNull();
    expect(validateNotificationRoute(42)).toBeNull();
    expect(validateNotificationRoute({ screen: '/(tabs)' })).toBeNull();
    expect(validateNotificationRoute(['/(tabs)'])).toBeNull();
  });

  it('rejects empty string', () => {
    expect(validateNotificationRoute('')).toBeNull();
  });

  it('is case-sensitive — rejects mismatched case', () => {
    // Routes are exact strings; case variations should not match
    expect(validateNotificationRoute('/(TABS)')).toBeNull();
    expect(validateNotificationRoute('/(tabs)/CHAT')).toBeNull();
  });
});
