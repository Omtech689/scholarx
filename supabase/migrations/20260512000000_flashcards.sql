CREATE TABLE public.flashcard_sets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  topic text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.flashcards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id uuid NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own flashcard sets" ON public.flashcard_sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own flashcard sets" ON public.flashcard_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own flashcard sets" ON public.flashcard_sets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own flashcard sets" ON public.flashcard_sets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users view own flashcards" ON public.flashcards FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.flashcard_sets s WHERE s.id = set_id AND s.user_id = auth.uid())
);
CREATE POLICY "Users insert own flashcards" ON public.flashcards FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.flashcard_sets s WHERE s.id = set_id AND s.user_id = auth.uid())
);
CREATE POLICY "Users update own flashcards" ON public.flashcards FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.flashcard_sets s WHERE s.id = set_id AND s.user_id = auth.uid())
);
CREATE POLICY "Users delete own flashcards" ON public.flashcards FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.flashcard_sets s WHERE s.id = set_id AND s.user_id = auth.uid())
);

CREATE INDEX idx_flashcard_sets_user ON public.flashcard_sets(user_id, created_at DESC);
CREATE INDEX idx_flashcards_set ON public.flashcards(set_id, sort_order);

CREATE TRIGGER update_flashcard_sets_updated_at
BEFORE UPDATE ON public.flashcard_sets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
