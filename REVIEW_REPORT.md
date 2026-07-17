# Healix Mobile App — Full Technical Review

Date: 2026-05-16  
Reviewer role: Senior Mobile Engineer, UI/UX Reviewer, Security Analyst, Product Reviewer

---

## Executive Summary

This project shows **strong product ambition** and decent feature coverage (auth, family profiles, subscriptions, notifications, medical data), but it is **not production-ready yet** due to quality gates failing, architecture coupling, and several security/reliability gaps.

Current state in one sentence: **good prototype / early MVP, not release-grade mobile product**.

---

## 1) Project Architecture

### What is good
- Uses Expo Router structure (`app/`) with domain-ish grouping for medical features under `src/features/medical`.
- Centralized auth/session via context (`src/context/AuthContext.tsx`).
- Realtime profile sync via Supabase channel in `FamilyContext` is a good direction.

### Critical architecture issues
1. **Routing layer contains business logic and orchestration**  
   - `app/(tabs)/index.tsx` acts as a controller choosing multiple business states (`active`, `lead`, `expired`, `onboarding`).  
   - This logic should be moved into a dedicated application/service layer (or state machine) to keep routes thin.

2. **Global state by Context only; no selector-based optimization**  
   - `AuthContext` and especially `FamilyContext` are likely to cause broad rerenders for unrelated consumers.
   - There are no selectors/memoized derived states; this becomes expensive as feature count grows.

3. **Mixed language/comments and inconsistent conventions**  
   - Arabic comments + English identifiers are fine culturally, but code conventions are inconsistent across files, making onboarding harder for distributed teams.

4. **No strict layering boundary**
   - UI components call Supabase directly from many places; data, domain logic, and presentation are intertwined.

### Scalability / maintainability rating
- Scalability: **5/10**
- Maintainability: **5/10**

---

## 2) Code Quality

### Confirmed issues from lint gate (objective)
`npm run lint` fails with **6 errors + 43 warnings**.

#### High-impact findings
- **Hook dependency bugs** (stale closures / nondeterministic behavior):
  - `app/(tabs)/chat.tsx:162`
  - `app/(tabs)/medical.tsx:48`
  - `app/(tabs)/plan-details.tsx:27`
  - `app/_layout.tsx:42`
  - `components/OfflineBanner.tsx:21`
  - `src/hooks/useSupabaseQuery.ts:43`

- **Forbidden `require()` in TS React code** (breaks tree-shaking, typing, and consistency):
  - `app/(tabs)/_layout.tsx:34`
  - `app/(tabs)/chat.tsx:354`
  - `app/(tabs)/history.tsx:91`
  - `app/(tabs)/medical.tsx:122`
  - `components/dashboard/MainDashboardView.tsx:174`

- **Unescaped entities causing lint errors / potential rendering bugs**:
  - `app/subscriptions.tsx:312,364`
  - `components/dashboard/AssistantOnboardingView.tsx:274`

- **Unused variables and imports** across many files; indicates weak hygiene and code review discipline.

### Additional quality observations
- `src/lib/errorHandler.ts` shows Alert for all errors; lacks typed error taxonomy, no telemetry integration despite comment.
- `FamilyContext` does too much (fetch, transform, merge inheritance rules, selection logic, realtime handling) in one file => difficult to test and reason about.

### Refactoring recommendations
- Introduce a data layer:
  - `src/data/` repositories for Supabase queries.
  - `src/domain/` use-cases (`resolveLifecycleState`, `inheritSubscriptionStatus`, etc.).
- Add typed Result wrappers for API calls.
- Replace ad-hoc async effects with React Query / TanStack Query.
- Enforce CI lint/typecheck blocker.

---

## 3) UI/UX Review

### Strengths
- Cohesive visual direction using warm neutral background and green/orange accent palette.
- Custom tab bar with strong affordance for primary action (`medical` center button) is product-focused.

### UX problems
1. **Accessibility gaps**
   - Limited evidence of accessibility labels/roles/hints for touch targets.
   - Icon-only tab controls in custom tab bar reduce screen-reader clarity.

2. **Potential navigation surprise**
   - In `app/(tabs)/_layout.tsx`, tapping profile as sub-account silently switches profile + delayed toast. This is not explicit and may confuse users.

3. **Inconsistent interaction feedback strategy**
   - Some actions use toast, some silent fail (`console.log`), some alert. Should be standardized.

4. **No visible design tokens enforcement**
   - Theme constants exist, but many inline styles remain; can drift quickly over time.

### UI modernization recommendations
- Add semantic typography scale and spacing tokens with lintable usage.
- Add accessibility pass: labels, min target sizes, color contrast audit, dynamic type checks.
- Standardize feedback: success/info/error components with UX rules.

---

## 4) Performance Review

### Risks found
1. **Context rerender pressure**
   - Large contexts (`FamilyContext`) update full objects; consumers rerender frequently.

2. **Potential effect churn / stale logic**
   - Multiple missing hook deps may lead to extra fetches or outdated closures.

3. **Naive in-memory cache only** (`src/hooks/useSupabaseQuery.ts`)
   - Cache is process memory only; not persisted, no GC strategy, no dedupe by inflight key.

4. **`require()` dynamic imports in render/action paths**
   - Can affect bundling and startup optimization.

### Performance recommendations
- Move to TanStack Query with staleTime/cacheTime/retry/invalidation.
- Split context or use Zustand/Jotai/Redux Toolkit with selectors.
- Preload critical route assets and fonts; lazy-load noncritical modules.
- Instrument with React Profiler + Expo performance plugins.

---

## 5) Security Review

### Findings
1. **Auth token/session stored in AsyncStorage** (`src/lib/supabase.ts`)  
   - Common in RN, but not best-practice for sensitive contexts. Prefer secure storage wrapper (e.g., Expo SecureStore) for token material.

2. **Potential sensitive logging**
   - Several `console.log` and `console.error` calls can expose internal state in production if not stripped.

3. **No clear hardening shown for secrets management**
   - Uses `EXPO_PUBLIC_*` vars for Supabase URL/anon key. URL + anon key are expected public, but no evidence of scoped backend policies review (RLS not shown here).

4. **No security telemetry / incident response path**
   - Error boundary logs to console only; no Sentry/Crashlytics integration.

### Security recommendations
- Migrate session persistence to secure storage adapter where possible.
- Add log redaction + production log disabling.
- Audit Supabase RLS policies and least privilege for every table.
- Add certificate pinning strategy if threat model requires it.

---

## 6) Backend/API Integration

### Current quality
- Supabase integration is straightforward and readable.
- Realtime profile updates are a plus.

### Gaps
- No unified API client abstractions/retry policies.
- No explicit offline-first strategy (queueing mutations, stale replay).
- Error handling mostly local and inconsistent.

### Recommendations
- Centralize API calls in repositories.
- Add retry with jitter/backoff for transient failures.
- Add offline mutation queue for critical actions.
- Add typed error mapping (auth, validation, network, unknown).

---

## 7) Dependencies & Packages

### Observations
- Modern stack versions (Expo 54, React 19, RN 0.81) are recent.
- But dependency governance process is missing (no lockfile policy discussion, no automated security scan evidence).

### Recommendations
- Add `npm audit`/SCA gate in CI.
- Identify and remove unused packages quarterly.
- Track Expo SDK upgrade cadence and breaking-change checklist.

---

## 8) DevOps & Production Readiness

### Major gaps
- README is default Expo boilerplate, not product-specific.
- No visible CI config in provided files.
- No environment matrix documentation (dev/stage/prod).
- No release checklist artifacts.

### Recommendations
- Add CI pipeline: lint, typecheck, tests, preview builds.
- Add `eas.json`, release channels, and staged rollout docs.
- Add observability stack (crash, logs, analytics, performance).

---

## 9) Testing

### Current state
- No visible unit/widget/integration test suite in repository listing.
- No coverage tracking.

### Required baseline
- Unit tests: domain logic (subscription inheritance, lifecycle resolver).
- Component tests: critical UI states and accessibility snapshots.
- Integration/E2E: auth, onboarding, subscription gate, medical upload flow.

### Testing strategy
- Jest + React Native Testing Library.
- Detox for end-to-end critical journeys.
- Coverage threshold in CI (start at 60%, grow to 80%+).

---

## 10) Store Readiness

### Is it production-ready now?
**No.**

### What is missing before release
- Pass lint/typecheck cleanly.
- Establish crash reporting and privacy-safe logging.
- Add test coverage for critical flows.
- Harden security/storage and review backend policies.
- Complete app metadata, privacy policy, support/contact, release process.

### Strongest points
- Clear product concept and user lifecycle-based dashboard flow.
- Supabase integration with realtime family profile updates.
- Visual identity foundation exists.

### Weakest points
- Code quality gate failures.
- Architecture coupling and state management scalability limits.
- Missing test/CI/release rigor.

---

## Final Professional Ratings

- **Architecture:** 5/10
- **Code Quality:** 4/10
- **UI/UX:** 6/10
- **Performance:** 5/10
- **Security:** 4.5/10
- **Backend Integration:** 5.5/10
- **DevOps Readiness:** 3.5/10
- **Testing Maturity:** 2.5/10

## Final Overall Score
**4.8 / 10**

## Estimated Developer Level
- Current implementation pattern suggests **mid-junior to mid-level** contributor(s):
  - Good feature velocity and UI effort
  - But weak engineering rigor in quality gates, testing, and architecture boundaries

## Can this scale to real users?
- **Limited scale in current form.**
- With the roadmap below executed, it can evolve into a solid production app.

---

## Prioritized Improvement Roadmap

### Critical Issues (0–2 weeks)
1. Fix all lint errors/warnings that indicate runtime risk (hook deps, require-imports, unescaped entities).
2. Add CI blocker for lint + `tsc --noEmit`.
3. Integrate crash reporting (Sentry/Crashlytics) and remove sensitive logs.
4. Standardize error handling and user-facing feedback.

### High Priority (2–6 weeks)
1. Introduce data/domain/presentation separation.
2. Adopt TanStack Query for caching/retries/invalidation.
3. Split heavy contexts or move to selector-based global store.
4. Add unit tests for core business rules + component tests for critical screens.

### Medium Priority (6–10 weeks)
1. Accessibility remediation pass (screen readers, contrast, dynamic text).
2. Offline-first support for key workflows.
3. Performance instrumentation and rerender optimization.
4. Rewrite README and developer onboarding docs.

### Nice-to-have Improvements
1. Design system package extraction for shared tokens/components.
2. Feature flags and remote config.
3. Advanced security hardening (pinning, threat model documentation).

---

## Evidence / Commands Used
- `npm run lint`
- Manual inspection of:
  - `app/_layout.tsx`
  - `app/(tabs)/_layout.tsx`
  - `app/(tabs)/index.tsx`
  - `src/context/AuthContext.tsx`
  - `src/context/FamilyContext.tsx`
  - `src/lib/supabase.ts`
  - `src/hooks/useSupabaseQuery.ts`
  - `components/ErrorBoundary.tsx`
  - `app.json`
  - `package.json`
