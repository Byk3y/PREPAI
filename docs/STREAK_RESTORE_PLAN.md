# Streak Ending & Restore Implementation Plan

## Overview
Implement a "Streak Restore" system that provides users with a safety net of 3 restores per month if they miss a day. Also fixes reliability bugs in the current streak tracking system.

---

## Phase 1: Database & Backend (Supabase)

### 1.1 Schema Updates
- **Update `profiles` table**:
    - Add `streak_restores` (int, default 3) - Current available restores.
    - Add `last_restore_reset` (text, e.g., '202512') - Tracks the month/year of the last refill.
- **Migration 043**: Create migration to add these columns.

### 1.2 Improve `increment_streak` RPC
- **Add Monthly Reset**: Logic to check if `NOW()` is a new month compared to `last_restore_reset`. If so, set `streak_restores = 3`.
- **Enhanced Return Object**: Return `is_restorable: true` and `previous_streak` when a streak is reset to 1. 
- **Timezone Awareness**: Ensure today's date is calculated correctly in the user's timezone.

### 1.3 Create `restore_streak` RPC
- **Input**: `p_user_id` (UUID).
- **Logic**:
    1. Verify `streak_restores > 0`.
    2. Read `meta->'last_recoverable_streak'` (or similar field stored during reset).
    3. Restore `streak` to that value + 1 (for today).
    4. Decrement `streak_restores`.
    5. Update `last_streak_date` to today.
- **Return**: `{ success: true, new_streak: N, restores_left: M }`.

---

## Phase 2: Frontend Logic (Zustand & Hooks)

### 2.1 Fix `useStreakCheck` Reliability
- **AppState Listener**: Add `AppState` listener to re-run `checkStreak` when the app moves from `background` -> `active`.
- **Force Check Flag**: Ensure logic handles the case where the app stayed open past midnight.
- **Retry Logic**: Don't set `hasCheckedRef.current = true` if the network call fails.

### 2.2 Update `userSlice` / `userService`
- **Expose Restores**: Add `streak_restores` and `last_restore_reset` to the `User` type and `loadUserProfile` select.
- **Restore Action**: Add `restoreStreak()` action that calls the new RPC and updates the store.

---

## Phase 3: UI/UX Implementation

### 3.1 The "Streak Savior" Modal
- **Purpose**: High-impact intervention when a streak has just "ended".
- **Design Elements**:
    - "Frozen flame" visuals (Blue/Ice theme).
    - Clear value proposition: *"Don't lose your 15-day streak!"*
    - Remaining restores counter (e.g., "3 of 3 shields remaining").
    - Button: **"Use Restore"** (uses one restore, sets streak back).
    - Button: **"Start from 1"** (closes modal, resets to 1).

### 3.2 Pet Sheet Integration
- **Restore Shield Badge**: Add a small shield icon in `PetDisplay.tsx` next to the streak number.
    - Tooltip or prompt: *"3 monthly restores available"*.
- **Safety Net Info**: Add a section in `StreakBadges.tsx` or `PetInfo.tsx` explaining how restores work.

---

## Phase 4: Bug Fixes & Refinement

### 4.1 Fix "Double Reward" Bug
- Update task awarding logic to ensure `maintain_streak` point is NOT awarded if the streak was just reset (unless/until it is restored).

### 4.2 Edge Case Handling
- Handle "EndOfMonth" edge cases for restore resets.
- Ensure "Streak Savior" only appears once per reset event.

---

## Implementation Checklist
- [ ] Database Migration (Schema + RPC updates)
- [ ] AppState support in `useStreakCheck`
- [ ] `restore_streak` RPC & Store integration
- [ ] "Streak Savior" Modal Component
- [ ] Pet Sheet "Restore Shield" Badge
- [ ] Testing with manual system clock changes
