# Healix

> **Note for AI Assistants & Contributors**: This document is the single source of truth for the product context, business domain, user personas, design system, and feature statuses of the Healix platform. It is paired with [ARCHITECTURE.md](file:///Users/karemabdelaziz/Coding/healix-app/ARCHITECTURE.md), which details the technical architecture, database schemas, security rules, and state orchestration.

---

## Overview

**Healix** (هيليكس) is an AI-powered medical, health, and lifestyle management ecosystem designed for Arabic-speaking users and families across the Middle East. It combines personalized clinical guidance, tailored nutrition and workout execution, continuous medical tracking, and an integrated AI health companion (**Heli**) to deliver a proactive, long-term health transformation platform.

### The Vision
To move healthcare from reactive treatment to continuous, preventive, and personalized health management. Healix bridges the gap between expert medical advice (doctors and certified coaches) and daily user execution (nutrition, workouts, hydration, medical logs, and lab analysis).

### Target Users
1. **Arabic-speaking Individuals**: Users seeking structured, long-term lifestyle, nutrition, workout, and health improvement plans.
2. **Families**: Household managers subscribing to shared family health coverage to monitor and manage health records for dependents, children, or elderly parents.
3. **Medical Professionals & Coaches**: Doctors and certified health coaches assigning personalized plans, reviewing client progress, and offering direct medical consultations.
4. **Platform Administrators**: Enterprise admins supervising user onboarding, manually verifying manual bank transfer/instapay payment receipts, toggling feature flags, managing system health, and monitoring audit logs.

---

## Product Philosophy

Healix is built on the philosophy that **sustainable health requires continuous, integrated support across every lifestyle dimension**. Rather than treating health as isolated workout apps or basic calorie counters, Healix unifies:

- **Doctors & Coaches**: Direct human medical oversight, custom plan assignments, and clinical inquiry channels.
- **Nutrition**: Meal-by-meal logging, preset macro tracking, and customized dietary plans (breakfast, lunch, dinner, snacks).
- **Workouts**: Daily exercise routines, video/guide execution, set/rep tracking, and preset exercise libraries.
- **AI Companion (Heli)**: 24/7 Arabic-native AI health intelligence for instant query resolution, InBody/Lab report explanations, and motivation.
- **Medical Analysis**: InBody composition tracking (fat, muscle, hydration) and lab test/document uploads.
- **Family Profiles**: Sub-account hierarchy allowing a single manager to oversee family members under a unified entitlement quota.
- **Medical Records**: Structured digital vault for prescriptions, lab results, and longitudinal health history.

---

## User Types

| User Type | System Role (`role`) | Primary Capabilities & Access |
|---|---|---|
| **Free User (Lead)** | `client` (`no_subscription`) | Core tracker access (Water tracking, basic weight logging, preset exercise library view). Blocked by Paywall for AI & customized plans. |
| **Premium User** | `client` (`active` / `expiring_soon`) | Full access to personalized Nutrition & Workout plans, Heli AI Chat, InBody analysis, Doctor inquiry channel, and custom progress metrics. |
| **Family Member** | `client` (Sub-account `manager_id != null`) | Inherits premium active status from Family Manager profile via `family_subscription_memberships`. Complete individual health data isolation. |
| **Admin** | `admin` | Full web dashboard access: payment receipt review (`admin_payment_requests_view`), client management (`admin_clients_view`), doctor assignment, feature flags, audit logs, AI cost analytics, system health. |
| **Doctor** | `doctor` | Access to assigned client roster, medical inquiry responses, plan customizations, and medical notes. |
| **Coach** | `coach` | Certified fitness/nutrition specialist managing client workout and dietary plans. |

---

## Main Features

### Implemented Features

#### 1. Smart Arabic Health Companion (Heli AI)
- **Purpose**: Provides 24/7 personalized, context-aware Arabic guidance based on the user's active profile, medical conditions, and daily logs.
- **Current Status**: **Fully Implemented**. Available via `HealixAICardWidget` on the dashboard, full chat tab (`(tabs)/chat.tsx`), and floating entry points.
- **Future Roadmap**: Deep integration with real-time wearable telemetry.

#### 2. Dynamic Vitality Dashboard & Widgets
- **Purpose**: Real-time Arabic RTL dashboard organizing daily health metrics, meals, workouts, water intake, and timeline activities.
- **Current Status**: **Fully Implemented**. Includes `DashboardHeaderWidget`, `ProgressHeroWidget`, `CurrentMealWidget`, `WorkoutWidget`, `WaterWidget`, `MovementWidget`, `IndicatorsWidget`, `TimelineWidget`, and `QuickActionsWidget`.

#### 3. Family Health & Sub-Account Management
- **Purpose**: Allows a primary account manager to create sub-account profiles for family members, assign family licenses, and switch active profiles seamlessly.
- **Current Status**: **Fully Implemented**. Managed via `useFamilyOrchestration`, `FamilyContext`, and `app/family.tsx`.

#### 4. Subscription & Receipt-Based Payment Engine
- **Purpose**: Handles plan purchases, bank transfer/Instapay receipt image uploads, admin verification workflows, early renewals, and family quota add-ons.
- **Current Status**: **Fully Implemented**. Powered by `payment_requests`, `subscriptions`, `subscription_periods`, `admin_approve_payment_request` RPC, and web admin verification (`TransactionReview.tsx`).

#### 5. Onboarding & Vitality Assistant Workflow
- **Purpose**: Step-by-step mandatory medical data collection (InBody, Health Profile, Lifestyle, Physical Goals) before full dashboard release.
- **Current Status**: **Fully Implemented**. Managed by `AssistantOnboardingView.tsx` with optimistic local state resolution.

#### 6. Medical Documents & InBody Records Vault
- **Purpose**: Allows users to upload and store InBody composition scans and medical PDFs/images with AI-assisted interpretation.
- **Current Status**: **Fully Implemented**. Backed by Supabase Storage (`receipts`, `medical_docs`) and `inbody_records` table.

#### 7. Doctor Inquiry & Communication Channel
- **Purpose**: Asynchronous client-to-doctor messaging channel for medical questions and plan adjustments.
- **Current Status**: **Fully Implemented**. Backed by `inquiries` and `messages` tables and web admin message center.

#### 8. Enterprise Web Admin Dashboard
- **Purpose**: Comprehensive management suite for system administrators to review payments, assign doctors to clients, manage feature flags, monitor AI costs, check audit logs, and edit site content.
- **Current Status**: **Fully Implemented**. Located in `/Users/karemabdelaziz/Coding/2026-04-19-github-https-github-com-karemabdelaziz544-hue`.

---

## Subscription System

Healix implements a single core premium plan architecture with flexible billing durations and family seat expansions.

- **Single Core Plan ("هيليكس المتكاملة" / Integrated Healix)**: Unlocks full AI, Doctor, Nutrition, Workout, and Family entitlement.
- **Billing Durations**: 1 Month, 3 Months, 6 Months, or 12 Months.
- **Additional Family Licenses**: Account managers can add extra family member seats to their subscription plan during initial purchase or mid-cycle renewal.
- **Pending Activation (`payment_pending`)**: After uploading a payment receipt, the user's lifecycle state moves to `payment_pending`. Access remains protected until an Admin approves the transaction in the Web Dashboard.
- **Expired Subscription (`expired`)**: When `subscription_end_date` passes, `useSubscriptionGuard` routes the user to `ExpiredState.tsx`, blocking premium widgets while retaining read-only access to historical logs.
- **Premium Gates (`useEntitlements`)**: Features declared in `featureRegistry.ts` require specific plan tiers (`INDIVIDUAL`, `FAMILY`, `ENTERPRISE`). Unsubscribed users navigating to locked tabs encounter `LockedTabView` or `PaywallView`.

---

## AI System (Heli)

**Heli** (هيلي) is the branded AI health companion in Healix.

- **Responsibilities**:
  1. Answering user questions regarding their prescribed nutrition and workout plans.
  2. Explaining complex InBody metrics (visceral fat, muscle mass, basal metabolic rate) in accessible Arabic.
  3. Providing motivational daily insights on the dashboard (`HealixAICardWidget`).
  4. Summarizing lab reports and medical history uploads.
- **Tone of Voice**: Empathetic, professional, encouraging, Arabic-native, and medically cautious.
- **Limitations & Guardrails**: Heli explicitly refuses to issue emergency medical diagnoses or alter prescribed doctor medication. It includes disclaimer banners directing users to consult their assigned doctor for acute clinical symptoms.

---

## Design System

Healix follows a strict custom Arabic-first design system (**Healix Stitch Tokens**) declared in `constants/AppTheme.ts`.

- **Brand Colors**:
  - `primary`: `#27443B` (Deep Forest Green)
  - `primaryLight`: `#E8F3F1` (Soft Mint Container)
  - `accent`: `#F97316` / `orange`: `#FD761C` (Vibrant Healix Orange)
  - `surface`: `#F6FAF8` (Warm Light Surface)
  - `surfaceGlass`: `rgba(255, 255, 255, 0.75)` (Glassmorphism Overlay)
  - `onBackground`: `#181D1C` (Dark Slate Typography)
- **Typography**: Custom Arabic font family **Thmanyah**:
  - `light`: `Thmanyah-Light`
  - `regular`: `Thmanyah-Regular`
  - `medium`: `Thmanyah-Medium`
  - `bold`: `Thmanyah-Bold`
  - `extraBold`: `Thmanyah-Black`
- **RTL (Right-to-Left)**: Universal RTL enforcement. Every layout container uses `writingDirection: 'rtl'`, `textAlign: 'right'`, and `flex-direction: 'row-reverse'` or `alignSelf: 'flex-start'` for proper Arabic alignment.
- **Spacing (`AppSpacing`)**: Standardized scale (`xs: 4`, `sm: 8`, `md: 12`, `lg: 16`, `xl: 20`, `xxl: 24`, `xxxl: 30`).
- **Corner Radius (`AppRadius`)**: Rounded aesthetic (`xs: 6`, `sm: 8`, `md: 12`, `lg: 16`, `xl: 20`, `xxl: 25`, `full: 9999`).
- **Card Style**: Soft glassmorphism cards with subtle border tint (`rgba(62, 92, 82, 0.08)` or `#E5E7EB`) and background elevated containers `#FFFFFF`.
- **Shadow Style**: Minimal soft shadows (`shadowColor: '#000'`, `shadowOpacity: 0.04`, `shadowRadius: 10`, `elevation: 2`).
- **Button Style**: Pill-shaped or `border-radius: 16` high-contrast buttons (`#27443B` or `#FD761C`) with active opacity feedback.
- **Icon Containers**: **Lucide Icons & Vector Icons only**, nested inside rounded square or circular Orange Containers (`#FFF7ED` background with `#FD761C` icon tint) or Mint Containers (`#E8F3F1` with `#27443B` icon tint).

---

## Mobile Structure

The mobile application is built with **Expo Router v6** (file-based navigation).

### Major Screens

```
app/
├── _layout.tsx                     # Global Root Provider Setup (Auth, Family, Entitlements, Toast)
├── index.tsx                       # Initial Route Controller
├── onboarding.tsx                  # App Intro Slides / Goal Selection
├── login.tsx / signup.tsx          # Authentication Screens
├── verify.tsx                      # OTP Verification Screen
├── subscriptions.tsx               # Subscription Plans & Tier Comparison
├── subscription-payment.tsx        # Payment Method & Bank Transfer Receipt Upload
├── subscription-management.tsx     # Active Plan Details, Renewal, Seat Upgrades
├── family.tsx                      # Family Sub-Accounts Manager & Switcher
├── plan-details.tsx                # Detailed Plan Execution (Meals & Exercises)
├── exercise-details.tsx            # Single Exercise Guide & Video Player
├── financial-history.tsx           # Billing History & Invoice Downloads
├── notifications.tsx               # Notification Center & Updates
├── new-inquiry.tsx                 # New Doctor Inquiry Form
└── (tabs)/                         # Main Bottom Tab Navigator
    ├── _layout.tsx                 # Custom Floating RTL Bottom Tab Bar
    ├── index.tsx                   # Dashboard Controller (MainDashboardView / PaywallView / OnboardingView)
    ├── workouts.tsx                # Dedicated Workout Plan & Log Tab
    ├── medical.tsx                 # Medical Records, InBody Scans & Health Profile Tab
    ├── chat.tsx                    # Heli AI Chat & Doctor Consultation Tab
    └── profile.tsx                 # Profile Settings, Account Info & Family Switcher Tab
```

---

## Folder Structure

```
healix-app/
├── app/                            # Expo Router Screen Pages & File-Based Routes
├── components/                     # Reusable UI & Business Components
│   ├── dashboard/                  # Dashboard Controllers & Modular Widgets
│   │   └── widgets/                # Individual Dashboard Widgets (Meal, Workout, Water, etc.)
│   ├── icons/                      # Custom SVG Icon Definitions (Dumbbell, Heli Avatar, etc.)
│   ├── ui/                         # Foundation UI Primitive Components
│   └── bootstrap/                  # Auth & Route Guard Orchestrators
├── constants/                      # Theme Tokens (AppTheme.ts) & Application Constants
├── hooks/                          # Shared Custom React Hooks (useSubscriptionGuard, etc.)
├── src/                            # Domain Features & Core Logic
│   ├── context/                    # React Contexts (AuthContext, FamilyContext)
│   ├── features/                   # Domain Feature Modules
│   │   ├── subscriptions/          # Entitlement Engine, Feature Registry, License Manager
│   │   ├── family/                 # Family Orchestration, Sub-Account Switcher
│   │   ├── ai/                     # Heli AI Service Handlers & Prompts
│   │   ├── medical/                # Medical Records & Document Pickers
│   │   ├── activity/               # Step & Movement Tracking Handlers
│   │   └── chat/                   # Conversation & Inquiry Hooks
│   ├── lib/                        # API Client, Supabase Singleton, Logger
│   └── types/                      # TypeScript Interfaces & Database Models
└── supabase/                       # Database Migrations & SQL Functions
    └── migrations/                 # Version-controlled SQL Schema Statements
```

---

## Technologies

- **Mobile Application**:
  - **Framework**: React Native `0.81.5` / Expo `54.0.36` (Expo Router `6.0.24`)
  - **Language**: TypeScript `5.9.2`
  - **UI & Styling**: Vanilla React Native StyleSheet with custom `AppTheme.ts` tokens, React Native Reanimated `4.1.1`, Moti `0.30.0`
  - **Icons & Graphics**: Lucide Icons (`lucide-react`), Expo Vector Icons, React Native SVG `15.12.1`
  - **State & Storage**: React Context API, `@react-native-async-storage/async-storage`, Expo Secure Store
  - **Media & Camera**: Expo Image Picker, Expo Document Picker, Expo AV
- **Backend & Database**:
  - **BaaS**: Supabase (`@supabase/supabase-js` `2.104.0`)
  - **Database**: PostgreSQL with Row-Level Security (RLS) policies and Security Definer SQL Functions
  - **Storage**: Supabase Storage Buckets (`receipts`, `medical_docs`, `avatars`)
- **Enterprise Web Admin Dashboard**:
  - **Framework**: React `19.2.0` + Vite `6.2.0`
  - **Styling**: TailwindCSS `3.4.18`
  - **Icons & Animations**: Lucide React, Framer Motion, Recharts

---

## Coding Conventions

1. **Component Naming**: PascalCase for components (`CurrentMealWidget.tsx`, `AssistantOnboardingView.tsx`).
2. **Hooks**: CamelCase with `use` prefix (`useSubscriptionGuard.ts`, `useFamilyOrchestration.ts`).
3. **Feature Folders**: Domain logic is grouped under `src/features/<domain>/` (e.g., `src/features/subscriptions/`).
4. **No Duplicated Components**: Shared UI elements (Avatars, Skeletons, Glass Cards, Badges) reside in `components/` or `src/components/` and are reused across views.
5. **Strict RTL & Right Alignment**: All Arabic text components use `writingDirection: 'rtl'`, `textAlign: 'right'`, and explicit flex layout alignments (`alignSelf: 'flex-start'`).
6. **Graceful Fallbacks & Defensive Null Checks**: Always provide fallback values (`?? '—'`, `?? []`) to prevent runtime render crashes when properties are `null` or `undefined`.

---

## Current Progress

### Finished & Verified
- ✅ Complete RTL Dashboard with 9 modular widgets (Header, Hero, Meals, Workout, Water, Movement, Indicators, Timeline, Quick Actions).
- ✅ Heli AI Companion chat interface and personalized daily insights card.
- ✅ Family Health Orchestration: Sub-account creation, active profile switching, and seat quota validation.
- ✅ Receipt-based subscription purchase & admin review workflow (`payment_requests` + `admin_payment_requests_view`).
- ✅ Mandatory Vitality Onboarding workflow with optimistic local state resolution.
- ✅ Web Admin Dashboard suite: Payment approvals, Client roster, Doctor assignments, Feature flags, Audit logs, and AI cost analytics.

### Under Active Refinement
- 🔄 Wearable telemetry synchronization & step sensor smoothing.
- 🔄 Advanced AI PDF lab report auto-parsing.

### Planned Phases (Not Yet Implemented)
- ⏳ *Planned*: Direct Apple HealthKit & Google Health Connect automated sync.
- ⏳ *Planned*: Doctor Web Portal specialized medical charting workspace.
- ⏳ *Planned*: Automated credit card payment gateway integration (Stripe / Paymob).
