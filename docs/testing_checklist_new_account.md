# Testing Checklist: New Account Flow

This checklist helps you verify that all pet growth features work correctly with a fresh account.

## Prerequisites

1. **Create a new account** in the app (use a different email than your existing account)
2. **Sign in** with the new account
3. **Verify initial state**: Streak should be 0, no tasks completed

---

## Test Flow

### ✅ 1. Initial App Open (Streak Increment)

**Expected Behavior:**
- App opens → `useStreakCheck` hook runs automatically
- Streak increments from 0 → 1
- "Maintain your daily streak" task (4 points) should be awarded automatically
- Streak display should show "1"

**How to Test:**
1. Open the app with new account
2. Wait 1-2 seconds for initialization
3. Open pet sheet (half-sheet modal)
4. Check "Streak days" display at top
5. Check "Grow your Pet" section - "Maintain your daily streak" should show ✓

**Verification:**
- [ ] Streak shows "1" in UI
- [ ] "Maintain your daily streak" task has checkmark
- [ ] Pet points increased by 4 (check progress bar)

---

### ✅ 2. Name Your Pet (Foundational Task)

**Expected Behavior:**
- User edits pet name from default ("Nova" or "Pet")
- "Name your pet" task (1 point) should be awarded
- Task disappears from foundational tasks list after completion

**How to Test:**
1. Open pet sheet
2. Click pencil icon next to pet name
3. Change name to something custom (e.g., "Fluffy")
4. Press Enter or blur the input

**Verification:**
- [ ] Pet name updates in UI
- [ ] "Name your pet" task shows checkmark
- [ ] Task disappears from foundational tasks (only shows if incomplete)
- [ ] Pet points increased by 1

---

### ✅ 3. Add Your First Study Material (Foundational Task)

**Expected Behavior:**
- User creates a notebook and adds material
- "Add your first study material" task (1 point) should be awarded
- Task disappears after completion

**How to Test:**
1. Create a new notebook
2. Add any material (PDF, text, etc.)
3. Wait for material to process
4. Open pet sheet

**Verification:**
- [ ] "Add your first study material" task shows checkmark
- [ ] Task disappears from foundational tasks
- [ ] Pet points increased by 1

---

### ✅ 4. Generate Your First Audio Overview (Foundational Task)

**Expected Behavior:**
- User generates an audio overview for a notebook
- "Generate your first audio overview" task (2 points) should be awarded
- Task disappears after completion

**How to Test:**
1. Open a notebook with materials
2. Generate audio overview
3. Wait for generation to complete
4. Open pet sheet

**Verification:**
- [ ] "Generate your first audio overview" task shows checkmark
- [ ] Task disappears from foundational tasks
- [ ] Pet points increased by 2

---

### ✅ 5. Study for 15 Minutes (Daily Task)

**Expected Behavior:**
- User studies for cumulative 15 minutes (900 seconds) in a day
- "Study for 15 minutes" task (2 points) should be awarded
- Progress should show time accumulated

**How to Test:**
1. Open a notebook
2. Start study timer (should auto-start when viewing content)
3. Study for 15+ minutes (or test with shorter sessions that sum to 15 min)
4. Open pet sheet

**Verification:**
- [ ] "Study for 15 minutes" task shows progress (e.g., "10/15 min")
- [ ] Task shows checkmark when 15 minutes reached
- [ ] Pet points increased by 2

---

### ✅ 6. Listen to an Audio Overview (Daily Task)

**Expected Behavior:**
- User plays an audio overview
- "Listen to an audio overview" task (1 point) should be awarded
- Only awards once per day

**How to Test:**
1. Open a notebook with completed audio overview
2. Press play on audio player
3. Let it play for a few seconds
4. Open pet sheet

**Verification:**
- [ ] "Listen to an audio overview" task shows checkmark
- [ ] Pet points increased by 1

---

### ✅ 7. Study Flashcards (Daily Task)

**Expected Behavior:**
- User completes flashcards in a notebook
- "Study flashcards" task (2 points) should be awarded
- Progress should show cards completed

**How to Test:**
1. Open a notebook with flashcards
2. Complete some flashcards
3. Open pet sheet

**Verification:**
- [ ] "Study flashcards" task shows progress (e.g., "5/10 cards")
- [ ] Task shows checkmark when threshold reached
- [ ] Pet points increased by 2

---

### ✅ 8. Task Selection Logic (Display Only 3 Tasks)

**Expected Behavior:**
- Pet sheet should show exactly 3 tasks at a time
- One task worth 1 point
- One task worth 2 points
- One task worth 4 points
- Tasks ordered by points (1, 2, 4)
- Foundational tasks prioritized over daily tasks

**How to Test:**
1. Complete some foundational tasks
2. Open pet sheet
3. Count tasks in "Grow your Pet" section

**Verification:**
- [ ] Exactly 3 tasks displayed
- [ ] One task with 1 point
- [ ] One task with 2 points
- [ ] One task with 4 points
- [ ] Tasks sorted by points (ascending)

---

### ✅ 9. Streak Consecutive Days

**Expected Behavior:**
- Opening app on consecutive days increments streak
- Missing a day resets streak to 1

**How to Test:**
1. Day 1: Open app → streak = 1
2. Day 2: Open app → streak = 2
3. Day 3: Open app → streak = 3
4. Skip Day 4
5. Day 5: Open app → streak = 1 (reset)

**Verification:**
- [ ] Streak increments on consecutive days
- [ ] Streak resets after missing a day
- [ ] "Maintain your daily streak" task awards 4 points each day

---

### ✅ 10. Points and Stage Progression

**Expected Behavior:**
- Points accumulate as tasks are completed
- Stage increases every 100 points
- Progress bar shows points within current stage

**How to Test:**
1. Complete multiple tasks
2. Check pet points total
3. Verify stage calculation (floor(points / 100) + 1)
4. Check progress bar

**Verification:**
- [ ] Points accumulate correctly
- [ ] Stage increases at 100, 200, 300 points, etc.
- [ ] Progress bar shows correct percentage
- [ ] "X points to unlock the next look" shows correct value

---

## Common Issues to Watch For

### ❌ Streak stays at 0
- **Cause**: `increment_streak` function not called or failed
- **Check**: Console logs for `[StreakCheck]` messages
- **Fix**: Verify `useStreakCheck` hook is imported in `_layout.tsx`

### ❌ Name your pet task doesn't complete
- **Cause**: Using `setPetState` instead of `updatePetName`
- **Check**: Verify `app/pet-sheet.tsx` uses `updatePetName`
- **Fix**: Should already be fixed

### ❌ Tasks not displaying
- **Cause**: RPC functions not found or failing
- **Check**: Console for RPC errors
- **Fix**: Verify migrations are applied

### ❌ Wrong number of tasks displayed
- **Cause**: Task selection logic issue
- **Check**: Verify `hooks/usePetTasks.ts` selection algorithm
- **Fix**: Should show exactly 3 tasks (1, 2, 4 points)

---

## Database Verification Queries

Run these in Supabase SQL editor to verify data:

```sql
-- Check user's streak
SELECT id, name, streak, updated_at::date as last_updated
FROM profiles
WHERE email = 'your-test-email@example.com';

-- Check task completions
SELECT 
  pt.task_key,
  pt.title,
  ptc.completion_date,
  ptc.points_awarded
FROM pet_task_completions ptc
JOIN pet_tasks pt ON ptc.task_id = pt.id
JOIN auth.users u ON ptc.user_id = u.id
WHERE u.email = 'your-test-email@example.com'
ORDER BY ptc.completion_date DESC;

-- Check pet state
SELECT 
  current_points,
  current_stage,
  name
FROM pet_states
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-test-email@example.com');
```

---

## Success Criteria

All tests pass if:
- ✅ Streak increments correctly on app open
- ✅ All foundational tasks complete and disappear
- ✅ Daily tasks reset at midnight
- ✅ Exactly 3 tasks displayed (1, 2, 4 points)
- ✅ Points accumulate correctly
- ✅ Stage increases every 100 points
- ✅ No console errors

---

## Notes

- **Timezone**: All date calculations use server timezone (UTC by default)
- **Idempotency**: Tasks can be checked multiple times safely (won't award twice)
- **Race Conditions**: Database handles concurrent requests safely
- **Performance**: Task checks are async and don't block UI

