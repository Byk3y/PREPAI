Here is the complete task_definitions_spec.md — clean, structured, and ready for Cursor.
No SQL, no code — just the authoritative task definition source.

⸻

task_definitions_spec.md

Brigo — Task Definitions Specification

Stage 1 MVP • Authoritative Source for Task System

This document defines all tasks in Brigo's Stage 1 MVP.
It is the source of truth for:
	•	Seeding the pet_tasks table
	•	Implementing task triggers
	•	Validating when a task is completed
	•	Awarding points
	•	Rendering task lists in the UI

All task logic must match this specification exactly.
No additional tasks should exist in the database for MVP.

⸻

1. Task Categories

Brigo has two types of tasks:

✔️ Foundational Tasks
	•	One-time tasks
	•	Teach the user how Brigo works
	•	Visible only while incomplete
	•	Always visible during Stage 1
	•	If user enters Stage 2 without completing them → tasks remain visible until completed

✔️ Daily Tasks
	•	Reset every midnight (server timezone, see Section 8)
	•	User receives three daily tasks, chosen via deterministic algorithm (see Section 7)
	•	Completing a daily task awards points once per day
	•	Completed tasks show a ✓ and stay visible until the next daily reset

⸻

2. Foundational Task Definitions

These appear only during Stage 1 until completed.

⸻

🟦 Task 1 — Name Your Pet

task_key: name_pet
task_type: foundational
title: Name your pet
description: Edit your pet's name in the Grow Your Pet bottom sheet.
points: 1 point
trigger_event: pet_name_updated
display_order: 10
validation_logic:
	•	When user updates pet name and new value ≠ old value
	•	Task becomes permanently completed
	•	Server-side check: compare pet_states.name before and after update

appearance_rules:
	•	Visible only if incomplete
	•	Visible in Stage 1 only

testing_checklist:
	•	Simulate: Update pet name from "Pet" to "Fluffy"
	•	Assert: Task marked complete, 1 point awarded, completion record created
	•	Simulate: Update pet name to same value (no change)
	•	Assert: Task not completed, no points awarded

⸻

🟦 Task 2 — Add Study Material

task_key: add_material
task_type: foundational
title: Add your first study material
description: Add a PDF, image, link, text, or audio.
points: 1 point
trigger_event: material_created
display_order: 20
validation_logic:
	•	Server-side check: Query materials table for user_id
	•	Award when user has at least one material row for any notebook
	•	Not strictly tied to notebook creation time — materials can be added after notebook creation
	•	Check runs on material insert/update trigger or periodic validation
	•	Task becomes permanently completed once condition is met

appearance_rules:
	•	Visible until completed
	•	Visible even if user reaches Stage 2 early

testing_checklist:
	•	Simulate: Create notebook, then add first material
	•	Assert: Task marked complete, 1 point awarded
	•	Simulate: Create notebook without materials, then add material later
	•	Assert: Task completes when material is added (not at notebook creation)
	•	Simulate: User already has materials from before task system
	•	Assert: Task auto-completes on first check

⸻

🟦 Task 3 — Generate Your First Podcast

task_key: generate_audio_overview
task_type: foundational
title: Generate your first podcast
description: Use the Studio to generate a podcast for any notebook.
points: 2 points
trigger_event: audio_overview_completed
display_order: 30
validation_logic:
	•	When an audio overview job enters completed status
	•	Only first completion counts for this task
	•	Server checks podcast_jobs table for user's first completed job

appearance_rules:
	•	Visible only if incomplete

testing_checklist:
	•	Simulate: Generate podcast, wait for job completion
	•	Assert: Task marked complete, 2 points awarded
	•	Simulate: Generate second podcast
	•	Assert: Task remains completed, no additional points
	•	Simulate: Job fails or is cancelled
	•	Assert: Task not completed, no points awarded

⸻

3. Daily Task Definitions

Daily tasks encourage consistent usage and studying.
Every day, user receives three tasks:
	•	one "hero" task (worth 4 points)
	•	two small tasks (worth 1 or 2 points)

Daily tasks reset at server midnight (see Section 8 for timezone handling).

⸻

🟩 Task 4 — Study 5 Flashcards

task_key: study_flashcards
task_type: daily
title: Study 5 flashcards
description: Complete any 5 flashcards inside Studio.
points: 1 point
trigger_event: flashcard_completed
display_order: 30
validation_logic:
	•	Count flashcards completed today (via flashcard_completions table)
	•	Filter by user_id and completion_date = today (server timezone)
	•	When count ≥ 5 → complete task
	•	Progress updates in real-time as each flashcard is completed

appearance_rules:
	•	Resets daily
	•	Shows live progress counter (e.g., "3/5 flashcards")
	•	Progress updates immediately after each flashcard completion

testing_checklist:
	•	Simulate: Complete 4 flashcards
	•	Assert: Task shows "4/5 flashcards", not completed
	•	Simulate: Complete 5th flashcard
	•	Assert: Task marked complete, 1 point awarded
	•	Simulate: Complete 6th flashcard same day
	•	Assert: Task remains completed, no duplicate points
	•	Simulate: Next day, complete 1 flashcard
	•	Assert: Task resets, shows "1/5 flashcards"

⸻

🟩 Task 5 — Study for 15 Minutes

task_key: study_15_minutes
task_type: daily
title: Study for 15 minutes
description: Stay in study mode for 15 minutes combined.
points: 2 points
trigger_event: study_session_updated
display_order: 20
validation_logic:
	•	Using study_sessions table
	•	Sum of durations for today (completion_date = today, server timezone) ≥ 900 seconds
	•	Progress calculated from sum of all session durations today
	•	Task completes when threshold is reached

appearance_rules:
	•	Resets daily
	•	Shows live progress indicator (e.g., "8/15 minutes" or "12:30 / 15:00")
	•	Progress updates when study sessions are recorded

testing_checklist:
	•	Simulate: Study for 10 minutes
	•	Assert: Task shows "10/15 minutes", not completed
	•	Simulate: Study for additional 5 minutes (total 15)
	•	Assert: Task marked complete, 2 points awarded
	•	Simulate: Multiple short sessions totaling 15 minutes
	•	Assert: Task completes when sum reaches 15 minutes
	•	Simulate: Study 20 minutes in one session
	•	Assert: Task completes at 15 minutes, shows "15/15 minutes"

⸻

🟩 Task 6 — Listen to a Podcast

task_key: listen_audio_overview
task_type: daily
title: Listen to a podcast
description: Play any generated podcast.
points: 1 point
trigger_event: audio_playback_started
display_order: 40
validation_logic:
	•	When user presses play on any podcast (first play of the day)
	•	No minimum seconds required for MVP
	•	Server records first playback event per day (completion_date = today)
	•	Future enhancement: Configurable minimum play duration (e.g., 30 seconds) can be added later

appearance_rules:
	•	Resets daily
	•	Binary completion (no partial progress shown)
	•	Shows as incomplete or complete only

testing_checklist:
	•	Simulate: Press play on podcast
	•	Assert: Task marked complete immediately, 1 point awarded
	•	Simulate: Press play again same day
	•	Assert: Task remains completed, no duplicate points
	•	Simulate: Press play next day
	•	Assert: Task resets, completes again on first play
	•	Note: MVP does not require minimum playback duration

⸻

🟩 Task 7 — Maintain Daily Streak (Hero Task)

task_key: maintain_streak
task_type: daily
title: Maintain your daily streak
description: Earn streak credit by opening the app today.
points: 4 points
trigger_event: streak_incremented
display_order: 10
validation_logic:
	•	Profiles table updates streak value
	•	Only award when streak = previous_streak + 1 (increment)
	•	Do NOT award on streak resets (when streak goes from N to 1)
	•	Server checks: new_streak = old_streak + 1 before awarding
	•	Task completes automatically when valid increment occurs

appearance_rules:
	•	Auto-completes if streak increment happens
	•	Resets daily
	•	Marked as hero task in UI (4 points)
	•	Binary completion (no partial progress)

testing_checklist:
	•	Simulate: Open app, streak increases from 5 to 6
	•	Assert: Task marked complete, 4 points awarded
	•	Simulate: Streak resets from 10 to 1 (missed day)
	•	Assert: Task not completed, no points awarded
	•	Simulate: Streak stays same (already opened today)
	•	Assert: Task not completed, no points awarded
	•	Simulate: Next day, streak increments from 1 to 2
	•	Assert: Task completes, 4 points awarded

⸻

4. Task Metadata Schema (Canonical Definition)

All tasks must contain the following fields:

{
  id: UUID,                            // Generated by database
  task_key: string,                    // Unique identifier (canonical list below)
  task_type: 'foundational' | 'daily',
  title: string,
  description: string,
  points: number,                      // 1, 2, or 4
  trigger_event: string,               // See trigger-event mapping (canonical list below)
  display_order: number | null,        // Suggested values provided in task definitions
  created_at: timestamp,
  updated_at: timestamp
}

Canonical Task Keys:
	•	name_pet
	•	add_material
	•	generate_audio_overview
	•	study_flashcards
	•	study_15_minutes
	•	listen_audio_overview
	•	maintain_streak

Canonical Trigger Events:
	•	pet_name_updated
	•	material_created
	•	audio_overview_completed
	•	flashcard_completed
	•	study_session_updated
	•	audio_playback_started
	•	streak_incremented

⸻

5. Trigger Events Overview

trigger_event	Fired When…
pet_name_updated	User edits pet name (new value ≠ old value)
material_created	A material row is created for any notebook (user has at least one material)
podcast_completed	Podcast job enters completed status
flashcard_completed	User completes a flashcard (counted in flashcard_completions)
study_session_updated	Study timer records session duration (summed for daily total)
podcast_playback_started	User presses play on any podcast (first play of day)
streak_incremented	User opens app & streak increases by exactly 1 (not reset)

The engineering guide will map these to functions (File 3).

⸻

6. Task Behavior Rules (Global)

✔️ Awarding Points
	•	Must be atomic (points added + completion recorded together)
	•	Must check for existing completion to prevent duplicates
	•	Server ensures points cannot go negative (see Section 9: Edge Cases)

✔️ Foundational Tasks
	•	Complete once
	•	Never reappear after completion
	•	Visible until completed (even in Stage 2)

✔️ Daily Tasks
	•	Reset at server midnight (see Section 8)
	•	Show progress counters when needed (see Section 10)
	•	Show ✓ once completed
	•	Award points only once per day per task

⸻

7. Daily Task Selection Algorithm

Every day, each user receives exactly three daily tasks selected deterministically:

Selection Rules:
	1.	Always include hero task (maintain_streak) if eligible
		•	Eligible if task exists and user hasn't completed it today
	2.	Pick 2 additional tasks from pool: [study_15_minutes, study_flashcards, listen_audio_overview]
		•	Use deterministic rotation seeded by hash(user_id + date)
		•	Date format: YYYY-MM-DD in server timezone
		•	Hash function: Use consistent hash (e.g., SHA256 or simple modulo)
		•	Rotation ensures variety while being predictable for testing
	3.	If fewer than 3 tasks are eligible:
		•	Show all eligible tasks (may be 1 or 2 tasks)
		•	Do not duplicate tasks
		•	If no tasks eligible, show empty daily task list

Example Selection Logic (pseudocode):
	eligible_tasks = [maintain_streak, study_15_minutes, study_flashcards, listen_audio_overview]
	selected = []
	
	if maintain_streak in eligible_tasks:
		selected.append(maintain_streak)
	
	remaining_pool = [study_15_minutes, study_flashcards, listen_audio_overview]
	seed = hash(user_id + date_string)
	selected.append(select_from_pool(remaining_pool, seed, count=2))
	
	return selected (up to 3 tasks)

⸻

8. Timezone Policy

Server-Authoritative Timezone Handling:

	•	Primary: Use profiles.timezone (IANA timezone string, e.g., "America/New_York")
	•	Fallback: If profiles.timezone is NULL or invalid, use device-reported timezone from client
	•	Server computes completion_date using the determined timezone
	•	completion_date = DATE in the user's timezone (not UTC date)

How to Compute completion_date:
	1.	Get current timestamp (UTC)
	2.	Convert to user's timezone (from profiles.timezone or device fallback)
	3.	Extract DATE component in that timezone
	4.	Use that DATE as completion_date

Example:
	•	User in "America/New_York" (UTC-5)
	•	UTC timestamp: 2024-01-15 04:30:00 UTC
	•	Local time: 2024-01-14 23:30:00 EST
	•	completion_date: 2024-01-14 (not 2024-01-15)

Daily Reset:
	•	Daily tasks reset when server date (in user's timezone) changes
	•	Midnight in user's timezone triggers reset
	•	Foundational tasks are not affected by daily reset

⸻

9. Edge Cases

Negative Points Protection:
	•	Server must ensure pet_states.current_points cannot go negative
	•	If a calculation would result in negative points, clamp to 0
	•	This protects against edge cases in point calculations or data inconsistencies
	•	Example: If user has 5 points and system attempts to subtract 10, result is 0 (not -5)

Task Completion Duplicates:
	•	Unique constraint on (user_id, task_id, completion_date) prevents duplicate completions
	•	Server must check for existing completion before awarding points
	•	If duplicate completion attempt detected, log warning but do not award points again

Missing Timezone:
	•	If profiles.timezone is NULL and device timezone unavailable, default to UTC
	•	Log warning for missing timezone data

Task Selection Edge Cases:
	•	If maintain_streak task is disabled or missing, select 3 tasks from remaining pool
	•	If fewer than 3 daily tasks exist in database, show all available tasks
	•	If user completes all daily tasks before reset, show empty list until next day

⸻

10. UI Progress Reporting

Tasks display different progress indicators based on type:

Foundational Tasks:
	•	Binary display: Incomplete (empty checkbox) or Complete (✓ checkmark)
	•	No partial progress shown

Daily Tasks with Progress Counters:
	•	study_flashcards: Live counter "X/5 flashcards" (updates after each completion)
	•	study_15_minutes: Live progress "X/15 minutes" or time format "MM:SS / 15:00"
	•	Both update in real-time as user progresses

Daily Tasks with Binary Display:
	•	listen_audio_overview: Incomplete or Complete only (no counter)
	•	maintain_streak: Incomplete or Complete only (no counter)
	•	Both show ✓ when completed, no partial state

Progress Update Frequency:
	•	Counters update immediately after trigger event (flashcard completed, session recorded)
	•	UI should poll or use real-time subscriptions to reflect latest progress
	•	Server calculates progress on-demand when task list is requested

⸻

11. Future Proofing (Not part of MVP)

The system is designed so that future tasks may include:
	•	difficulty levels
	•	weekly tasks
	•	experience multipliers
	•	emotional state tasks
	•	Minimum playback duration for audio tasks (configurable per task)
None of these should affect the MVP implementation.

⸻

🎉 End of task_definitions_spec.md
