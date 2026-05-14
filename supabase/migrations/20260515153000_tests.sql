CREATE TABLE public.tests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  topic text NOT NULL,
  mode text NOT NULL,
  questions jsonb NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluation jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tests" ON public.tests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tests" ON public.tests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own tests" ON public.tests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own tests" ON public.tests FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_tests_user ON public.tests(user_id, created_at DESC);

CREATE TRIGGER update_tests_updated_at
BEFORE UPDATE ON public.tests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
