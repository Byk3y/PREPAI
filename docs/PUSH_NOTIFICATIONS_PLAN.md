# Push Notifications Implementation Plan: "The Pet's Voice"

## 1. Overview
The goal is to implement a high-retention push notification system inspired by Duolingo. The system will leverage the existing **Pet Companion** system to create an emotional connection with the user, using context-aware messaging to encourage daily engagement.

## 2. Core Principles
- **Emotional Hook**: Notifications come from the Pet ({PetName}), not the app.
- **Context Awareness**: Messages mention specific notebooks (e.g., "That Mathematics notebook won't study itself").
- **Smart Delivery**: Avoid spam; stagger delivery based on the user's past study behavior.
- **Personality Types**: The pet switches between "Encouraging," "Sassy," and "Urgent" (Streak protection).

## 3. Technical Implementation

### Phase 1: Foundation (Client-Side)
- [x] **Token Registration**: Implement `expo-notifications` logic to request and store the `expo_push_token` in the `profiles` table.
- [x] **Foreground Handling**: Set up notification listeners to handle incoming messages while the app is open.
- [x] **Deep Linking**: Ensure tapping a notification takes the user directly to the relevant Notebook or the Pet screen.

### Phase 2: Permission Strategy (The "Soft Prompt")
- [x] **Custom UI**: Create a "Soft Prompt" screen that appears after pet naming or the first study session.
- [x] **Copywriting**: Use pet-centric language (e.g., "Do you want me to remind you when we're close to a new stage?").
- [x] **Analytics**: Track "Soft Prompt" conversion rates to optimize timing.

### Phase 3: The "Smart Engine" (Supabase)
- [x] **Edge Function**: Create a `scheduled-reminders` Supabase Edge Function.
- [x] **Aggregation Logic**: 
    - Query `profiles` for active push tokens.
    - Query `notebooks` to find the most recent/active subject.
    - Query `pet_states` for the pet's name and current stage.
    - Query `study_sessions` to determine the user's preferred time of day.
- [ ] **Expo Push API Integration**: Securely send notification batches to Expo's Push Service.

### Phase 4: Content & Personality
- [ ] **Template Library**: Define categories for messages:
    - *Subject-Specific*: "Your {NotebookTitle} notes are getting dusty..."
    - *Streak-Specific*: "Day {StreakCount}! We're so close to a record!"
    - *Pet-Specific*: "{PetName} misses you. A quick session would make my day."
- [ ] **Frequency Caps**: Implement "Anti-Spam" logic (e.g., no more than 1 per day, "Ghosting" inactive users after 3 ignored pings).

---

## 4. Success Metrics
- **D1/D7 Retention**: Measure the increase in returning users.
- **Streak Length**: Average increase in daily streaks.
- **Open Rate**: Percentage of users tapping on notebook-specific vs. generic notifications.
