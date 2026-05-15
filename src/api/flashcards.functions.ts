import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const inputSchema = z.object({
  topic: z.string().min(1).max(400),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(12000),
      }),
    )
    .max(24)
    .optional(),
});

const cardsSchema = z
  .array(
    z.object({
      q: z.string().min(1).max(2000),
      a: z.string().min(1).max(4000),
    }),
  )
  .min(4)
  .max(24);

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

function extractJsonArray(raw: string): unknown {
  const t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : t;
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) throw new Error("no_json_array");
  return JSON.parse(body.slice(start, end + 1));
}

export const generateFlashcards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return { cards: [] as { q: string; a: string }[], error: "AI is not configured. Please contact support." };
    }

    const topic = data.topic.trim();
    const history =
      data.messages?.length ?? 0
        ? data.messages!
        : [{ role: "user" as const, content: `Create flashcards for this topic: ${topic}` }];

    const systemPrompt = `You are ScholarX flashcard generator for students (learning, not cheating).
Output ONLY a JSON array (no markdown fences, no commentary before or after) with this exact shape:
[{"q":"question text","a":"answer text"}, ...]

Rules:
- Produce between 10 and 16 items unless the user clearly asks for fewer in the chat.
- Questions should check understanding of the topic and important sub-ideas.
- Answers: concise (1–4 sentences or a short bullet list). No long essays.
- Escape any double quotes inside strings as \\".
- Primary topic label: ${topic}`;

    const messages = [{ role: "system" as const, content: systemPrompt }, ...history];

    try {
      const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-3.1-flash-lite",
          messages,
          temperature: 0.35,
        }),
      });

      if (res.status === 429) {
        return { cards: [], error: "Too many requests right now. Please try again in a moment." };
      }
      if (!res.ok) {
        const text = await res.text();
        console.error("Gemini flashcards error", res.status, text);
        return { cards: [], error: "The AI could not generate flashcards. Please try again." };
      }

      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      if (!content) return { cards: [], error: "Empty AI response." };

      let parsed: unknown;
      try {
        parsed = extractJsonArray(content);
      } catch {
        return { cards: [], error: "Could not parse flashcards. Try a clearer or narrower topic." };
      }

      const parsedCards = cardsSchema.safeParse(parsed);
      if (!parsedCards.success) {
        return { cards: [], error: "Flashcard format was invalid. Please try again." };
      }

      return { cards: parsedCards.data, error: null as string | null };
    } catch (e) {
      console.error("generateFlashcards", e);
      return { cards: [], error: "Network error talking to the AI." };
    }
  });
