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

const mcqBaseSchema = z.object({
  type: z.literal("mcq"),
  question: z.string().min(1).max(2000),
  choices: z.array(z.string().min(1).max(500)).min(3).max(6),
  answer: z.string().min(1).max(500),
});

const mcqQuestionSchema = mcqBaseSchema.superRefine((item, ctx) => {
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

type TestQuestion = z.infer<typeof mcqQuestionSchema> | z.infer<typeof essayQuestionSchema>;

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

export const generateTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return { questions: [] as TestQuestion[], error: "AI is not configured. Please contact support." };
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

CRITICAL MODE REQUIREMENT: You MUST create ${modeLabel}. If the mode is "all multiple-choice questions", EVERY question must be MCQ type. If the mode is "all essay questions", EVERY question must be essay type. If the mode is "a balanced mix", include both types.

Rules:
- Do not include markdown fences or extra commentary.
- Produce 8 to 12 items unless the user specifically asks for fewer.
- For MCQ items, provide 3 or 4 good answer choices and make the correct answer one of the options.
- For essay items, provide a concise sample answer (2-4 sentences).
- Keep language clear, direct, and suitable for a student studying the topic.
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
          temperature: 0.45,
        }),
      });

      if (res.status === 429) {
        return { questions: [] as TestQuestion[], error: "Too many requests right now. Please try again in a moment." };
      }
      if (!res.ok) {
        const text = await res.text();
        console.error("Gemini test generation error", res.status, text);
        return { questions: [] as TestQuestion[], error: "The AI could not generate a test. Please try again." };
      }

      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      if (!content) {
        return { questions: [] as TestQuestion[], error: "Empty AI response." };
      }

      let parsed: unknown;
      try {
        parsed = extractJsonArray(content);
      } catch {
        return { questions: [] as TestQuestion[], error: "Could not parse the test output. Try a clearer topic." };
      }

      const parsedQuestions = questionsSchema.safeParse(parsed);
      if (!parsedQuestions.success) {
        return { questions: [] as TestQuestion[], error: "The test format was invalid. Please try again." };
      }

      return { questions: parsedQuestions.data, error: null as string | null };
    } catch (e) {
      console.error("generateTest error", e);
      return { questions: [] as TestQuestion[], error: "Network error talking to the AI." };
    }
  });

const answerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().max(4000),
});

const evaluateTestInputSchema = z.object({
  topic: z.string().min(1).max(400),
  questions: z
    .array(
      z.union([
        mcqBaseSchema.extend({ id: z.string() }),
        essayQuestionSchema.extend({ id: z.string() }),
      ]),
    )
    .min(4)
    .max(16),
  answers: z.array(answerSchema).min(1),
});

const evaluationSchema = z.object({
  questionId: z.string(),
  type: z.literal("essay"),
  correct: z.boolean(),
  feedback: z.string().min(1).max(2000),
});

type Evaluation = z.infer<typeof evaluationSchema>;

const evaluationResponseSchema = z.array(evaluationSchema);

export const evaluateTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => evaluateTestInputSchema.parse(input))
  .handler(async ({ data }) => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return {
        evaluations: [] as Evaluation[],
        error: "AI is not configured. Please contact support.",
      };
    }

    const essayQuestions = data.questions.filter((item) => item.type === "essay");
    if (essayQuestions.length === 0) {
      return { evaluations: [] as Evaluation[], error: null as string | null };
    }

    const answerLookup = Object.fromEntries(data.answers.map((answer) => [answer.questionId, answer.answer]));

    const systemPrompt = `You are ScholarX test grader. Evaluate each student essay answer against the model answer. Output ONLY a JSON array with this exact shape:
[
  {"questionId":"...","type":"essay","correct":true|false,"feedback":"short feedback"}
]
Rules:
- Do not include markdown fences or any extra text.
- Return feedback that explains whether the answer is correct and how it could be improved.
- Compare student responses to the model answer and judge correctness, not grammar.
`;

    const questionPayload = essayQuestions
      .map(
        (item, index) =>
          `Question ${index + 1}:
${item.question}
Model answer: ${item.answer}
Student answer: ${answerLookup[item.id] ?? ""}
`,
      )
      .join("\n");

    const userPrompt = `Topic: ${data.topic}

Evaluate the following essay responses:

${questionPayload}`;

    try {
      const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-3.1-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
        }),
      });

      if (res.status === 429) {
        return { evaluations: [], error: "Too many requests right now. Please try again in a moment." };
      }
      if (!res.ok) {
        const text = await res.text();
        console.error("Gemini test evaluation error", res.status, text);
        return { evaluations: [], error: "The AI could not evaluate the test. Please try again." };
      }

      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      if (!content) {
        return { evaluations: [], error: "Empty AI response." };
      }

      let parsed: unknown;
      try {
        parsed = extractJsonArray(content);
      } catch {
        return { evaluations: [], error: "Could not parse the evaluation output. Please try again." };
      }

      const parsedEvaluation = evaluationResponseSchema.safeParse(parsed);
      if (!parsedEvaluation.success) {
        return { evaluations: [], error: "The evaluation format was invalid. Please try again." };
      }

      return { evaluations: parsedEvaluation.data, error: null as string | null };
    } catch (e) {
      console.error("evaluateTest error", e);
      return { evaluations: [], error: "Network error talking to the AI." };
    }
  });
