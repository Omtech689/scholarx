// Local emulation of supabase/functions/scholarx-chat logic for development.
// Exports default async function handler(req, ctx) -> { status, headers, body }

function jsonResponse(status, body, headers = {}) {
  return { status, headers: { 'Content-Type': 'application/json', ...headers }, body };
}

async function readRequestBody(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  try { return JSON.parse(body); } catch { return null; }
}

function buildSystemPrompt(subject, p) {
  const SUBJECT_GUIDANCE = {
    math: 'Focus on step-by-step problem solving. Show every step clearly. Use LaTeX-style notation when helpful (e.g. x^2). Never just give the final answer — walk through reasoning.',
    general: 'Help with any school subject. Encourage the student\'s own thinking.',
  };
  const base = `You are a friendly AI homework tutor specializing in ${subject}.`;
  const personalization = p ? `\nPERSONALIZATION: ${JSON.stringify(p)}` : '';
  return base + '\n' + (SUBJECT_GUIDANCE[subject] || SUBJECT_GUIDANCE.general) + personalization;
}

async function fetchWithTimeout(url, init, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export default async function (req, ctx) {
  const headers = req.headers || {};
  const authHeader = (headers.authorization || headers.Authorization) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const body = await readRequestBody(req);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Verify user if possible
  let userId = null;
  if (token && supabaseUrl && supabaseKey) {
    try {
      const authRes = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}`, apikey: supabaseKey },
      });
      if (authRes.ok) {
        const user = await authRes.json();
        userId = user?.id;
      }
    } catch (e) {
      // ignore
    }
  }

  // Fetch profile if possible
  let personalization = null;
  if (userId && supabaseUrl && supabaseKey) {
    try {
      const profileRes = await fetch(
        `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/profiles?select=display_name,grade_level,learning_style,explanation_tone,study_goals,interests&id=eq.${encodeURIComponent(userId)}`,
        { headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey, Accept: 'application/json' } },
      );
      if (profileRes.ok) {
        const arr = await profileRes.json();
        personalization = Array.isArray(arr) && arr.length ? arr[0] : null;
      }
    } catch (e) {}
  }

  const subject = body?.subject || 'general';
  const systemPrompt = buildSystemPrompt(subject, personalization);

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const HELICONE_API_KEY = process.env.HELICONE_API_KEY;

  if (!GEMINI_API_KEY) {
    // Return a mocked response for local dev when API key not present
    return jsonResponse(200, { content: `MOCK RESPONSE — ${systemPrompt}\n\nUser: ${body?.messages?.[0]?.content || ''}` });
  }

  // Build request to Helicone or direct Gemini
  const geminiUrl = HELICONE_API_KEY
    ? 'https://gateway.helicone.ai/v1beta/models/gemini-3.1-flash-lite:generateContent?key=' + GEMINI_API_KEY
    : `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

  const reqHeaders = { 'Content-Type': 'application/json' };
  if (HELICONE_API_KEY) {
    reqHeaders['Helicone-Auth'] = `Bearer ${HELICONE_API_KEY}`;
    reqHeaders['Helicone-User-Id'] = userId || 'local';
  }

  const fullPrompt = systemPrompt + '\n\n' + (body?.messages || []).map(m => `${m.role}: ${m.content}`).join('\n');
  const geminiPayload = { contents: [{ parts: [{ text: fullPrompt }] }] };

  try {
    const resp = await fetchWithTimeout(geminiUrl, { method: 'POST', headers: reqHeaders, body: JSON.stringify(geminiPayload) }, 15000);
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return jsonResponse(500, { error: 'AI call failed', detail: text });
    }
    const json = await resp.json();
    const content = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return jsonResponse(200, { content });
  } catch (e) {
    return jsonResponse(500, { error: 'AI request error', detail: String(e) });
  }
}
