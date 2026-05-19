-- Fix missing user_id foreign key constraints on tables that had RLS but no FK.
-- Without the FK, deleting a user from auth.users would leave orphaned rows.

ALTER TABLE public.study_tasks
  ADD CONSTRAINT study_tasks_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.flashcard_sets
  ADD CONSTRAINT flashcard_sets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.tests
  ADD CONSTRAINT tests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
