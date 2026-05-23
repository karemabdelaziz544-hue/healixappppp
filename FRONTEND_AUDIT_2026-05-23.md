# Frontend Audit - May 23, 2026

## Executive Summary
This frontend is not production-ready yet. It has strong effort in structure and visual polish (custom tab bar, themed colors, improved list virtualization, startup error screen), but still contains release-blocking UX/architecture risks: duplicated inline styling, mixed design-system adoption, route-level complexity in root layout, fragile onboarding/auth flow coupling, and inconsistent state handling patterns across major screens. The app feels like a fast-moving product that has had multiple audit/fix passes, but not yet consolidated into a stable, scalable frontend foundation.

## Critical Frontend Issues

### 1) Root layout is overloaded (routing + auth gate + error view + splash orchestration + notification bootstrapping)
* **Issue**: `app/_layout.tsx` combines too many concerns in one place.
* **Root Cause**: Progressive fixes were added into a single file rather than splitting into boot modules.
* **Impact**: High coupling, harder debugging, and elevated regression risk on cold-start/navigation.
* **Affected Files**: `app/_layout.tsx`
* **Severity**: Critical
* **Recommended Fix**: Split into AppBootstrap, AuthRouter, StartupFailureBoundary, and GlobalOverlays components; keep root file declarative only.

### 2) Design system is declared but inconsistently enforced
* **Issue**: Theme exists, but many screens still hardcode colors/radius/shadows extensively.
* **Root Cause**: No lint rule/token enforcement; legacy styles remain.
* **Impact**: Visual drift, harder dark-mode/theming evolution, increased maintenance costs.
* **Affected Files**: `constants/AppTheme.ts`, `src/screens/LoginScreen.tsx`, `src/screens/SignupScreen.tsx`, `components/dashboard/MainDashboardView.tsx`
* **Severity**: High
* **Recommended Fix**: Add tokenized semantic layers (surfaceStrong, interactivePrimary, typography scale) + ESLint custom rule to ban hardcoded color literals in app UI files.

### 3) Large “God component” dashboard controller/view logic
* **Issue**: `MainDashboardView` handles data fetch, transforms, cache, haptics, optimistic update, rendering, and styles.
* **Root Cause**: Feature iteration accumulated in one file.
* **Impact**: Testing complexity, bug surface expansion, slow future feature delivery.
* **Affected Files**: `components/dashboard/MainDashboardView.tsx`
* **Severity**: High
* **Recommended Fix**: Extract `useDashboardData`, `useTaskCompletion`, and presentational sections (DashboardHeader, ProgressHero, TaskList).

## Critical UI Issues
* Typography hierarchy is inconsistent between auth and core app surfaces (e.g., heavy 900 usage everywhere dilutes hierarchy).
* Component rhythm is inconsistent (cards/radii/padding vary by screen without tokenized spacing tiers).
* Tab bar visual prominence may overpower content (floating center button + heavy shadow + absolute bar) causing attention imbalance on content-heavy screens.

## Critical UX Issues
* Onboarding completion persistence is shallow (`has_seen_onboarding` set locally, but no robust auth-aware onboarding state machine). Users switching devices/sessions may re-enter awkwardly depending on route logic.
  * **Affected**: `app/onboarding.tsx`, `app/_layout.tsx`
  * **Severity**: High
* Chat offline/compose UX has partial handling but lacks explicit queued-send/retry model, which can frustrate users in unstable mobile connectivity.
  * **Affected**: `components/ChatView.tsx`
  * **Severity**: High
* Authentication screens prioritize visuals over resilient interaction states (limited field-level error state differentiation, no inline async validation hints).
  * **Affected**: `src/screens/LoginScreen.tsx`, `src/screens/SignupScreen.tsx`
  * **Severity**: Medium-High

## Missing Features (strictly needed)
* **Feature**: Unified skeleton/loading framework by screen state
  * **Why needed**: Current loading patterns are inconsistent and duplicated.
  * **User impact**: Better perceived performance and trust.
  * **Priority**: High
  * **Complexity**: Medium
  * **Suggested implementation**: LoadingState primitives with variants (list, card, form) and shared timing rules.
* **Feature**: Offline action queue for chat/task toggles
  * **Why needed**: Mobile networks are unstable; current UX mostly disables actions.
  * **User impact**: Major reliability boost.
  * **Priority**: High
  * **Complexity**: High
  * **Suggested implementation**: Local persisted mutation queue with retry/backoff and UI “pending” badges.
* **Feature**: Accessibility pass (touch targets, dynamic type, reduced motion)
  * **Why needed**: Current code has basic a11y labels but no holistic a11y strategy.
  * **User impact**: Inclusion + compliance.
  * **Priority**: High
  * **Complexity**: Medium
  * **Suggested implementation**: Accessibility checklist in CI + tokenized text styles + minimum hitSlop wrappers.

## High Impact UI Improvements
* Introduce semantic typography tokens and cap `fontWeight: '900'` to titles only.
* Normalize elevation/radius by tier (surface-sm, surface-md, surface-lg).
* Reduce floating tab bar visual weight and increase content breathing room on dense screens.

## High Impact UX Improvements
* Build a deterministic onboarding/auth state machine (server-backed).
* Add explicit success/error/pending microcopy states for all async actions.
* Implement network resilience model (queued interactions + reconnect sync).

## Frontend Quality Score (/10)
* **Architecture**: 6.5
* **UI Quality**: 7.0
* **UX Quality**: 6.2
* **Performance**: 7.1
* **Maintainability**: 6.0
* **Scalability**: 6.4
* **Production Readiness**: 5.9

## Final Decision
**REJECTED (for now)**
* *Release blockers*: architecture coupling at app bootstrap, inconsistent design-system enforcement, and missing resilience/accessibility guarantees for real-world mobile conditions.

## Prioritized Roadmap

### Critical (pre-release)
1. Decompose root layout/bootstrap. (Completed)
2. Add design-token enforcement + remove hardcoded UI primitives. (Completed for Auth inputs/buttons, LoginScreen, and SignupScreen)
3. Implement offline mutation queue (chat + task actions). (Completed)

### High Priority
1. Refactor dashboard into hook + presentational modules.
2. Accessibility hardening pass and QA criteria.

### Medium Priority
1. Unify loading/empty/error states across all tab roots.
2. Standardize motion/animation timing and reduced-motion support.

### Nice-to-have
1. Enhanced onboarding personalization and progress tracking.
2. Micro-interactions polish across cards, list transitions, and success states.
