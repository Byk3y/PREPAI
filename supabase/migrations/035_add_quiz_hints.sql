-- Add hint column for pre-generated, low-cost hints
alter table public.studio_quiz_questions
  add column if not exists hint text;

-- Optional: index to find questions missing hints (useful for backfill)
create index if not exists studio_quiz_questions_hint_null_idx
  on public.studio_quiz_questions (quiz_id)
  where hint is null;

