engineering_implementation_guide.md

👉 Engineering Implementation & Best Practices Guide

Brigo — Pet Growth System (Stage 1 MVP)

This guide explains how the system should be built, the expected behaviors, architectural patterns, and the best practices Claude should follow when implementing code.
It is the engineering companion to the PRD and task definitions spec.

This document must be treated as the single source of truth for implementation logic.

⸻

1. Core Architecture Overview

The Pet Growth System is built on 4 pillars:

1. Pet State

Stored in pet_states table, updated whenever points change.

2. Task Definitions

Stored in pet_tasks table (seeded once).

3. Task Completion Tracking

Stored in pet_task_completions.

4. Trigger System

Each task listens for an app event (e.g., material created → award points).

All task logic is client-side triggered but validated server-side using Supabase RPC or insert constraints.

⸻

2. Points & Stage Logic (Engineering Rules)

2.1 Total points must be stored, NOT points-per-stage

The app uses total accumulated points, which are divided by 100 to determine stage.

Formula:

stage = Math.floor(points / 100) + 1
pointsInStage = points % 100
pointsToNext = 100 - pointsInStage

2.2 Never allow negative points

If points ever drop below 0 (edge case or bug), clamp:

points = Math.max(0, points)

2.3 UI is always derived from database

Frontend must never calculate stage independently for persistence.
Only display purposes may calculate points % 100.

2.4 current_stage Storage vs Calculation

current_stage is stored in pet_states table for performance and consistency, but it must always match the calculated value:

calculated_stage = FLOOR(current_points / 100) + 1

When updating points, also update current_stage to the calculated value to keep them in sync. The stored value is authoritative for queries, but the calculation is the source of truth for validation.

⸻

3. Task Processing Pipeline

Every task follows a 4-step universal pipeline:

1. Trigger fired

The app fires a local event, e.g.:

material_created
audio_overview_completed
flashcard_completed

2. Validation

The system checks:
	•	Is the task still available?
	•	Has it already been completed today (daily)?
	•	Has it been completed ever (foundational)?
	•	Does this trigger satisfy the criteria?

3. Award & Record (Atomic Transaction)

One atomic operation:
	•	Insert into pet_task_completions
	•	Add points to current_points
	•	Update current_stage = FLOOR((current_points + points_awarded) / 100) + 1

4. UI Refresh

Frontend refetches:
	•	pet_state
	•	today’s task completions

⸻

3.1 RPC Function & Transaction Structure

All task completion logic should be implemented as Supabase RPC functions to ensure atomicity.

Function signature pattern:

CREATE OR REPLACE FUNCTION award_task_points(
  p_user_id UUID,
  p_task_key TEXT,
  p_completion_date DATE
) RETURNS JSONB AS $$
DECLARE
  v_task_id UUID;
  v_points INTEGER;
  v_result JSONB;
BEGIN
  -- 1. Get task details and validate
  -- 2. Check if already completed (idempotency)
  -- 3. Validate trigger-specific criteria
  -- 4. Atomic transaction:
  --    - INSERT INTO pet_task_completions
  --    - UPDATE pet_states SET current_points = current_points + v_points
  -- 5. Return standardized response
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

Transaction handling:
	•	Use BEGIN/COMMIT blocks for multi-step operations
	•	On error, ROLLBACK to prevent partial updates
	•	Both completion record and points update must succeed together

⸻

4. Trigger Implementation (Best Practices)

Each trigger must follow the same rules:

4.1 Trigger functions must be idempotent

Calling a trigger multiple times must not result in multiple point awards.

Achieved through:

UNIQUE(user_id, task_id, completion_date)

4.2 All triggers must be client-side initiated

The app triggers events; Supabase validates and persists.

4.3 If a trigger fires but the task isn’t eligible

The event should simply “no-op” — do not treat it as an error.

⸻

5. Daily Reset Logic

5.1 Daily tasks depend on completion_date

The system resets daily tasks by simply selecting for:

WHERE completion_date = today

5.2 Timezone rules
	•	Primary: Use profiles.timezone (IANA string)
	•	If missing: use device timezone
	•	Server computes:

completion_date = (now() AT TIME ZONE user_timezone)::date

5.3 No cron job required

Reset happens when:
	•	User opens the app
	•	Any task list refresh occurs
	•	A new day is detected

⸻

6. Foundational Tasks Implementation Rules

6.1 Always visible until completed

Even if user reaches Stage 2 early.

6.2 Each is awarded exactly once

Database constraint:

UNIQUE(user_id, task_id, completion_date)

Note: The database constraint includes completion_date for both foundational and daily tasks. For foundational tasks, application logic ensures they are only completed once by checking for any existing completion record before awarding. The constraint prevents duplicate completions on the same day, while application-level checks prevent multiple completions across different days.

6.3 Foundational tasks should feel like onboarding

So UI order must be maintained using:

display_order


⸻

7. Daily Task Selection Algorithm

7.1 Select up to 3 tasks per day

Selection rules:
	1.	maintain_streak always included if eligible (hero task)
	2.	Pick 2 others from the pool if available:
	•	study_15_minutes
	•	study_flashcards
	•	listen_audio_overview
	3.	Fallback behavior:
	•	If fewer than 3 tasks are eligible, show all available (may be 1-2 tasks)
	•	If no tasks eligible, show empty daily task list
	•	Never duplicate tasks in the selection

7.2 Deterministic rotation (no randomness)

Purpose: predictable, fair, and reproducible.

Process:

seed = hash(user_id + current_date)
index = seed % pool.length
Pick tasks in cyclic order

7.3 Selected tasks are NOT stored

Selection is ephemeral:
Tasks appear each day based on rules + completions table.

7.4 Selection Computation Location

Daily task selection is computed server-side via RPC function:
	•	Input: user_id, current_date (in user's timezone)
	•	Output: Array of task_ids (up to 3 tasks)
	•	Logic: Deterministic hash-based selection (see 7.2)
	•	Caching: Can cache per user per day for performance
	•	Client calls this function when rendering the task list

The selection function should:
	•	Check which tasks are eligible (not already completed today)
	•	Apply deterministic selection algorithm
	•	Return task objects with metadata (title, points, progress)

⸻

8. Study Time & Flashcard Progress Tracking

Claude MUST implement these abstractions:

8.1 Flashcard progress

Track each flashcard completion with:

flashcard_completions

Define daily progress:

SELECT count(*) WHERE date = today

8.2 Study session tracking

User-defined session:

start_at
end_at
duration_seconds

Award only when:

SUM(duration_today) >= 15 minutes


⸻

9. Error Handling Rules

9.1 Trigger should NOT throw if task already completed

The correct behavior:
	•	API returns success with metadata (already_completed: true)

9.1.1 Standard RPC Response Format

All task completion RPC functions must return a standardized JSONB response:

Success (new completion):
{
  "success": true,
  "already_completed": false,
  "points_awarded": 2,
  "new_total_points": 15,
  "new_stage": 1
}

Success (already completed):
{
  "success": true,
  "already_completed": true,
  "points_awarded": 0,
  "new_total_points": 15,
  "new_stage": 1
}

Error:
{
  "success": false,
  "error": "Task not found" | "Invalid trigger" | "Database error",
  "error_code": "TASK_NOT_FOUND" | "INVALID_TRIGGER" | "DB_ERROR"
}

9.2 Award failures must rollback atomically

Points and completion must never get out of sync.

9.3 If Supabase returns a constraint violation

Translate into:

Task already completed today


⸻

10. UI Rendering Rules

Tasks must be split visually:
	1.	Foundational tasks (only if incomplete)
	2.	Daily tasks (always 3)

Task UI shows:
	•	Title
	•	Progress (if applicable)
	•	Points (e.g., +2 points)
	•	Checkmark state
	•	Greyed state after completion

⸻

11. Testing Requirements

Claude must write implementation such that the following tests would pass:

11.1 Unit tests
	•	calculateStage(points) results
	•	pointsToNext(points)
	•	progressPercentage(points)
	•	negative points clamped

11.2 Integration tests

Task flows:
	•	Completing foundational tasks once
	•	Daily tasks reset on new date
	•	Flashcard progress accumulation
	•	Study session accumulation
	•	Trigger idempotency
	•	Stage progression at 100, 200, 300 points

11.3 Race condition testing

Awarding points twice at the same moment must only award once.

⸻

12. Claude Implementation Checklist

Claude must verify these before generating code:

12.1 Database alignment
	•	pet_states matches spec
	•	pet_tasks seeded correctly
	•	pet_task_completions unique constraint exists
	•	RLS policies correct

12.2 Trigger clarity

Claude must ask if any trigger is ambiguous.

12.3 No hidden assumptions

Claude must explicitly question anything that is unclear in PRD or spec.

12.4 Client-server separation
	•	Client fires triggers
	•	Server validates
	•	UI reads-only derived state

12.5 Atomic operations required

No multi-step updates without transactions.

⸻

13. Out-of-Scope Rules

Do NOT implement:
	•	animations
	•	emotions
	•	advanced pet interactions
	•	task difficulty scaling
	•	gamified badges
	•	monetization integrations

These belong in later phases.

