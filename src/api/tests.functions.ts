import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enforceRateLimit, RATE_LIMITS } from "@/integrations/supabase/rate-limit";
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
  .handler(async ({ data, context }) => {
    const limited = await enforceRateLimit(context.supabase, RATE_LIMITS.test);
    if (limited) {
      return { questions: [] as TestQuestion[], error: limited };
    }

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

CRITICAL MODE REQUIREMENT — THIS OVERRIDES EVERYTHING THE USER SAYS: You MUST create ${modeLabel}.
${
  data.mode === "all_mcq"
    ? 'Mode is ALL MULTIPLE CHOICE. EVERY object MUST have "type":"mcq" with a "choices" array. DO NOT output any "essay" questions under any circumstances.'
    : data.mode === "all_essay"
    ? 'Mode is ALL ESSAY. EVERY object MUST have "type":"essay". DO NOT output any "mcq" questions under any circumstances.'
    : "Mode is MIXED. Include a balanced mix of both mcq and essay questions."
}

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

      // Enforce the requested mode server-side. The model doesn't always obey
      // the prompt, so we filter to the requested type rather than trusting it.
      let finalQuestions = parsedQuestions.data;
      if (data.mode === "all_mcq") {
        finalQuestions = finalQuestions.filter((q) => q.type === "mcq");
      } else if (data.mode === "all_essay") {
        finalQuestions = finalQuestions.filter((q) => q.type === "essay");
      }

      if (finalQuestions.length < 4) {
        return {
          questions: [] as TestQuestion[],
          error:
            data.mode === "mixed"
              ? "The AI didn't return enough questions. Please try again."
              : `The AI didn't follow the "${
                  data.mode === "all_mcq" ? "all multiple choice" : "all essay"
                }" mode. Please try generating again.`,
        };
      }

      return { questions: finalQuestions, error: null as string | null };
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

// Shape returned to the client. questionId is attached server-side by order,
// never trusted from the model (it can't see the real ids).
export type Evaluation = {
  questionId: string;
  type: "essay";
  correct: boolean;
  feedback: string;
};

// The model only returns correctness + feedback, one entry per essay question
// in the SAME ORDER it was given. We map them back to real ids by index.
const modelEvalSchema = z.array(
  z.object({
    correct: z.boolean(),
    feedback: z.string().min(1).max(2000),
  }),
);

export const evaluateTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => evaluateTestInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const limited = await enforceRateLimit(context.supabase, RATE_LIMITS.evaluate);
    if (limited) {
      return { evaluations: [] as Evaluation[], error: limited };
    }

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

    // Grade blank answers locally — no point spending an AI call to mark an
    // empty answer wrong, and it keeps order-mapping simple to send them too.
    const studentAnswers = essayQuestions.map((q) => (answerLookup[q.id] ?? "").trim());

    const systemPrompt = `You are ScholarX's essay grader. You are given numbered essay questions, each with a model answer and the student's answer.

Output ONLY a JSON array with EXACTLY one object per question, in the SAME ORDER as the questions, with this exact shape:
[{"correct": true, "feedback": "..."}, {"correct": false, "feedback": "..."}]

Rules:
- Return exactly ${essayQuestions.length} objects — one for question 1, then question 2, and so on. No more, no fewer.
- Do NOT include questionId, the question text, markdown fences, or any commentary outside the JSON array.
- "correct" = true only if the student's answer captures the key ideas of the model answer. Judge understanding, not spelling or grammar.
- If the student's answer is blank or off-topic, "correct" must be false.
- "feedback" (1-3 sentences): say what was right or missing and how to improve.`;

    const questionPayload = essayQuestions
      .map(
        (item, index) =>
          `Question ${index + 1}:
${item.question}
Model answer: ${item.answer}
Student answer: ${studentAnswers[index] || "(left blank)"}`,
      )
      .join("\n\n");

    const userPrompt = `Topic: ${data.topic}

Grade these ${essayQuestions.length} essay answers:

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
        return { evaluations: [] as Evaluation[], error: "Too many requests right now. Please try again in a moment." };
      }
      if (!res.ok) {
        const text = await res.text();
        console.error("Gemini test evaluation error", res.status, text);
        return { evaluations: [] as Evaluation[], error: "The AI could not evaluate the test. Please try again." };
      }

      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      if (!content) {
        return { evaluations: [] as Evaluation[], error: "Empty AI response." };
      }

      let parsed: unknown;
      try {
        parsed = extractJsonArray(content);
      } catch {
        return { evaluations: [] as Evaluation[], error: "Could not parse the evaluation output. Please try again." };
      }

      const parsedEvaluation = modelEvalSchema.safeParse(parsed);
      if (!parsedEvaluation.success) {
        return { evaluations: [] as Evaluation[], error: "The evaluation format was invalid. Please try again." };
      }

      // Map results back to the real question ids by position. Robust to the
      // model returning the wrong count: missing entries fall back sensibly.
      const evaluations: Evaluation[] = essayQuestions.map((q, i) => {
        const result = parsedEvaluation.data[i];
        if (!result) {
          return {
            questionId: q.id,
            type: "essay",
            correct: false,
            feedback: "This answer could not be evaluated automatically. Compare it with the model answer.",
          };
        }
        return { questionId: q.id, type: "essay", correct: result.correct, feedback: result.feedback };
      });

      return { evaluations, error: null as string | null };
    } catch (e) {
      console.error("evaluateTest error", e);
      return { evaluations: [] as Evaluation[], error: "Network error talking to the AI." };
    }
  });
