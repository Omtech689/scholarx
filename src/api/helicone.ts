// Helicone observability headers for Gemini calls. When HELICONE_API_KEY is
// unset, every helper degrades to a no-op so requests go straight to Google.

export type HeliconeHeaderOpts = {
  userId?: string;
  feature: string;
  sessionId?: string;
  sessionPath?: string;
  sessionName?: string;
  properties?: Record<string, string | number | undefined | null>;
};

export function heliconeGeminiBase(): string {
  return process.env.HELICONE_API_KEY
    ? "https://gateway.helicone.ai"
    : "https://generativelanguage.googleapis.com";
}

export function heliconeHeaders(opts: HeliconeHeaderOpts): Record<string, string> {
  const key = process.env.HELICONE_API_KEY;
  if (!key) return {};

  const headers: Record<string, string> = {
    "Helicone-Auth": `Bearer ${key}`,
    "Helicone-Target-URL": "https://generativelanguage.googleapis.com",
    "Helicone-Property-Feature": opts.feature,
  };

  if (opts.userId) headers["Helicone-User-Id"] = opts.userId;
  if (opts.sessionId) headers["Helicone-Session-Id"] = opts.sessionId;
  if (opts.sessionPath) headers["Helicone-Session-Path"] = opts.sessionPath;
  if (opts.sessionName) headers["Helicone-Session-Name"] = opts.sessionName;

  if (opts.properties) {
    for (const [k, v] of Object.entries(opts.properties)) {
      if (v == null || v === "") continue;
      headers[`Helicone-Property-${k}`] = String(v);
    }
  }

  return headers;
}
