CREATE TABLE IF NOT EXISTS public.flashcard_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own decks"   ON public.flashcard_decks;
DROP POLICY IF EXISTS "Users insert own decks" ON public.flashcard_decks;
DROP POLICY IF EXISTS "Users update own decks" ON public.flashcard_decks;
DROP POLICY IF EXISTS "Users delete own decks" ON public.flashcard_decks;

CREATE POLICY "Users view own decks"   ON public.flashcard_decks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own decks" ON public.flashcard_decks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own decks" ON public.flashcard_decks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own decks" ON public.flashcard_decks FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS flashcard_decks_user_idx ON public.flashcard_decks(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own flashcards"   ON public.flashcards;
DROP POLICY IF EXISTS "Users insert own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users delete own flashcards" ON public.flashcards;

CREATE POLICY "Users view own flashcards"   ON public.flashcards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own flashcards" ON public.flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own flashcards" ON public.flashcards FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS flashcards_deck_idx ON public.flashcards(deck_id, created_at);

DROP TRIGGER IF EXISTS update_flashcard_decks_updated_at ON public.flashcard_decks;
CREATE TRIGGER update_flashcard_decks_updated_at
  BEFORE UPDATE ON public.flashcard_decks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
