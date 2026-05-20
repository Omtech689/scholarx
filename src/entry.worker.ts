import defaultEntry from "@tanstack/react-start/server-entry";

// Custom Cloudflare Worker entry that wraps TanStack Start's default entry.
// We intercept every SSR response to set Permissions-Policy, which cannot be
// set via meta tags and may be overridden to a restrictive value by Cloudflare
// Transform Rules. Fix the Transform Rule to remove the microphone restriction,
// and this entry acts as a belt-and-suspenders fallback.
export default {
  async fetch(
    request: Request,
    env: unknown,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const response = await (defaultEntry as { fetch: (r: Request, e: unknown, c: ExecutionContext) => Promise<Response> }).fetch(request, env, ctx);
    const headers = new Headers(response.headers);
    headers.set("Permissions-Policy", "microphone=(self), camera=(), geolocation=()");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
