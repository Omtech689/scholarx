import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enforceRateLimit, RATE_LIMITS } from "@/integrations/supabase/rate-limit";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SCHOLARX_CHAT_FUNCTION_URL = "https://nozxlljeuswjxqoffrti.supabase.co/functions/v1/scholarx-chat";

// Live (voice) model. The ephemeral-token constraint and the client's
// live.connect() call MUST use the same model id. Override via env if needed.
const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-3.1-flash-live-preview";

const LIVE_SYSTEM_INSTRUCTION =
  "You are a friendly AI homework tutor. Help students learn by walking through problems step by step. Keep answers clear and concise.";

/**
 * Mints a short-lived, single-use ephemeral token the browser uses to open the
 * Gemini Live WebSocket. The real GEMINI_API_KEY never leaves the server. The
 * token is locked to the Live model + audio config and expires fast, so a leak
 * is worthless within ~a minute.
 */
export const getLiveToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const limited = await enforceRateLimit(context.supabase, RATE_LIMITS.chat);
    if (limited) {
      return { token: "", model: "", error: limited };
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return { token: "", model: "", error: "Voice conversation is not configured." };
    }

    try {
      // Lazy import keeps the heavy SDK out of the client bundle entirely.
      const { GoogleGenAI, Modality } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const now = Date.now();

      const token = await ai.authTokens.create({
        config: {
          uses: 1,
          // Token itself is rejected after 30 min…
          expireTime: new Date(now + 30 * 60_000).toISOString(),
          // …and a NEW session must be started within 60s of minting.
          newSessionExpireTime: new Date(now + 60_000).toISOString(),
          liveConnectConstraints: {
            model: LIVE_MODEL,
            config: {
              responseModalities: [Modality.AUDIO],
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              systemInstruction: LIVE_SYSTEM_INSTRUCTION,
            },
          },
          httpOptions: { apiVersion: "v1alpha" },
        },
      });

      if (!token.name) {
        return { token: "", model: "", error: "Could not create a voice session token." };
      }
      return { token: token.name, model: LIVE_MODEL, error: null as string | null };
    } catch (e) {
      console.error("getLiveToken error", e);
      return { token: "", model: "", error: "Could not start a voice session. Please try again." };
    }
  });

async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 2): Promise<Response> {
  let attempt = 0;
  while (true) {
    const res = await fetch(url, init);
    if (res.status !== 503 && res.status !== 502 && res.status !== 504) return res;
    attempt++;
    if (attempt >= maxRetries) return res;
    await new Promise((r) => setTimeout(r, 800 * attempt));
  }
}

const SUBJECT_GUIDANCE: Record<string, string> = {
  math: "Focus on step-by-step problem solving. Show every step clearly. Use LaTeX-style notation when helpful (e.g. x^2). Never just give the final answer — walk through reasoning.",
  science:
    "Explain underlying concepts and the 'why'. Use real-world analogies. Cover physics, chemistry and biology.",
  english:
    "Help with grammar, writing structure, literary analysis, vocabulary. Provide examples and revisions, but encourage the student to write in their own voice.",
  history:
    "Provide context, dates, causes and consequences. Encourage critical thinking about sources and perspectives.",
  general: "Help with any school subject. Encourage the student's own thinking.",
};

type Personalization = {
  display_name: string | null;
  grade_level: string | null;
  learning_style: string | null;
  explanation_tone: string | null;
  study_goals: string | null;
  interests: string | null;
};

// Fetched server-side from the caller's own profile row (RLS-scoped). Never
// trusted from the client, so a user can't spoof another student's context.
async function fetchPersonalization(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Personalization | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, grade_level, learning_style, explanation_tone, study_goals, interests")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Personalization;
}

function personalizationBlock(p: Personalization | null): string {
  if (!p) return "";
  const lines: string[] = [];
  if (p.display_name)
    lines.push(`- The student's name is ${p.display_name}. Address them by name occasionally.`);
  if (p.grade_level)
    lines.push(`- Grade / level: ${p.grade_level}. Pitch difficulty and vocabulary accordingly.`);
  if (p.learning_style)
    lines.push(`- Preferred learning style: ${p.learning_style}. Lean into this when explaining.`);
  if (p.explanation_tone) lines.push(`- Preferred tone: ${p.explanation_tone}.`);
  if (p.study_goals)
    lines.push(`- Current goals: ${p.study_goals}. Tie explanations back to these where natural.`);
  if (p.interests) lines.push(`- Interests (use for analogies/examples): ${p.interests}.`);
  if (lines.length === 0) return "";
  return `\n\nPERSONALIZATION — adapt to this student:\n${lines.join("\n")}`;
}

function buildSystemPrompt(subject: string, p: Personalization | null): string {
  const base =
    subject === "general"
      ? `You are a friendly AI homework tutor for students.

Your mission: help students LEARN, not cheat. You always:
- Break problems into clear, numbered steps so the student understands the reasoning.
- Ask a quick clarifying question if the request is ambiguous.
- Encourage the student to attempt the next step themselves when appropriate.
- Refuse to write entire essays, full take-home exams, or do graded assessments for the student. Instead, offer outlines, examples, feedback, and explanations.
- Keep answers concise, age-appropriate, and use Markdown (headings, lists, **bold**) for readability.

You can help with any school subject.`
      : `You are a friendly AI homework tutor specializing in ${subject.toUpperCase()}.

Your mission: help students LEARN, not cheat. You always:
- Break problems into clear, numbered steps so the student understands the reasoning.
- Ask a quick clarifying question if the request is ambiguous.
- Encourage the student to attempt the next step themselves when appropriate.
- Refuse to write entire essays, full take-home exams, or do graded assessments for the student. Instead, offer outlines, examples, feedback, and explanations.
- Keep answers concise, age-appropriate, and use Markdown (headings, lists, **bold**) for readability.

${SUBJECT_GUIDANCE[subject] ?? SUBJECT_GUIDANCE.general}`;
  return base + personalizationBlock(p);
}

const inputSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(40),
  subject: z.enum(["math", "science", "english", "history", "general"]).default("general"),
  image: z.string().max(1_500_000).optional(),
  conversationId: z.string().uuid().optional(),
});

export const askHomework = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const limited = await enforceRateLimit(context.supabase, RATE_LIMITS.chat);
    if (limited) {
      return { content: "", error: limited };
    }

    try {
      // Get the user's session token for Edge Function authorization
      const { data: { session }, error: sessionError } = await context.supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        return { content: "", error: "Authentication failed. Please log in again." };
      }

      const res = await fetchWithRetry(
        SCHOLARX_CHAT_FUNCTION_URL,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: data.messages,
            subject: data.subject,
            image: data.image,
            conversationId: data.conversationId,
          }),
        },
      );

      if (res.status === 429) {
        return { content: "", error: "Too many requests right now. Please try again in a moment." };
      }
      if (!res.ok) {
        const text = await res.text();
        console.error("Edge Function error", res.status, text);
        return { content: "", error: "The AI tutor couldn't respond. Please try again." };
      }

      const json = await res.json();
      const content: string = json.content ?? "";
      const error: string | null = json.error ?? null;
      return { content, error };
    } catch (e) {
      console.error("askHomework error", e);
      return { content: "", error: "Network error talking to the AI tutor." };
    }
  });

// ---- Auto-title -----------------------------------------------------------
// Cheap one-shot call to name a conversation from its opening exchange,
// instead of using the raw first message verbatim.

const titleInputSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(6),
  conversationId: z.string().uuid().optional(),
});

export const generateTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => titleInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const limited = await enforceRateLimit(context.supabase, RATE_LIMITS.chat);
    if (limited) return { title: "", error: limited };

    try {
      // Get the user's session token for Edge Function authorization
      const { data: { session }, error: sessionError } = await context.supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        return { title: "", error: "Authentication failed." };
      }

      // Call Edge Function to generate title
      const res = await fetchWithRetry(
        SCHOLARX_CHAT_FUNCTION_URL,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: data.messages,
            subject: "general",
            conversationId: data.conversationId,
          }),
        },
      );

      if (!res.ok) return { title: "", error: "Could not generate a title." };
      const json = await res.json();
      const content: string = json.content ?? "";
      // Extract just the first line as title
      const title = content
        .split("\n")[0]
        .replace(/["']/g, "")
        .replace(/[.!?]+$/, "")
        .trim()
        .slice(0, 80);
      return { title, error: null as string | null };
    } catch (e) {
      console.error("generateTitle error", e);
      return { title: "", error: "Could not generate a title." };
    }
  });
