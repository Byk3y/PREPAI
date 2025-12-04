# Technology Stack (PRD)

## 1 — Mobile / Frontend
- **Framework:** Expo (React Native)
- **UI:** React Native + NativeWind (Tailwind)
- **Navigation:** Expo Router
- **Language:** TypeScript
- **State:** Zustand
- **Animations:** Reanimated + Moti + Lottie
- **Assets:** react-native-svg, Lottie JSON files

## 2 — Backend & Database
- **Supabase (Postgres)**  
  - Tables: profiles, pet_states, flashcards, exam_plans, entitlements  
  - Row-Level Security enabled  
  - Real-time optional  
  - Supabase Storage for uploads  
  - Edge Functions for AI batching, webhooks

## 3 — Authentication
- Supabase Auth *or* external provider (Clerk/Auth0/custom JWT)
- Tokens stored in SecureStore

## 4 — AI Layer
- OpenAI / Gemini for flashcards, lessons, quiz generation
- LLM calls via Edge Functions (batch + cache)
- pgvector optional for semantic search

## 5 — Payments
- **Superwall** for paywall & trial logic
- Server verifies entitlements via webhook → Supabase.entitlements update
- Optional: RevenueCat for analytics

## 6 — Analytics & Monitoring
- Sentry for crash logs
- Mixpanel/Amplitude for product analytics
- Supabase logs for custom metrics

## 7 — Deployment
- EAS for iOS/Android builds
- GitHub Actions optional for CI/CD
- Edge Functions deployed via Supabase

## 8 — Security
- RLS on all user tables
- Access tokens in memory, refresh tokens in SecureStore
- Webhook signature verification
