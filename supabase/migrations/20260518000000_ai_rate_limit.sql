-- Per-user AI usage rate limiting.
--
-- A single counter row per (user, bucket). Each AI server function calls
-- public.consume_ai_rate_limit() before talking to Gemini. The function is
-- SECURITY DEFINER and scopes everything to auth.uid(), so the table itself is
-- not directly reachable by clients (RLS on, no policies).

CREATE TABLE public.ai_usage_counters (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, bucket)
);

ALTER TABLE public.ai_usage_counters ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only the SECURITY DEFINER function below may touch it.

-- Atomic fixed-window check-and-increment. Returns:
--   { allowed: bool, remaining: int, reset_seconds: int }
CREATE OR REPLACE FUNCTION public.consume_ai_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  now_ts timestamptz := now();
  rec public.ai_usage_counters%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'reset_seconds', p_window_seconds);
  END IF;

  INSERT INTO public.ai_usage_counters (user_id, bucket, window_start, count)
  VALUES (uid, p_bucket, now_ts, 0)
  ON CONFLICT (user_id, bucket) DO NOTHING;

  -- Row-lock this user's bucket so concurrent requests can't race the counter.
  SELECT * INTO rec
  FROM public.ai_usage_counters
  WHERE user_id = uid AND bucket = p_bucket
  FOR UPDATE;

  -- Roll the window over if it has expired.
  IF now_ts - rec.window_start >= make_interval(secs => p_window_seconds) THEN
    rec.window_start := now_ts;
    rec.count := 0;
  END IF;

  IF rec.count >= p_limit THEN
    UPDATE public.ai_usage_counters
    SET window_start = rec.window_start, count = rec.count
    WHERE user_id = uid AND bucket = p_bucket;

    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_seconds', GREATEST(0, CEIL(p_window_seconds - EXTRACT(EPOCH FROM (now_ts - rec.window_start))))
    );
  END IF;

  rec.count := rec.count + 1;
  UPDATE public.ai_usage_counters
  SET window_start = rec.window_start, count = rec.count
  WHERE user_id = uid AND bucket = p_bucket;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', p_limit - rec.count,
    'reset_seconds', GREATEST(0, CEIL(p_window_seconds - EXTRACT(EPOCH FROM (now_ts - rec.window_start))))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_rate_limit(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_rate_limit(text, integer, integer) TO authenticated;
