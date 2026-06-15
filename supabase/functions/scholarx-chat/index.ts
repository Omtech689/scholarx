// Supabase Edge Function: Secure Helicone + Gemini Chat Proxy
// This function acts as a secure bridge between your React app and Gemini API via Helicone.
// The HELICONE_API_KEY never leaves Supabase, keeping it safe from exposure.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

interface ChatRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  subject: string;
  image?: string;
  conversationId?: string;
}

export default async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // Extract the JWT from the Authorization header
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const token = authHeader.slice(7); // Remove "Bearer "

    // Initialize Supabase client (lazy import to reduce cold-start cost)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Service misconfigured" }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // Verify JWT via Supabase Auth REST endpoint
    const authRes = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseKey,
      },
    }).catch(() => null);

    if (!authRes || !authRes.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    const user = await authRes.json();
    const userId = user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // Parse the request body
    const body: ChatRequest = await req.json();

    // Get API keys from Supabase secrets
    const HELICONE_API_KEY = Deno.env.get("HELICONE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI is not configured. Please contact support." }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Fetch user personalization (same as server function)
    // Fetch personalization via PostgREST
    let personalizationData: any = null;
    try {
      const profileRes = await fetch(
        `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/profiles?select=display_name,grade_level,learning_style,explanation_tone,study_goals,interests&id=eq.${encodeURIComponent(
          userId,
        )}`,
        {
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
            Accept: "application/json",
          },
        },
      );
      if (profileRes && profileRes.ok) {
        const arr = await profileRes.json();
        personalizationData = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
      }
    } catch (e) {
      console.error("profile fetch error", e);
    }

    // Build system prompt (simplified version of your server function)
    const subject = body.subject || "general";
    const personalization = personalizationData as any;

    const systemPrompt = buildSystemPrompt(subject, personalization);

    // Build Gemini request
    const geminiUrl = HELICONE_API_KEY
      ? "https://gateway.helicone.ai/v1beta/models/gemini-3.1-flash-lite:generateContent?key=" + GEMINI_API_KEY
      : `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add Helicone headers if key exists
    if (HELICONE_API_KEY) {
      headers["Helicone-Auth"] = `Bearer ${HELICONE_API_KEY}`;
      headers["Helicone-Target-URL"] = "https://generativelanguage.googleapis.com";
      headers["Helicone-User-Id"] = userId;
      headers["Helicone-Session-Id"] = body.conversationId || crypto.randomUUID();
      headers["Helicone-Session-Path"] = "/chat/message";
      headers["Helicone-Session-Name"] = "Chat Conversation";
      headers["Helicone-Property-Feature"] = "chat";
      headers["Helicone-Property-Subject"] = subject;
      headers["Helicone-Property-HasImage"] = body.image ? "true" : "false";
      headers["Helicone-Property-TurnCount"] = String(body.messages.length);
    }

    const fullPrompt =
      systemPrompt +
      "\n\n" +
      body.messages.map((m) => `${m.role}: ${m.content}`).join("\n") +
      "\nAssistant: ";

    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: fullPrompt },
            ...(body.image ? [{ inline_data: { mime_type: "image/jpeg", data: body.image } }] : []),
          ],
        },
      ],
    };

    // Use a timeout for the Gemini/Helicone request to avoid worker hangs
    async function fetchWithTimeout(resource: string, init: RequestInit, timeout = 15000) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const res = await fetch(resource, { ...init, signal: controller.signal });
        return res;
      } finally {
        clearTimeout(id);
      }
    }

    const response = await fetchWithTimeout(geminiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(geminiPayload),
    }, 15000);

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again in a moment." }), {
        status: 429,
        headers: corsHeaders,
      });
    }

    if (!response.ok) {
      const text = await response.text();
      console.error("Gemini API error", response.status, text);
      return new Response(JSON.stringify({ error: "The AI tutor couldn't respond. Please try again." }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const json = await response.json();
    const content: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return new Response(JSON.stringify({ content, error: null }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};

// Helper functions (copied from your server code)

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

function personalizationBlock(p: Personalization | null): string {
  if (!p) return "";
  const lines: string[] = [];
  if (p.display_name) lines.push(`- The student's name is ${p.display_name}. Address them by name occasionally.`);
  if (p.grade_level) lines.push(`- Grade / level: ${p.grade_level}. Pitch difficulty and vocabulary accordingly.`);
  if (p.learning_style) lines.push(`- Preferred learning style: ${p.learning_style}. Lean into this when explaining.`);
  if (p.explanation_tone) lines.push(`- Preferred tone: ${p.explanation_tone}.`);
  if (p.study_goals) lines.push(`- Current goals: ${p.study_goals}. Tie explanations back to these where natural.`);
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
