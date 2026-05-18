// Shared per-user AI rate limiting. Each AI server function calls
// enforceRateLimit() with the request-scoped Supabase client from
// requireSupabaseAuth's context (so auth.uid() inside the SQL function
// resolves to the calling user).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export type RateCheck = { bucket: string; limit: number; windowSeconds: number };

type RateResult = { allowed: boolean; remaining: number; reset_seconds: number };

function humanizeWindow(seconds: number): string {
  if (seconds >= 86400) return `${Math.round(seconds / 86400)} day(s)`;
  if (seconds >= 3600) return `${Math.round(seconds / 3600)} hour(s)`;
  if (seconds >= 60) return `${Math.round(seconds / 60)} minute(s)`;
  return `${seconds} second(s)`;
}

/**
 * Runs each check in order. Returns null when every check passes, or a
 * user-facing message describing when to retry on the first failure.
 *
 * Fails open on infrastructure errors (e.g. the RPC/migration is missing) so a
 * limiter outage never blocks the whole app — it just stops protecting until
 * fixed. Errors are logged for visibility.
 */
export async function enforceRateLimit(
  supabase: SupabaseClient<Database>,
  checks: RateCheck[],
): Promise<string | null> {
  for (const check of checks) {
    const { data, error } = await supabase.rpc("consume_ai_rate_limit", {
      p_bucket: check.bucket,
      p_limit: check.limit,
      p_window_seconds: check.windowSeconds,
    });

    if (error) {
      console.error("[rate-limit] RPC error (failing open):", check.bucket, error.message);
      continue;
    }

    const result = data as unknown as RateResult | null;
    if (result && !result.allowed) {
      const retryIn = result.reset_seconds > 0 ? humanizeWindow(result.reset_seconds) : "a moment";
      return `You've hit the usage limit. Please try again in ${retryIn}.`;
    }
  }
  return null;
}

// Sensible defaults: a per-endpoint burst cap plus a shared daily cap across
// all AI features, so total Gemini spend per user per day is bounded.
export const DAILY_AI_CAP: RateCheck = { bucket: "ai:day", limit: 250, windowSeconds: 86400 };
export const RATE_LIMITS = {
  chat: [{ bucket: "chat:min", limit: 20, windowSeconds: 60 }, DAILY_AI_CAP],
  flashcards: [{ bucket: "flash:min", limit: 8, windowSeconds: 60 }, DAILY_AI_CAP],
  test: [{ bucket: "test:min", limit: 8, windowSeconds: 60 }, DAILY_AI_CAP],
  evaluate: [{ bucket: "eval:min", limit: 10, windowSeconds: 60 }, DAILY_AI_CAP],
} satisfies Record<string, RateCheck[]>;
