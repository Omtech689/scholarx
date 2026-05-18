-- Feature batch:
--  1. Chat personalization fields on profiles
--  2. DB-backed spaced repetition on flashcards (was localStorage-only)
--  3. documents table — AI study guides + research reports (markdown)
--  4. messages.image_path — chat images moved to Supabase Storage
--  5. chat-images storage bucket + per-user RLS

-- 1. Personalization -------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grade_level       text,
  ADD COLUMN IF NOT EXISTS learning_style    text,
  ADD COLUMN IF NOT EXISTS explanation_tone  text,
  ADD COLUMN IF NOT EXISTS study_goals       text,
  ADD COLUMN IF NOT EXISTS interests         text;

-- 2. Spaced repetition (SM-2) on flashcards --------------------------------
-- Defaults match the previous client SM-2 seed ({ ease: 2.5, interval: 0 }).
-- due_at NULL = never reviewed → always due.
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS ease             real        NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS interval_days    integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repetitions      integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_at           timestamptz,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_flashcards_set_due ON public.flashcards(set_id, due_at);

-- 3. documents: AI-generated study guides & research reports ---------------
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('study_guide','research')),
  title text NOT NULL,
  topic text,
  content text NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own documents"   ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_documents_user ON public.documents(user_id, kind, created_at DESC);

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Chat images in Storage instead of base64 in the messages table --------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_path text;

-- 5. chat-images bucket (private; served via short-lived signed URLs) ------
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', false)
ON CONFLICT (id) DO NOTHING;

-- Object path convention: "<user_id>/<conversation_id>/<uuid>.jpg"
-- so foldername(name)[1] is the owning user's id.
CREATE POLICY "Users read own chat images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users upload own chat images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own chat images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);
