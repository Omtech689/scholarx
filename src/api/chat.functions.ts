import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SUBJECT_GUIDANCE: Record<string, string> = {
  math: "Focus on step-by-step problem solving. Show every step clearly. Use LaTeX-style notation when helpful (e.g. x^2). Never just give the final answer — walk through reasoning.",
  science: "Explain underlying concepts and the 'why'. Use real-world analogies. Cover physics, chemistry and biology.",
  english: "Help with grammar, writing structure, literary analysis, vocabulary. Provide examples and revisions, but encourage the student to write in their own voice.",
  history: "Provide context, dates, causes and consequences. Encourage critical thinking about sources and perspectives.",
  general: "Help with any school subject. Encourage the student's own thinking.",
};

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
});

export const askHomework = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return { content: "", error: "AI is not configured. Please contact support." };
    }

    const systemPrompt = `You are ScholarX, a friendly AI homework tutor for students.

Your mission: help students LEARN, not cheat. You always:
- Break problems into clear, numbered steps so the student understands the reasoning.
- Ask a quick clarifying question if the request is ambiguous.
- Encourage the student to attempt the next step themselves when appropriate.
- Refuse to write entire essays, full take-home exams, or do graded assessments for the student. Instead, offer outlines, examples, feedback, and explanations.
- Keep answers concise, age-appropriate, and use Markdown (headings, lists, **bold**) for readability.

Subject focus: ${data.subject.toUpperCase()}
${SUBJECT_GUIDANCE[data.subject]}`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            messages: [{ role: "system", content: systemPrompt }, ...data.messages],
          }),
        },
      );

      if (res.status === 429) {
        return { content: "", error: "Too many requests right now. Please try again in a moment." };
      }
      if (!res.ok) {
        const text = await res.text();
        console.error("Gemini API error", res.status, text);
        return { content: "", error: "The AI tutor couldn't respond. Please try again." };
      }

      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      return { content, error: null as string | null };
    } catch (e) {
      console.error("askHomework error", e);
      return { content: "", error: "Network error talking to the AI tutor." };
    }
  });
