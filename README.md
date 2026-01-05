# Brigo — AI-Powered Study Companion

A gamified mobile study app that helps students learn effectively using AI-generated content, spaced repetition, and gamification mechanics.

## 🎯 Product Overview

Brigo transforms uploaded study materials (PDFs, text, YouTube videos) into:
- **AI-powered quizzes** with adaptive difficulty
- **Smart flashcards** using spaced repetition
- **Audio overviews** (podcast-style summaries)
- **Interactive AI tutor** chat

Users are motivated through a **virtual pet system** that grows as they complete daily study tasks and maintain streaks.

## 📊 Key Metrics

| Metric | Description |
|--------|-------------|
| DAU/MAU | Daily/Monthly active users ratio |
| Retention | D1, D7, D30 cohort retention |
| Streak Rate | % of users maintaining 7+ day streaks |
| Conversion | Free → Trial → Paid conversion rates |
| LTV | Lifetime value per subscriber |

*Analytics tracked via Mixpanel (EU data residency)*

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Xcode 15+ (for iOS development)
- Ruby & CocoaPods
- Expo CLI: `npm install -g expo-cli`

### Setup

1. **Clone and install:**
   ```bash
   git clone <repo>
   cd brigo
   npm install
   ```

2. **Environment variables:**
   Create `.env` file with:
   ```
   EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   EXPO_PUBLIC_MIXPANEL_TOKEN=<your-mixpanel-token>
   ```

3. **Install iOS dependencies:**
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Run development build:**
   ```bash
   npx expo run:ios
   ```

## 🏗️ Architecture

```
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Main tab navigation
│   ├── onboarding/        # Onboarding flow
│   ├── quiz/              # Quiz player
│   ├── flashcards/        # Flashcard viewer
│   ├── audio-player/      # Audio overview player
│   └── paywall.tsx        # Subscription paywall
├── components/            # Reusable UI components
│   ├── onboarding/        # Onboarding screens
│   ├── studio/            # Quiz/Flashcard viewers
│   ├── pet-sheet/         # Pet modal components
│   └── upgrade/           # Paywall components
├── lib/
│   ├── store/             # Zustand state management
│   │   └── slices/        # Modular store slices
│   ├── services/          # API and business logic
│   │   ├── analyticsService.ts
│   │   ├── notebookService.ts
│   │   ├── studioService.ts
│   │   └── taskService.ts
│   ├── supabase.ts        # Database client
│   └── purchases.ts       # RevenueCat integration
├── hooks/                 # Custom React hooks
└── assets/                # Images, fonts
```

## 🧩 Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Expo (React Native) |
| Navigation | Expo Router |
| State | Zustand |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Email, Google, Apple) |
| Storage | Supabase Storage |
| Payments | RevenueCat |
| Analytics | Mixpanel |
| Animations | Moti |
| AI | OpenAI GPT-4 (via Edge Functions) |

## 💰 Monetization

- **Subscription Model:** Monthly/Semester (3 months) via App Store
- **Free Tier:** Limited notebooks, basic features
- **Pro Tier:** Unlimited everything, priority AI access
- **Payment Processing:** RevenueCat (handles receipts, entitlements)

## 📈 Analytics Events

The app tracks comprehensive user behavior:

| Category | Events Tracked |
|----------|---------------|
| Onboarding | Flow completion, screen drop-offs, auth method |
| Study | Quiz scores, flashcard sessions, audio plays |
| Engagement | Pet interactions, streaks, task completions |
| Monetization | Paywall views, plan selection, purchases |

## 🗄️ Database Schema

Core tables (Supabase):
- `profiles` - User metadata, preferences
- `notebooks` - Study material containers
- `notebook_materials` - Uploaded content
- `studio_quizzes` - Generated quizzes
- `studio_flashcard_sets` - Flashcard collections
- `daily_task_completions` - Task tracking
- `user_study_scores` - Performance history

## 🔐 Security

- Row Level Security (RLS) enforced on all tables
- Auth tokens via Supabase
- No hardcoded secrets (all via environment variables)

## 📦 Deployment

### Development Build
```bash
npx expo run:ios
```

### Production Build (EAS)
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

## 📄 License

Proprietary — All rights reserved

---

*For acquisition inquiries, contact: [your-email]*
