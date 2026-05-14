import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const inputSchema = z.object({
  topic: z.string().min(1).max(400),
  mode: z.enum(["all_mcq", "all_essay", "mixed"]).default("mixed"),
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

const mcqQuestionSchema = z
  .object({
    type: z.literal("mcq"),
    question: z.string().min(1).max(2000),
    choices: z.array(z.string().min(1).max(500)).min(3).max(6),
    answer: z.string().min(1).max(500),
  })
  .superRefine((item, ctx) => {
    if (!item.choices.includes(item.answer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answer"],
        message: "MCQ answer must match one of the provided choices.",
      });
    }
  });

const essayQuestionSchema = z.object({
  type: z.literal("essay"),
  question: z.string().min(1).max(3000),
  answer: z.string().min(1).max(4000),
});

const questionsSchema = z
  .array(z.union([mcqQuestionSchema, essayQuestionSchema]))
  .min(4)
  .max(16);

function extractJsonArray(raw: string): unknown {
  const t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : t;
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) throw new Error("no_json_array");
  return JSON.parse(body.slice(start, end + 1));
}

export const generateTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return { questions: [] as unknown[], error: "AI is not configured. Please contact support." };
    }

    const topic = data.topic.trim();
    const history =
      data.messages?.length ?? 0
        ? data.messages!
        : [{ role: "user" as const, content: `Create an interactive test for this topic: ${topic}` }];

    const modeLabel =
      data.mode === "all_mcq"
        ? "all multiple-choice questions"
        : data.mode === "all_essay"
        ? "all essay questions"
        : "a balanced mix of multiple-choice and essay questions";

    const systemPrompt = `You are ScholarX test creator for students. Output ONLY a JSON array with this exact shape:
[
  {"type":"mcq","question":"question text","choices":["option 1","option 2","option 3","option 4"],"answer":"correct option"},
  {"type":"essay","question":"question text","answer":"sample answer"}
]

Rules:
- Do not include markdown fences or extra commentary.
- Use ${modeLabel}.
- Produce 8 to 12 items unless the user specifically asks for fewer.
- For MCQ items, provide 3 or 4 good answer choices and make the correct answer one of the options.
- For essay items, provide a concise sample answer (2-4 sentences).
- Keep language clear, direct, and suitable for a student studying the topic.
- Primary topic label: ${topic}`;

    const messages = [{ role: "system" as const, content: systemPrompt }, ...history];

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-3.1-flash-lite",
          messages,
          temperature: 0.45,
        }),
      });

      if (res.status === 429) {
        return { questions: [], error: "Too many requests right now. Please try again in a moment." };
      }
      if (!res.ok) {
        const text = await res.text();
        console.error("Gemini test generation error", res.status, text);
        return { questions: [], error: "The AI could not generate a test. Please try again." };
      }

      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      if (!content) {
        return { questions: [], error: "Empty AI response." };
      }

      let parsed: unknown;
      try {
        parsed = extractJsonArray(content);
      } catch {
        return { questions: [], error: "Could not parse the test output. Try a clearer topic." };
      }

      const parsedQuestions = questionsSchema.safeParse(parsed);
      if (!parsedQuestions.success) {
        return { questions: [], error: "The test format was invalid. Please try again." };
      }

      return { questions: parsedQuestions.data, error: null as string | null };
    } catch (e) {
      console.error("generateTest error", e);
      return { questions: [], error: "Network error talking to the AI." };
    }
  });
