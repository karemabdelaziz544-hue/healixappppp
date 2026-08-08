# Healix Architecture

> **Note for AI Assistants & Contributors**: This document is the technical architecture reference for Healix. It is paired with [PROJECT_CONTEXT.md](file:///Users/karemabdelaziz/Coding/healix-app/PROJECT_CONTEXT.md), which describes the product vision, user personas, and design tokens.

---

## High Level Architecture

```
+-------------------------------------------------------------------+
|               Mobile Application (React Native / Expo)           |
|  - Expo Router v6 (File-based Navigation)                         |
|  - Vitality RTL UI Engine & AppTheme Tokens                       |
|  - Optimistic State Orchestration (Auth, Family, Entitlement)     |
+-------------------------------------------------------------------+
                                  │
                                  ▼
+-------------------------------------------------------------------+
|               API & Data Layer (Supabase JS SDK)                  |
|  - PostgREST Data Engine & RPC Stored Procedures                 |
|  - Security Definer RLS Bypass Helpers                            |
+-------------------------------------------------------------------+
                                  │
                                  ▼
+-------------------------------------------------------------------+
|               Supabase Cloud / PostgreSQL Database               |
|  - 29 Public Domain Tables + 2 Admin Security Views               |
|  - Row-Level Security (RLS) & Audit Logging Triggers              |
+-------------------------------------------------------------------+
         │                                         │
         ▼                                         ▼
+-----------------------+              +-----------------------+
| Supabase Storage      |              | Push Notifications    |
| - receipts bucket     |              | - Expo Push Token     |
| - medical_docs bucket |              | - Device Token Reg.   |
| - avatars bucket      |              +-----------------------+
+-----------------------+
```

---

## Application Layers

1. **Presentation Layer (`app/`, `components/`)**:
   - Expo Router screens (`app/(tabs)/`, `app/*.tsx`).
   - Modular Dashboard Controllers (`DashboardController`, `MainDashboardView`, `AssistantOnboardingView`, `PaywallView`).
   - Modular Widgets (`components/dashboard/widgets/`).
2. **Business Logic & Orchestration (`src/features/`)**:
   - `features/subscriptions/`: Entitlement Engine, Feature Registry (`featureRegistry.ts`), License Manager (`licenseManager.ts`), Subscription Resolver (`resolveSubscriptionState.ts`).
   - `features/family/`: Family Orchestration (`useFamilyOrchestration.ts`), Sub-account Switcher.
   - `features/ai/`: Heli AI Prompt Construction & Context Aggregation.
3. **Context & State Services (`src/context/`, `hooks/`)**:
   - `AuthContext`: Manages Supabase Auth session.
   - `FamilyContext`: Holds active profile, family member roster, profile switching.
   - `EntitlementContext`: Evaluates feature access flags against plan tier.
   - `useSubscriptionGuard`: Evaluates full lifecycle state (`lead`, `onboarding`, `active`, `payment_pending`, `expired`).
4. **API & Data Access Layer (`src/lib/`)**:
   - `supabase.ts`: Supabase client singleton with AsyncStorage persistence.
   - `apiClient.ts`: Execution wrapper handling retry logic and idempotency.
5. **Storage Layer**:
   - Supabase Storage buckets for bank receipts (`receipts`), client documents (`medical_docs`), and profile avatars (`avatars`).
6. **Database Layer (`supabase/migrations/`)**:
   - PostgreSQL schema with strict RLS policies, trigger constraints, and SQL RPC stored procedures.

---

## Folder Architecture

```
healix-app/
├── app/                            # Expo Router Screen Pages
│   ├── (tabs)/                     # Main Bottom Tab Navigation
│   │   ├── _layout.tsx             # Custom Floating RTL Bottom Tab Bar
│   │   ├── index.tsx               # Dashboard Controller
│   │   ├── workouts.tsx            # Workout Tab Page
│   │   ├── medical.tsx             # Medical Vault & Health Profile Page
│   │   ├── chat.tsx                # Heli AI & Doctor Chat Page
│   │   └── profile.tsx             # Profile & Family Settings Page
│   ├── _layout.tsx                 # Root Providers & Layout Shell
│   ├── index.tsx                   # Auth Guard Redirect
│   ├── onboarding.tsx                  # App Intro Carousel & Goal Picker
│   ├── subscriptions.tsx               # Subscription Tier Cards & Plan Selector
│   ├── subscription-payment.tsx        # Receipt Upload & Payment Confirmation
│   ├── subscription-management.tsx     # Active Plan & Seat Upgrade Settings
│   ├── family.tsx                      # Family Sub-Account Management
│   ├── plan-details.tsx                # Prescribed Nutrition & Exercise Viewer
│   ├── exercise-details.tsx            # Single Exercise Player & Guide
│   ├── financial-history.tsx           # Invoices & Transaction History
│   ├── notifications.tsx               # Notification Center
│   ├── new-inquiry.tsx                 # Doctor Consultation Form
│   ├── verify.tsx                      # OTP Verification
│   ├── login.tsx / signup.tsx          # Auth Pages
│   └── support.tsx                     # Customer Support Page
├── components/                     # Component Library
│   ├── dashboard/                  # Dashboard Controllers & Views
│   │   ├── MainDashboardView.tsx   # Active Customer Dashboard
│   │   ├── AssistantOnboardingView.tsx # Onboarding Checklist View
│   │   ├── PaywallView.tsx         # Unsubscribed Customer Paywall
│   │   ├── SubscriptionPendingView.tsx # Payment Pending Review State
│   │   └── widgets/                # Individual Dashboard Widgets
│   ├── icons/                      # Custom SVG Icons (Dumbbell, Heli, etc.)
│   ├── ui/                         # Foundation Primitives
│   └── bootstrap/                  # Route Guard Bootstrap Logic
├── constants/                      # AppTheme.ts Tokens (Colors, Radius, Fonts)
├── hooks/                          # Shared Hooks (useSubscriptionGuard, etc.)
├── src/                            # Domain Core Engine
│   ├── context/                    # Auth, Family & Entitlement Contexts
│   ├── features/                   # Feature Domain Modules
│   │   ├── subscriptions/          # Entitlement Engine & Feature Registry
│   │   ├── family/                 # Family Orchestration Engine
│   │   ├── ai/                     # Heli AI Client Logic
│   │   ├── medical/                # Document & InBody Handlers
│   │   ├── activity/               # Step Tracking Mechanics
│   │   └── chat/                   # Messaging & Inquiry Services
│   ├── lib/                        # Supabase Client & Utilities
│   └── types/                      # TypeScript Schemas & Interfaces
└── supabase/                       # DB Migrations & Schema Versions
```

---

## Dashboard Architecture

The main user dashboard (`MainDashboardView.tsx`) uses a modular widget-based composition model:

```
+-------------------------------------------------------------------+
| 1. DashboardHeaderWidget                                          |
|    - Active Profile Name, Avatar, Notification Bell, Date Badge   |
+-------------------------------------------------------------------+
| 2. ProgressHeroWidget                                             |
|    - Circular Progress Wheel, Daily Score, Calorie/Macro Summary  |
+-------------------------------------------------------------------+
| 3. CurrentMealWidget                                              |
|    - Active Meal (Breakfast/Lunch/Dinner/Snack), Calorie Target   |
+-------------------------------------------------------------------+
| 4. HealixAICardWidget                                             |
|    - Heli AI Daily Motivational Insight & Quick Chat Button       |
+-------------------------------------------------------------------+
| 5. QuickActionsWidget                                             |
|    - Shortcuts: Log Weight, Log Water, InBody Scan, Doctor Query  |
+-------------------------------------------------------------------+
| 6. IndicatorsWidget & HealthScoreBreakdownWidget                  |
|    - BMI Indicator, InBody Progress, Hydration Status             |
+-------------------------------------------------------------------+
| 7. WaterWidget                                                    |
|    - Animated Fluid Intake Cylinder Tracker (+250ml / +500ml)     |
+-------------------------------------------------------------------+
| 8. WorkoutWidget                                                  |
|    - Today's Prescribed Routine Card, Dumbbell Icon, Start Btn    |
+-------------------------------------------------------------------+
| 9. MovementWidget                                                 |
|    - Step Count Progress Ring & Distance/Calorie Metrics         |
+-------------------------------------------------------------------+
| 10. TimelineWidget                                                |
|    - Chronological Feed of Today's Completed Activities           |
+-------------------------------------------------------------------+
```

---

## Subscription Architecture

```
                      +-----------------------------+
                      | User Profile + Payment Log  |
                      +-----------------------------+
                                     │
                                     ▼
                      +-----------------------------+
                      |  resolveSubscriptionState   |
                      +-----------------------------+
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
+------------------+       +-------------------+       +------------------+
| Lifecycle State  |       |   useEntitlements |       | License Manager  |
| - lead           |       | - checks tier     |       | - validates family|
| - onboarding     |       | - evaluates gate  |       |   seat quota     |
| - active         |       +-------------------+       +------------------+
| - pending_review |                 │
| - expired        |                 ▼
+------------------+       +-------------------+
                           | Feature Registry  |
                           | (FEATURE_REGISTRY)|
                           +-------------------+
```

- **Entitlements Engine (`useEntitlements.ts`, `EntitlementProvider.tsx`)**: Evaluates feature availability dynamically based on subscription tier (`FREE`, `INDIVIDUAL`, `FAMILY`, `ENTERPRISE`) and user role.
- **Premium Gates (`useSubscriptionGuard.ts`, `LockedTabView.tsx`)**: Wraps protected tabs and routes. If an unentitled user accesses a locked screen, the gate intercepts navigation and displays `PaywallView` or `LockedTabView`.
- **Feature Registry (`featureRegistry.ts`)**: Centralized catalog of all 18 feature flags (`AI_CHAT`, `AI_DASHBOARD`, `AI_INBODY_ANALYSIS`, `DOCTOR_CHAT`, `NUTRITION_PLAN`, `WORKOUT_PLAN`, `SUB_ACCOUNTS`, etc.).
- **License Manager (`licenseManager.ts`)**: Manages sub-account seat capacity (`requested_family_quota`).
- **Subscription Config (`resolveSubscriptionState.ts`)**: Pure state machine function resolving user status into discrete states (`active`, `expiring_soon`, `pending_review`, `expired`, etc.).

---

## AI Architecture (Heli)

- **System Context & Prompts**: Heli is initialized with structured prompt context containing the user's active profile (age, weight, height, health profile, prescribed plan, and daily logs).
- **Chat Flow**:
  1. User sends prompt via `(tabs)/chat.tsx` or `components/ChatView.tsx`.
  2. Query is logged in `ai_usage_logs` for audit and cost analytics.
  3. Heli generates Arabic-native response tailored to Healix health disclaimers.
- **Dashboard Insights**: `HealixAICardWidget` pulls daily AI summary notes and recommendations.
- **Future AI Analysis**: *Planned (Not Yet Implemented)* - Automated PDF Lab report OCR parsing and structured biomarker extraction.

---

## Family Architecture

- **Profiles (`public.profiles`)**: Primary manager profile has `manager_id = NULL`. Sub-account profiles have `manager_id = <manager_uuid>`.
- **Activation (`family_subscription_memberships`)**: Links sub-accounts to the manager's active subscription period with entitlement status (`included`, `excluded`, `expired`).
- **Licenses (`requested_family_quota`)**: Stores the total number of family member seats purchased by the account manager.
- **Permissions (`family_medical_consents`, `owns_profile`, `manages_profile`)**: RLS helper functions ensure managers can read/write sub-account health profiles while preserving individual data boundaries.

---

## Database Overview

The system operates on **29 public domain tables** and **2 admin security views**:

### Core Domain Tables

1. `profiles`: Primary account and sub-account profiles (role, full_name, email, subscription_status, manager_id, assigned_doctor_id, is_onboarded).
2. `plans`: Prescribed nutrition and workout plans assigned by doctors/coaches.
3. `plan_tasks`: Individual meal or exercise items inside a plan.
4. `daily_task_logs`: Logs of completed meal or exercise tasks per user/day.
5. `inbody_records`: Body composition measurements (weight, fat %, muscle mass, BMR).
6. `client_documents`: Uploaded lab PDFs, medical scans, and prescription images.
7. `health_profile`: Clinical background (chronic conditions, allergies, medications, blood type).
8. `lifestyle_profile`: Daily habits (sleep hours, activity level, dietary preference, smoking status).
9. `inquiries`: Asynchronous medical consultation tickets created by clients for doctors.
10. `messages`: Individual chat messages inside an inquiry or doctor consultation.
11. `conversations`: Unified communication channels between clients, doctors, and support.
12. `notifications`: In-app notification alerts.
13. `daily_logs`: Daily aggregated log summaries (calories, steps, sleep, mood).
14. `water_tracking`: Daily fluid intake logs in milliliters.
15. `payment_requests`: Receipt-based subscription payment requests submitted by users for admin approval.
16. `subscriptions`: Active subscription records per account manager.
17. `subscription_periods`: Historical billing cycles (start_date, end_date, plan_tier).
18. `family_subscription_memberships`: Mapping of sub-accounts to active family subscription seats.
19. `family_medical_consents`: Legal consents for managing sub-account medical records.
20. `medical_audit_log`: Audit trail for medical record access.
21. `device_push_tokens`: Push notification registration tokens per device.
22. `preset_exercises`: Master library of exercise definitions, equipment, muscle groups, and media URLs.
23. `activity_logs`: Granular movement and step count telemetry.
24. `user_activity_goals`: Custom daily targets for steps, active calories, and exercise minutes.
25. `ai_usage_logs`: Token consumption and request log for Heli AI.
26. `notification_queue`: Async queue for background push notification delivery.
27. `feature_flags`: Remote feature toggles managed via Web Admin Dashboard.
28. `enterprise_audit_logs`: Audit logs for administrative actions taken in the Web Dashboard.
29. `storage_gc_log`: Garbage collection logs for orphaned storage files.

### Admin Security Views & RPCs

1. `admin_clients_view`: Joined security view providing full client details and assigned doctor names for admins.
2. `admin_payment_requests_view`: Joined security view for admin payment verification with `WHERE public.is_admin()` defense-in-depth protection.
3. `complete_profile_onboarding(target_profile_id)`: Security Definer RPC function allowing account managers to mark onboarding as complete for sub-accounts and main accounts, bypassing RLS constraints.

---

## State Management

- **React Context API**:
  - `AuthContext`: Session lifecycle.
  - `FamilyContext`: Active profile selection and family roster.
  - `EntitlementContext`: Dynamic feature access.
- **Hooks**: Custom hooks handle state encapsulation (`useSubscriptionGuard`, `useFamilyOrchestration`, `useEntitlements`).
- **Caching**:
  - Web Admin: `sessionStorage` with SWR (Stale-While-Revalidate) pattern.
  - Mobile: `@react-native-async-storage/async-storage` for active profile ID and onboarding flags.
  - Optimistic Updates: Immediate local state updates on profile switching and onboarding completion.
- **Realtime**: Supabase Postgres Changes channels (`supabase.channel`) for real-time chat messages and notification delivery.

---

## Design System & Primitive Components

All UI elements adhere to **AppTheme.ts**:

- **Cards**: `surfaceGlass` glassmorphism styling (`rgba(255,255,255,0.75)`), `borderRadius: 20-25`, subtle border `rgba(62,92,82,0.08)`.
- **Buttons**: Rounded `borderRadius: 16` or pill-shaped `full: 9999` touchables with `#27443B` or `#FD761C` fills.
- **Inputs**: Rounded `borderRadius: 12`, `#F3F4F6` background, `#E5E7EB` border.
- **Dialogs & Modals**: Centered backdrop blur modals with `modalOverlay` (`rgba(0,0,0,0.4)`).
- **Bottom Sheets**: `PermissionBottomSheet.tsx`, `MoreBottomSheetModal.tsx`.
- **Badges**: Status pills (`bg-green-100 text-green-700`, `bg-orange text-white`).
- **Widgets**: Self-contained dashboard components with standard RTL padding and font styling.

---

## Navigation

Healix utilizes **Expo Router v6** (file-based navigation with TypeScript type safety):

- `(tabs)`: Bottom tab bar navigator rendering `index`, `workouts`, `medical`, `chat`, and `profile`.
- `Stack`: Root screen navigator managing modal overlays, onboarding, payment workflows, and sub-views.

---

## Security

1. **Authentication**: Supabase Auth (JWT Tokens, encrypted session persistence).
2. **Authorization**: SQL Security Definer helper functions:
   - `public.check_user_is_admin(user_id)`
   - `public.check_user_is_medical_professional(user_id)`
   - `public.is_admin()`
3. **Premium Protection**: Client-side `useSubscriptionGuard` + RLS database policies enforcing `active` subscription status.
4. **Role-Based Access Control (RBAC)**: Enforced via `role` field on `profiles` (`client`, `doctor`, `coach`, `admin`).
5. **Supabase Row-Level Security (RLS)**: Active RLS on all 29 public tables preventing unauthorized data cross-access.

---

## Future Architecture

*The following modules are explicitly marked as **Planned (Not Yet Implemented)**:*

- ⏳ **Lab AI Auto-Parser** *(Planned - Not Yet Implemented)*: Machine learning pipeline for automated OCR extraction of biomarkers from PDF lab reports.
- ⏳ **Doctor Medical Web Portal** *(Planned - Not Yet Implemented)*: Specialized clinical web interface for doctors to review client lab charts and issue medical prescriptions.
- ⏳ **Coach Fitness Web Portal** *(Planned - Not Yet Implemented)*: Web workspace for fitness coaches to design multi-week workout templates.
- ⏳ **Automated Payment Gateway Integration** *(Planned - Not Yet Implemented)*: Automated payment gateway (Stripe / Paymob) to replace manual bank transfer receipt upload workflows.
- ⏳ **Direct Wearable Telemetry Sync** *(Planned - Not Yet Implemented)*: Native SDK integration for Apple HealthKit and Google Health Connect automated step and heart rate synchronization.
