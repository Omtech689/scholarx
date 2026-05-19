-- Fix missing user_id foreign key constraints on tables that had RLS but no FK.
-- Without the FK, deleting a user from auth.users would leave orphaned rows.
--
-- Before adding each constraint, delete any orphaned rows whose user_id no
-- longer exists in auth.users (e.g. test accounts, deleted users). Also drop
-- the constraint first in case this migration was partially applied.

DELETE FROM public.study_tasks
  WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.flashcard_sets
  WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.tests
  WHERE user_id NOT IN (SELECT id FROM auth.users);

ALTER TABLE public.study_tasks
  DROP CONSTRAINT IF EXISTS study_tasks_user_id_fkey;
ALTER TABLE public.study_tasks
  ADD CONSTRAINT study_tasks_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.flashcard_sets
  DROP CONSTRAINT IF EXISTS flashcard_sets_user_id_fkey;
ALTER TABLE public.flashcard_sets
  ADD CONSTRAINT flashcard_sets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.tests
  DROP CONSTRAINT IF EXISTS tests_user_id_fkey;
ALTER TABLE public.tests
  ADD CONSTRAINT tests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
