# Prep AI — Expo UI Starter

A UI-first Expo + TypeScript starter for a gamified study app. This scaffold includes mock data and is ready for quick prototyping and demos.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Expo CLI installed globally: `npm install -g expo-cli`
- Expo Go app on your iOS/Android device (or iOS Simulator / Android Emulator)

### Setup & Run

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   # or
   expo start
   ```

3. **Run on device:**
   - Scan the QR code with Expo Go (iOS) or Camera app (Android)
   - Or press `i` for iOS Simulator / `a` for Android Emulator

## 📱 Demo Flows

### Home Screen (`/`)
- View daily progress (streak, coins, tasks)
- Tap "Study for an Exam" → Exam Hub
- Tap "Learn Something New" → Lesson screen
- Tap pet bubble (bottom-right) → Pet half-sheet modal
- Scroll to see "Continue Studying" list

### Exam Hub (`/exam`)
- View list of mock exams
- Tap "Start Exam Plan" to create a plan (shows alert)
- Tap "Practice" to go to flashcard screen

### Lesson Screen (`/lesson/[id]`)
- View lesson content
- See animated PetWidget on the right side
- Tap "Start Quiz" → Flashcard screen
- Tap "Mark Complete" → Triggers pet reaction

### Flashcard Player (`/flashcard/[id]`)
- Answer multiple choice questions
- See visual feedback (green = correct, red = incorrect)
- PetWidget reacts to answers (happy for correct, sad for incorrect)
- XP is awarded for correct answers

### Pet Half-Sheet (`/pet-sheet`)
- Modal overlay showing pet details
- View streak, XP progress bar
- See missions list with progress
- Tap outside or swipe down to close

## 🏗️ Project Structure

```
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout with NativeWind setup
│   ├── index.tsx          # Home screen
│   ├── exam/
│   │   └── index.tsx      # Exam hub
│   ├── lesson/
│   │   └── [id].tsx       # Lesson screen (dynamic route)
│   ├── flashcard/
│   │   └── [id].tsx       # Flashcard player
│   └── pet-sheet.tsx      # Pet modal (half-sheet)
├── components/            # Reusable components
│   ├── PetBubble.tsx      # Small pet bubble for Home
│   ├── PetWidget.tsx      # Full pet widget with animations
│   ├── HomeCard.tsx       # Large CTA cards
│   └── ContinueCard.tsx   # Resume card component
├── lib/
│   ├── theme.ts           # Design tokens (colors, spacing)
│   └── store.ts           # Zustand store with mock data
├── assets/                # Images, fonts, etc.
├── package.json
├── app.json               # Expo config
├── tailwind.config.js     # NativeWind/Tailwind config
└── tsconfig.json          # TypeScript config
```

## 🎨 Theme & Design

- **Primary Color:** `#FFCB3C` (warm yellow)
- **Secondary:** `#4A90E2` (blue)
- **Accent:** `#FF6B6B` (coral)
- Design tokens are centralized in `lib/theme.ts`
- Uses NativeWind (Tailwind CSS for React Native)

## 🧩 Tech Stack

- **Framework:** Expo (React Native)
- **Navigation:** Expo Router (file-based routing)
- **Styling:** NativeWind (Tailwind CSS)
- **State:** Zustand
- **Animations:** Moti (micro-animations)
- **Language:** TypeScript

## 📝 Mock Data

All data is stored in `lib/store.ts` using Zustand:
- User profile (name, streak, coins)
- Pet state (level, XP, mood)
- Flashcards, exams, lessons
- Recent items for "Continue Studying"

## 🔄 Next Steps (Integration Points)

The codebase includes `TODO` comments marking where to integrate:

1. **Supabase:**
   - Replace mock store with real-time subscriptions
   - Add authentication
   - Connect flashcards, exams, lessons to database

2. **OpenAI/Gemini:**
   - Generate flashcards dynamically
   - Create lesson content
   - Quiz generation

3. **Superwall:**
   - Add paywall logic
   - Verify entitlements
   - Note: Requires EAS builds (see `eas.json`)

4. **Lottie Animations:**
   - Replace placeholder pet emoji with Lottie JSON files
   - Example usage pattern is shown in `PetWidget.tsx`

## 🛠️ Development Notes

- All screens are runnable in Expo Go / EAS Dev Client
- Components are modular and easy to replace
- Animations use Moti for smooth micro-interactions
- Theme tokens are centralized for easy customization

## 📦 Building for Production

For production builds (required for Superwall native SDK):

1. Install EAS CLI: `npm install -g eas-cli`
2. Configure `eas.json` (see file for notes)
3. Build: `eas build --platform ios` or `eas build --platform android`

## 🐛 Troubleshooting

- **Metro bundler issues:** Clear cache with `expo start -c`
- **NativeWind not working:** Ensure `global.css` is imported in `_layout.tsx`
- **TypeScript errors:** Run `npx tsc --noEmit` to check types

## 📄 License

Private project — All rights reserved

