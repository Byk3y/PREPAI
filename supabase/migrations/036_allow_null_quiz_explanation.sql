-- Allow quiz explanations to be null (we now use hints instead)
alter table public.studio_quiz_questions
  alter column explanation drop not null,
  alter column explanation set default null;















