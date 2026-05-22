# Healix Mobile Application 🚀

Healix is a comprehensive health and lifestyle tracking mobile application built with React Native (Expo) and Supabase. This repository contains the mobile client and edge functions that power the medical analysis features using advanced AI.

---

## 🏗 Architecture Map

The application follows a modular, feature-based architecture pattern with clear separation of concerns.

```
healix-app/
├── app/                    # Expo Router file-based routes
│   ├── _layout.tsx         # Root layout (AuthProvider, routing guard, Sentry)
│   ├── index.tsx           # Loading portal (redirects via layout guard)
│   ├── (tabs)/             # Tab navigator (Dashboard, Chat, Medical, History, Profile)
│   ├── login.tsx           # Auth screens
│   ├── signup.tsx
│   ├── onboarding.tsx
│   └── ...
├── components/             # Shared UI components (root level)
│   ├── chat/               # Chat-specific components (MessageBubble, etc.)
│   ├── dashboard/          # Dashboard components (MainDashboardView, etc.)
│   ├── auth/               # Auth form components (AuthInput, AuthButton)
│   ├── ErrorBoundary.tsx
│   ├── ChatView.tsx
│   ├── WaterTracker.tsx
│   └── ...
├── hooks/                  # Shared app-level hooks (root level)
│   ├── usePushNotifications.ts
│   ├── useNetworkStatus.ts
│   └── ...
├── constants/              # Theme tokens (AppTheme.ts)
├── src/
│   ├── context/            # Global state providers (Auth, Family)
│   ├── features/           # Domain-specific logic
│   │   ├── medical/        # InBody analysis, Health Profiles
│   │   │   ├── hooks/
│   │   │   └── services/
│   │   ├── chat/           # Real-time messaging hooks
│   │   │   └── hooks/
│   │   └── family/         # Family orchestration
│   │       └── hooks/
│   ├── hooks/              # Shared query hooks (useSupabaseQuery)
│   ├── lib/                # Core infrastructure
│   │   ├── apiClient.ts    # Resilient Supabase wrapper (Retries, Timeouts, Abort)
│   │   ├── errors.ts       # Typed error taxonomy (AppError)
│   │   ├── schemas.ts      # Zod runtime validation schemas
│   │   ├── supabase.ts     # Supabase client initialization
│   │   └── logger.ts       # Telemetry wrapper
│   ├── screens/            # Full-screen components (Login, Signup, etc.)
│   └── types/              # TypeScript interfaces and domain models
├── supabase/
│   └── functions/          # Edge Functions (analyze-inbody)
├── __tests__/              # Jest test suites
└── ...
```

### Key Technologies
- **Framework**: React Native (Expo SDK 54)
- **Backend & Auth**: Supabase (PostgreSQL, Storage, Edge Functions)
- **Routing**: Expo Router (File-based routing)
- **Observability**: Sentry for React Native
- **AI Integration**: Groq (Llama 3.2 Vision) for medical document parsing

---

## 🛠 Environment Setup

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd healix-app
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Environment Variables:**
   Create a `.env` file in the root directory and populate it with your Supabase and Sentry credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn
   ```

4. **Start Development Server:**
   ```bash
   npm start
   ```

---

## 🧪 Testing & Quality Assurance

This project uses Jest and React Native Testing Library.

- **Run Unit Tests**:
  ```bash
  npm test
  ```
- **Security Audit**:
  ```bash
  npm run audit:prod
  ```
  *(Run this before any production release to ensure no vulnerable dependencies exist).*

---

## 🚀 Release Process

1. **Pre-flight Checks**:
   - Ensure `npm test` passes.
   - Ensure `npm run audit:prod` yields no critical vulnerabilities.
   - Verify environment variables for the production tier.

2. **Build for iOS/Android**:
   We use EAS (Expo Application Services) for building the production artifacts.
   ```bash
   eas build --profile production --platform all
   ```

3. **OTA Updates** (Over-The-Air):
   For minor JavaScript/asset fixes:
   ```bash
   eas update --branch production --message "Fix: Description of fix"
   ```

---

## 🔍 Troubleshooting

- **Edge Function Memory Crashes (413 Payload Too Large)**:
  The `analyze-inbody` function enforces a 5MB payload limit. If users report analysis failures, ensure the client-side image compression (quality: 0.2) is working correctly.

- **Routing Loops / Blank Screens on Boot**:
  The application uses an explicit state machine (`booting` -> `ready` | `unauthenticated`) in `app/_layout.tsx`. If the app hangs on the splash screen, verify that the `AuthContext` is resolving the session state correctly.

- **Network Timeouts on Weak Connections**:
  The `apiClient` automatically retries idempotent requests with exponential backoff up to 2 times. Timeout is set to 15 seconds. Logs are sent to Sentry if all retries fail.
