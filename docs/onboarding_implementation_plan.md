# PrepAI Onboarding Flow Implementation Plan

## Overview

Build a 7-screen science-backed onboarding flow that educates users about effective studying, introduces the pet companion system, and leads to trial signup.

**Goals:**
- Show value before requiring signup (educational approach)
- Create emotional investment through pet naming
- Lead smoothly to existing auth flow
- Track completion to show only once

---

## Design Decisions

### User Flow
1. **Screen 1**: The Problem - "Studying Feels Like a Chore"
2. **Screen 2**: The Science - "Your Brain Learns by Doing" (Active Recall)
3. **Screen 3**: The Solution Part 1 - "Turn Anything Into Study Tools"
4. **Screen 4**: The Solution Part 2 - Pet Introduction + Pet Naming
5. **Screen 5**: The Dream - Aspirational outcome
6. **Screen 6**: Social Proof - Reviews/testimonials
7. **Screen 7**: Trial Offer - "Start Your 7-Day Free Trial"

**After Screen 7**: Navigate to existing auth flow (`/app/auth/index.tsx`)

### Technical Decisions
- **Design**: Text-focused with Moti animations, no videos/illustrations for v1
- **Visuals**: Emojis as placeholders, animated progress bar at top
- **Pet Naming**: Interactive text input on Screen 4 (before signup)
- **Pet Image**: Use stage-1 pet (`assets/pets/stage-1/full-view.png`)
- **Auth**: Integrate with existing Google + Apple sign-in flow
- **State**: Store completion flag in `profiles.meta.has_completed_onboarding`
- **Navigation**: Conditional routing in `app/_layout.tsx`

### Out of Scope (Defer)
- RevenueCat/Superwall integration
- Trial tracking/expiration
- Post-trial paywall
- Payment flow

---

## Implementation Steps

### Phase 1: State Management Setup

#### 1.1 Add Onboarding Slice to Store
**File**: `lib/store/slices/onboardingSlice.ts` (NEW)

Create new Zustand slice for onboarding state:
```typescript
interface OnboardingSlice {
  hasCompletedOnboarding: boolean;
  pendingPetName: string | null; // Temporary storage before auth
  setHasCompletedOnboarding: (completed: boolean) => void;
  setPendingPetName: (name: string) => void;
  clearPendingPetName: () => void;
  markOnboardingComplete: () => Promise<void>;
}
```

**Logic**:
- `pendingPetName`: Store pet name locally during onboarding (before user has account)
- `markOnboardingComplete()`: Update database profile.meta + save pet name

#### 1.2 Integrate Slice into Main Store
**File**: `lib/store/index.ts`

Add onboardingSlice to combined store:
- Import slice
- Add to store composition
- Add to persistence partialize (save `hasCompletedOnboarding`)

#### 1.3 Add Database Field (Optional Enhancement)
**File**: `supabase/migrations/039_add_onboarding_flag.sql` (NEW)

Add helper function to update profile meta:
```sql
CREATE OR REPLACE FUNCTION public.mark_onboarding_complete(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET meta = jsonb_set(
    COALESCE(meta, '{}'::jsonb),
    '{has_completed_onboarding}',
    'true'::jsonb
  )
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Alternative**: Just update profiles.meta directly from client (simpler for v1)

---

### Phase 2: Onboarding Screens

#### 2.1 Create Onboarding Component Structure
**File**: `app/onboarding.tsx` (NEW)

Single file with all 7 screens using state to track current screen.

**Component Structure**:
```typescript
export default function OnboardingScreen() {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [petName, setPetName] = useState('');
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);
  const { setPendingPetName } = useStore();

  const screens = [
    <Screen1 />,
    <Screen2 />,
    <Screen3 />,
    <Screen4 petName={petName} onNameChange={setPetName} />,
    <Screen5 />,
    <Screen6 />,
    <Screen7 />
  ];

  const handleContinue = () => {
    if (currentScreen === 6) {
      // Last screen - save pet name and go to auth
      setPendingPetName(petName);
      router.replace('/auth');
    } else {
      setCurrentScreen(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    router.replace('/auth');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Progress bar at top */}
      <ProgressBar current={currentScreen + 1} total={7} />

      {/* Current screen */}
      <MotiView
        key={currentScreen}
        from={{ opacity: 0, translateX: 50 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'spring', damping: 15 }}
      >
        {screens[currentScreen]}
      </MotiView>

      {/* Navigation */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={{ color: colors.textSecondary }}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleContinue}>
          <MotiView
            animate={{ scale: 1 }}
            transition={{ type: 'spring' }}
          >
            <Text style={styles.continueButton}>
              {currentScreen === 6 ? 'Start Free Trial' : 'Continue →'}
            </Text>
          </MotiView>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

#### 2.2 Create Individual Screen Components
**Files**: Create as separate components in same file for simplicity

**Screen 1 - The Problem**:
```typescript
function Screen1({ colors }: { colors: ReturnType<typeof getThemeColors> }) {
  return (
    <View style={styles.screenContainer}>
      <MotiText
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600 }}
        style={styles.emoji}
      >
        📚
      </MotiText>
      <MotiText
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        delay={200}
        style={[styles.headline, { color: colors.text }]}
      >
        Studying Feels Like a Chore
      </MotiText>
      <MotiText
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        delay={400}
        style={[styles.body, { color: colors.textSecondary }]}
      >
        Endless re-reading. Highlighting everything. Cramming before exams.
        {'\n\n'}
        But research shows: Re-reading is one of the least effective study methods.
      </MotiText>
    </View>
  );
}
```

**Screen 2 - The Science**:
- Emoji: 🧠
- Headline: "Your Brain Learns by Doing, Not Reading"
- Body: Studies show active recall improves retention by 50%...

**Screen 3 - The Solution Part 1**:
- Emoji: ✨
- Headline: "Turn Anything Into Study Tools"
- Body: Upload PDFs, photos, notes. Get quizzes, flashcards, audio...

**Screen 4 - Pet Introduction + Naming**:
```typescript
function Screen4({ petName, onNameChange, colors }) {
  return (
    <View style={styles.screenContainer}>
      {/* Pet Image */}
      <MotiImage
        source={require('@/assets/pets/stage-1/full-view.png')}
        style={{ width: 150, height: 150 }}
        from={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12 }}
      />

      {/* Pet speaks in first person */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        delay={300}
      >
        <Text style={[styles.headline, { color: colors.text }]}>
          "Hi! I'm your study companion."
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          I'll grow as you learn, celebrate your wins, and keep you motivated.
        </Text>

        {/* Name input */}
        <View style={styles.nameInputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            What should you call me?
          </Text>
          <TextInput
            value={petName}
            onChangeText={onNameChange}
            placeholder="Enter a name..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: colors.border
            }]}
            maxLength={20}
          />
          {/* Suggestions */}
          <View style={styles.suggestions}>
            {['Nova', 'Buddy', 'Spark', 'Luna'].map(name => (
              <TouchableOpacity
                key={name}
                onPress={() => onNameChange(name)}
                style={[styles.suggestionChip, { backgroundColor: colors.surfaceAlt }]}
              >
                <Text style={{ color: colors.textSecondary }}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </MotiView>
    </View>
  );
}
```

**Screen 5 - The Dream**:
- Emoji: 🏆
- Headline: "Imagine This..."
- Body: Walking into exams prepared, not panicked...

**Screen 6 - Social Proof**:
- Emoji: ⭐
- Headline: "Join Thousands of Students Studying Smarter"
- Body: 4.8/5 rating, testimonials (placeholder text)

**Screen 7 - Trial Offer**:
- Emoji: 🚀
- Headline: "Start Your 7-Day Free Trial"
- Body:
  - ✓ Unlimited notebooks
  - ✓ Quizzes, flashcards, audio
  - ✓ Full pet experience
  - ✓ Cancel anytime
- Button: "Start Free Trial" (larger, primary color)

#### 2.3 Create Progress Bar Component
**File**: `components/onboarding/ProgressBar.tsx` (NEW)

```typescript
export function ProgressBar({ current, total }: { current: number; total: number }) {
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  return (
    <View style={styles.progressContainer}>
      {/* Progress dots */}
      <View style={styles.dots}>
        {Array.from({ length: total }).map((_, i) => (
          <MotiView
            key={i}
            animate={{
              scale: i < current ? 1.2 : 1,
              backgroundColor: i < current ? colors.primary : colors.borderLight
            }}
            transition={{ type: 'spring', damping: 15 }}
            style={styles.dot}
          />
        ))}
      </View>

      {/* Progress bar (alternative/additional) */}
      <MotiView
        style={[styles.progressBar, { backgroundColor: colors.borderLight }]}
      >
        <MotiView
          animate={{ width: `${(current / total) * 100}%` }}
          transition={{ type: 'spring', damping: 15 }}
          style={[styles.progressFill, { backgroundColor: '#FFCB3C' }]}
        />
      </MotiView>
    </View>
  );
}
```

---

### Phase 3: Navigation Integration & App Structure

#### Understanding Expo Router Structure

**Current App Structure**:
```
app/
├── _layout.tsx          # Root layout (ThemeProvider + Stack navigator)
├── index.tsx            # Home screen (/)
├── auth/
│   ├── index.tsx        # Auth landing (/auth)
│   ├── magic-link.tsx   # Magic link flow (/auth/magic-link)
│   └── callback.tsx     # OAuth callback (/auth/callback)
├── notebook/[id].tsx    # Notebook detail (/notebook/:id)
├── quiz/[id].tsx        # Quiz screen (/quiz/:id)
└── pet-sheet.tsx        # Pet modal (/pet-sheet)
```

**After Adding Onboarding**:
```
app/
├── _layout.tsx          # Root layout
├── index.tsx            # Home screen
├── onboarding.tsx       # NEW - Onboarding flow (/onboarding)
├── auth/                # Existing auth group
├── notebook/            # Existing screens
└── ...
```

#### How Expo Router Works

**File-Based Routing**:
- Each file in `app/` becomes a route
- `app/onboarding.tsx` → `/onboarding`
- Groups (folders) create nested routes
- `_layout.tsx` wraps all routes in that directory

**Stack Navigator** (in `app/_layout.tsx`, lines 319-341):
```typescript
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="index" />
  <Stack.Screen name="auth/index" />
  <Stack.Screen name="auth/magic-link" />
  <Stack.Screen name="auth/callback" />
  <Stack.Screen name="onboarding" />  {/* ADD THIS */}
  {/* ... other screens ... */}
</Stack>
```

**Navigation Flow**:
1. App loads → `_layout.tsx` mounts
2. `ThemeProvider` wraps everything
3. Auth state loads (`onAuthStateChange`)
4. Conditional logic determines initial route:
   - No user + no onboarding → `/onboarding`
   - No user + completed onboarding → `/auth`
   - Has user → `/` (home)

#### 3.1 Register Onboarding Screen in Stack
**File**: `app/_layout.tsx` (around line 319)

Add onboarding to the Stack:
```typescript
<Stack
  screenOptions={{
    headerShown: false,
    contentStyle: { backgroundColor: colors.background },
  }}
>
  <Stack.Screen name="index" />
  <Stack.Screen name="onboarding" />          {/* ADD THIS */}
  <Stack.Screen name="auth/index" />
  <Stack.Screen name="auth/magic-link" />
  <Stack.Screen name="auth/callback" />
  {/* ... rest ... */}
</Stack>
```

#### 3.2 Update Navigation Logic
**File**: `app/_layout.tsx` (around line 279-301)

**Current logic**:
```typescript
useEffect(() => {
  if (!fontsLoaded) return;

  const inAuthGroup = segments[0] === 'auth';

  supabase.auth.getUser()
    .then(({ data: { user } }) => {
      if (!user && !inAuthGroup) {
        router.replace('/auth');
      } else if (user && inAuthGroup) {
        router.replace('/');
      }
    });
}, [segments, fontsLoaded]);
```

**New logic with onboarding**:
```typescript
useEffect(() => {
  if (!fontsLoaded || !isInitialized) return;

  const currentRoute = segments[0];
  const inAuthGroup = currentRoute === 'auth';
  const inOnboardingGroup = currentRoute === 'onboarding';

  supabase.auth.getUser()
    .then(({ data: { user } }) => {
      // Route priority:
      // 1. No user + haven't seen onboarding → /onboarding
      // 2. No user + completed onboarding → /auth
      // 3. Has user but in auth → / (home)
      // 4. Has user → stay on current route

      if (!user) {
        // Not logged in
        if (!hasCompletedOnboarding && !inOnboardingGroup) {
          // First time - show onboarding
          router.replace('/onboarding');
        } else if (hasCompletedOnboarding && !inAuthGroup) {
          // Returning, no account - show auth
          router.replace('/auth');
        }
      } else {
        // Logged in
        if (inAuthGroup || inOnboardingGroup) {
          // Redirect from auth/onboarding to home
          router.replace('/');
        }
        // Otherwise stay on current route
      }
    })
    .catch((error) => {
      console.error('Error checking auth state:', error);
      // On error, safe fallback
      if (!inOnboardingGroup && !inAuthGroup) {
        router.replace('/onboarding');
      }
    });
}, [segments, fontsLoaded, isInitialized, hasCompletedOnboarding]);
```

**Add hasCompletedOnboarding to store access** (top of component):
```typescript
const {
  setAuthUser,
  setHasCreatedNotebook,
  setIsInitialized,
  loadNotebooks,
  loadPetState,
  hydratePetStateFromCache,
  hasCompletedOnboarding,        // ADD THIS
  setHasCompletedOnboarding,     // ADD THIS
} = useStore();
```

#### 3.3 Navigation State Diagram

```
┌─────────────────┐
│  App Launches   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Fonts Loading   │ ← FirstScreen shows here
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Check Auth     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
NO USER    HAS USER
    │         │
    │         └──────────────────┐
    │                            │
    ▼                            ▼
┌─────────────────┐      ┌──────────────┐
│ Check Onboarding│      │   Go Home    │
│   Completion    │      │   (index)    │
└────────┬────────┘      └──────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 NOT DONE   DONE
    │         │
    │         └──────────────────┐
    │                            │
    ▼                            ▼
┌─────────────────┐      ┌──────────────┐
│  Onboarding     │      │   Auth       │
│  (7 screens)    │      │   Screen     │
└────────┬────────┘      └──────┬───────┘
         │                      │
         │                      │
         └──────────┬───────────┘
                    │
                    ▼
            ┌──────────────┐
            │  Auth Flow   │
            │ (Google/Apple)│
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │ Save Pet Name│
            │ Mark Complete│
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │   Go Home    │
            └──────────────┘
```

#### 3.4 Route Guards & Precedence

**Route Priority** (highest to lowest):
1. **Onboarding Gate**: First-time users MUST see onboarding
2. **Auth Gate**: Unauthenticated users go to auth
3. **Home**: Authenticated users go to home
4. **Deep Links**: Preserve intended destination after auth

**Implementation**:
```typescript
// Priority 1: Force onboarding for first-timers
if (!user && !hasCompletedOnboarding && currentRoute !== 'onboarding') {
  return router.replace('/onboarding');
}

// Priority 2: Require auth if onboarding done
if (!user && hasCompletedOnboarding && currentRoute !== 'auth') {
  return router.replace('/auth');
}

// Priority 3: Redirect authed users away from auth/onboarding
if (user && (currentRoute === 'auth' || currentRoute === 'onboarding')) {
  return router.replace('/');
}
```

#### 3.5 Load Onboarding State on Init
**File**: `app/_layout.tsx`

In the `onAuthStateChange` effect (around line 89-104), load onboarding flag:

```typescript
// After loading profile
const { data: profile } = await supabase
  .from('profiles')
  .select('id, name, streak, avatar_url, meta')
  .eq('id', session.user.id)
  .single();

// Check onboarding completion
const hasCompleted = profile?.meta?.has_completed_onboarding ?? false;
setHasCompletedOnboarding(hasCompleted);
```

---

### Phase 4: Post-Auth Pet Name Handling

#### 4.1 Save Pet Name After Auth Success
**File**: `app/auth/callback.tsx` (or create new welcome screen)

After successful authentication, check for pending pet name:

```typescript
useEffect(() => {
  const handleAuthCallback = async () => {
    const { pendingPetName, clearPendingPetName, updatePetName, markOnboardingComplete } = useStore.getState();

    // If user came from onboarding with a pet name
    if (pendingPetName) {
      // Save pet name to database
      await updatePetName(pendingPetName);

      // Mark onboarding as complete
      await markOnboardingComplete();

      // Clear pending name
      clearPendingPetName();

      // Redirect to home
      router.replace('/');
    }
  };

  handleAuthCallback();
}, []);
```

**Alternative Approach**: Create a dedicated welcome screen `/app/welcome.tsx` that shows briefly after first auth:
- "Welcome, [name]! Meet [pet name]!"
- Shows pet with their chosen name
- Button: "Let's Get Started" → home screen

This feels more polished than immediate redirect.

#### 4.2 Update markOnboardingComplete Function
**File**: `lib/store/slices/onboardingSlice.ts`

```typescript
markOnboardingComplete: async () => {
  const { authUser } = useStore.getState();
  if (!authUser) return;

  try {
    // Update profile meta in database
    const { error } = await supabase
      .from('profiles')
      .update({
        meta: {
          has_completed_onboarding: true,
          onboarding_completed_at: new Date().toISOString()
        }
      })
      .eq('id', authUser.id);

    if (error) throw error;

    // Update local state
    set({ hasCompletedOnboarding: true });
  } catch (error) {
    console.error('Failed to mark onboarding complete:', error);
  }
}
```

---

### Phase 5: Styling & Polish

#### 5.1 Create Shared Styles
**File**: `app/onboarding.tsx` (at bottom)

```typescript
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  headline: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'SpaceGrotesk-Bold',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 38,
  },
  body: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  continueButton: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFCB3C',
  },
  nameInputContainer: {
    width: '100%',
    marginTop: 32,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk-Medium',
  },
  suggestions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});
```

#### 5.2 Add Haptic Feedback
**File**: `app/onboarding.tsx`

Import and use haptics:
```typescript
import * as Haptics from 'expo-haptics';

const handleContinue = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // ... rest of logic
};
```

---

### Phase 6: Testing & Edge Cases

#### 6.1 Handle Skip Functionality
When user taps "Skip":
- Clear pending pet name
- Set default pet name ("Nova")
- Mark onboarding as complete
- Go to auth

#### 6.2 Handle Back Navigation
Prevent back button during onboarding:
```typescript
useFocusEffect(
  useCallback(() => {
    const onBackPress = () => {
      if (currentScreen > 0) {
        setCurrentScreen(prev => prev - 1);
        return true; // Prevent default
      }
      return false; // Allow exit if on first screen
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [currentScreen])
);
```

#### 6.3 Persist Progress
If user closes app mid-onboarding:
- Save current screen to AsyncStorage
- Resume where they left off on reopen
- OR: Just restart from beginning (simpler for v1)

**Recommendation**: Restart from beginning for v1 (simpler). Add persistence in v2 if needed.

---

## Implementation Checklist

### Phase 1: State Management
- [ ] Create `lib/store/slices/onboardingSlice.ts`
- [ ] Add slice to `lib/store/index.ts`
- [ ] Add `hasCompletedOnboarding` to persistence
- [ ] Test state management (log values)

### Phase 2: Onboarding Screens
- [ ] Create `app/onboarding.tsx`
- [ ] Implement Screen 1 (The Problem)
- [ ] Implement Screen 2 (The Science)
- [ ] Implement Screen 3 (The Solution Part 1)
- [ ] Implement Screen 4 (Pet Introduction + Naming)
- [ ] Implement Screen 5 (The Dream)
- [ ] Implement Screen 6 (Social Proof)
- [ ] Implement Screen 7 (Trial Offer)
- [ ] Create `components/onboarding/ProgressBar.tsx`
- [ ] Add animations (Moti) to all screens
- [ ] Add haptic feedback to buttons
- [ ] Style all screens (theme-aware)

### Phase 3: Navigation
- [ ] Register onboarding screen in Stack (`app/_layout.tsx`)
- [ ] Update navigation logic with onboarding routing
- [ ] Load onboarding completion flag on auth
- [ ] Test routing: first launch → onboarding
- [ ] Test routing: skip → auth → home
- [ ] Test routing: complete onboarding → auth → home

### Phase 4: Post-Auth Handling
- [ ] Save pending pet name after auth
- [ ] Implement `markOnboardingComplete()` function
- [ ] Update profile.meta in database
- [ ] Test pet name persistence
- [ ] Optional: Create `/app/welcome.tsx` screen

### Phase 5: Polish
- [ ] Add progress bar/dots animation
- [ ] Ensure dark mode support on all screens
- [ ] Test on iOS simulator
- [ ] Test on Android emulator (if available)
- [ ] Fix any layout issues
- [ ] Verify text readability in both themes

### Phase 6: Edge Cases
- [ ] Handle "Skip" button properly
- [ ] Prevent back button during onboarding (Android)
- [ ] Handle app close mid-onboarding
- [ ] Handle empty pet name (default to "Nova")
- [ ] Test returning user (should skip onboarding)

---

## Files to Create

**New Files**:
- `app/onboarding.tsx` - Main onboarding screen
- `lib/store/slices/onboardingSlice.ts` - Onboarding state
- `components/onboarding/ProgressBar.tsx` - Progress indicator
- `app/welcome.tsx` (Optional) - Post-auth welcome screen
- `supabase/migrations/039_add_onboarding_flag.sql` (Optional) - Database helper

**Files to Modify**:
- `app/_layout.tsx` - Navigation logic + load onboarding flag + register screen in Stack
- `lib/store/index.ts` - Add onboarding slice
- `app/auth/callback.tsx` (Optional) - Handle pending pet name

---

## Success Criteria

✅ First-time user sees onboarding on app launch
✅ All 7 screens display correctly with animations
✅ Pet naming works and saves after auth
✅ Onboarding completion persists (only shown once)
✅ Skip button works and goes to auth
✅ "Start Free Trial" button navigates to auth
✅ After auth, user sees home screen with their pet name
✅ Returning users skip onboarding entirely
✅ Dark mode and light mode both look good
✅ No crashes or navigation bugs

---

## Future Enhancements (V2+)

- Replace emojis with custom illustrations
- Add Lottie animations for pet
- Add video demos of app features
- A/B test different copy variations
- Track onboarding completion rate (analytics)
- Add onboarding for existing users (feature discovery)
- Personalization based on study goal selection
- Interactive demo (let them try a quiz during onboarding)

---

## Notes

**Design Philosophy**:
- Keep it simple for v1
- Focus on clean execution over fancy features
- Text + code animations can look premium without assets
- Ship fast, iterate based on user feedback

**Timeline Estimate**:
- Phase 1-2: 4-6 hours (state + screens)
- Phase 3-4: 2-3 hours (navigation + post-auth)
- Phase 5-6: 2-3 hours (polish + testing)
- **Total: 8-12 hours** for complete implementation

**Key Dependencies**:
- Existing auth flow (Google + Apple) - ✅ Already implemented
- Pet state management - ✅ Already implemented
- Theme system - ✅ Already implemented
- Moti animations - ✅ Already installed
- AsyncStorage persistence - ✅ Already configured
