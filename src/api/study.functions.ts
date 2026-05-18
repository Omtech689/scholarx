import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enforceRateLimit, RATE_LIMITS } from "@/integrations/supabase/rate-limit";
import { z } from "zod";

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

async function callGemini(systemPrompt: string, userPrompt: string, temperature: number) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY)
    return { content: "", error: "AI is not configured. Please contact support." };

  const res = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-3.1-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
      }),
    },
  );

  if (res.status === 429)
    return { content: "", error: "Too many requests right now. Please try again in a moment." };
  if (!res.ok) {
    console.error("Gemini study/research error", res.status, await res.text().catch(() => ""));
    return { content: "", error: "The AI could not generate this. Please try again." };
  }
  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  if (!content) return { content: "", error: "Empty AI response." };
  return { content, error: null as string | null };
}

// ---- Study guide ---------------------------------------------------------

const studyInputSchema = z.object({
  topic: z.string().min(1).max(400),
  detail: z.enum(["concise", "standard", "in_depth"]).default("standard"),
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

export const generateStudyGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => studyInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const limited = await enforceRateLimit(context.supabase, RATE_LIMITS.study);
    if (limited) return { content: "", error: limited };

    const topic = data.topic.trim();
    const depth =
      data.detail === "concise"
        ? "Keep it tight — a one-page revision sheet a student can skim before an exam."
        : data.detail === "in_depth"
          ? "Be thorough — explain mechanisms and the 'why', with worked examples."
          : "Balanced depth — enough to learn from, not overwhelming.";

    const systemPrompt = `You are ScholarX's study-guide writer for students (learning, not cheating).
Produce a well-structured study guide in GitHub-flavored Markdown ONLY (no preamble, no closing remarks).

Structure:
# <Title>
## Overview  (2–4 sentence summary)
## Key Concepts  (definitions + short explanations)
## Deep Dive  (the main teaching content, with subheadings, examples, and $LaTeX$ where useful)
## Worked Examples  (at least one if the topic allows)
## Common Mistakes
## Quick Review  (bulleted recap)
## Self-Check Questions  (5–8 questions, no answers)

Rules:
- ${depth}
- Use Markdown headings, bold, bullet/numbered lists, and tables where helpful.
- Use $...$ / $$...$$ for math.
- Stay strictly on the topic; do not invent unrelated content.`;

    const userPrompt = data.messages?.length
      ? `Topic label: ${topic}\n\nUse this tutoring conversation as the source material and scope:\n\n${data.messages
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n")}`
      : `Write a study guide on: ${topic}`;

    const result = await callGemini(systemPrompt, userPrompt, 0.4);
    return result;
  });

// ---- Research mode (client-provided sources) -----------------------------

const researchInputSchema = z.object({
  brief: z.string().min(1).max(2000),
  sources: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        text: z.string().min(1).max(40000),
      }),
    )
    .min(1)
    .max(8),
  style: z.enum(["report", "literature_review", "summary"]).default("report"),
});

export const generateResearchReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => researchInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const limited = await enforceRateLimit(context.supabase, RATE_LIMITS.research);
    if (limited) return { content: "", error: limited };

    // Total source payload is bounded by the per-source 40k cap × 8; keep the
    // combined prompt reasonable so we stay within model + Worker limits.
    const totalChars = data.sources.reduce((n, s) => n + s.text.length, 0);
    if (totalChars > 120_000) {
      return {
        content: "",
        error: "Sources are too long combined. Trim them to ~120k characters total.",
      };
    }

    const styleLine =
      data.style === "literature_review"
        ? "Write it as a literature review: compare and contrast what the sources say, note agreements and disagreements."
        : data.style === "summary"
          ? "Write it as a structured executive summary: concise, decision-oriented."
          : "Write it as a research report with clear sections and analysis.";

    const systemPrompt = `You are ScholarX's research assistant. You are given a research brief and a set of NUMBERED sources provided by the student. Synthesize a well-organized document in GitHub-flavored Markdown ONLY.

CRITICAL grounding rules:
- Use ONLY the provided sources. Do NOT introduce outside facts or invent data.
- Cite claims inline using bracketed source numbers like [1], [2]. Every non-obvious claim needs a citation.
- If the sources are insufficient or conflict, say so explicitly rather than guessing.
- ${styleLine}

Structure:
# <Title>
## Abstract
## Introduction
## Findings  (organized into themed subsections, with inline [n] citations)
## Analysis / Discussion
## Limitations  (note gaps or conflicts in the provided sources)
## Conclusion
## References  (numbered list mapping [n] → the source label)

Do not output anything except the Markdown document.`;

    const sourcesBlock = data.sources
      .map((s, i) => `SOURCE [${i + 1}] — ${s.label}\n"""\n${s.text}\n"""`)
      .join("\n\n");

    const userPrompt = `Research brief:\n${data.brief}\n\nProvided sources:\n\n${sourcesBlock}`;

    const result = await callGemini(systemPrompt, userPrompt, 0.3);
    return result;
  });
