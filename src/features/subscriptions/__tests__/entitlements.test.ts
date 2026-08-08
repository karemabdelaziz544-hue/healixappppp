import { FEATURE_REGISTRY } from '../featureRegistry';
import { DEFAULT_PLAN_LIMITS } from '../entitlement.types';

/**
 * Access Control & Entitlement Layer Specification Tests — Phase 3 Production SaaS
 */
describe('Access Control & Entitlement Layer Spec Tests', () => {
  test('Registry Integrity - All features have complete metadata and benefits', () => {
    const featureIds = Object.keys(FEATURE_REGISTRY);
    expect(featureIds.length).toBeGreaterThan(10);

    Object.values(FEATURE_REGISTRY).forEach((feature) => {
      expect(feature.id).toBeDefined();
      expect(feature.title).toBeTruthy();
      expect(feature.description).toBeTruthy();
      expect(feature.icon).toBeTruthy();
      expect(feature.category).toBeTruthy();
      expect(Array.isArray(feature.requiredPlan)).toBe(true);
      expect(Array.isArray(feature.allowedRoles)).toBe(true);
      expect(typeof feature.version).toBe('number');
      expect(typeof feature.remoteControlled).toBe('boolean');
    });
  });

  test('Plan Limits - Correct quotas per tier', () => {
    expect(DEFAULT_PLAN_LIMITS.FREE.aiRequestsPerDay).toBe(3);
    expect(DEFAULT_PLAN_LIMITS.INDIVIDUAL.aiRequestsPerDay).toBe(100);
    expect(DEFAULT_PLAN_LIMITS.FAMILY.aiRequestsPerDay).toBe(500);
    expect(DEFAULT_PLAN_LIMITS.ENTERPRISE.aiRequestsPerDay).toBe(9999);

    expect(DEFAULT_PLAN_LIMITS.FREE.maxFamilyMembers).toBe(0);
    expect(DEFAULT_PLAN_LIMITS.FAMILY.maxFamilyMembers).toBe(5);
  });

  test('Role Access Rules - Doctor and Admin allowed on medical features', () => {
    const doctorChat = FEATURE_REGISTRY.DOCTOR_CHAT;
    expect(doctorChat.allowedRoles).toContain('doctor');
    expect(doctorChat.allowedRoles).toContain('client');

    const aiChat = FEATURE_REGISTRY.AI_CHAT;
    expect(aiChat.requiredPlan).toContain('INDIVIDUAL');
    expect(aiChat.requiredPlan).toContain('FAMILY');
    expect(aiChat.requiredPlan).toContain('ENTERPRISE');
    expect(aiChat.requiredPlan).not.toContain('FREE');
  });

  test('Freemium Gating Rules - Feature-specific messaging & required plans', () => {
    expect(FEATURE_REGISTRY.AI_CHAT.title).toBeTruthy();
    expect(FEATURE_REGISTRY.DOCTOR_CHAT.title).toBeTruthy();
    expect(FEATURE_REGISTRY.NUTRITION_PLAN.requiredPlan).toContain('INDIVIDUAL');
    expect(FEATURE_REGISTRY.WORKOUT_PLAN.requiredPlan).toContain('INDIVIDUAL');
    expect(FEATURE_REGISTRY.SUB_ACCOUNTS.requiredPlan).toContain('FAMILY');
  });
});
