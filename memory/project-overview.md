---
name: project-overview
description: ScholarX stack, Cloudflare Workers deploy, env vars, and security/SEO hardening checklist status
metadata:
  type: project
---

ScholarX is an AI homework helper (TanStack Start + React, Tailwind/Shadcn, Supabase, Gemini API) deployed to Cloudflare Workers via Wrangler. Routing via TanStack Router with file-based routes in `src/routes/`.

**Why:** Student-facing education app at scholarx.space; owner actively hardening security and SEO.

**How to apply:** Use this context when suggesting architecture changes, deployment config, or new features.

## Key env vars
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — client-side Supabase (anon key only)
- `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` — SSR Supabase
- `VITE_TURNSTILE_SITE_KEY` — Cloudflare Turnstile (added 2026-05-15)
- `GEMINI_API_KEY` — server-only, Google Gemini

## Hardening checklist status (as of 2026-05-15)

### Phase 1 — Security
- [x] RLS enabled on all tables
- [x] RLS policies defined
- [x] No SERVICE_ROLE_KEY in frontend (uses publishable/anon key only)
- [ ] CORS restricted in Supabase dashboard (manual — set to https://scholarx.space only)
- [ ] HTTP security headers via Cloudflare Transform Rules (manual — X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- [x] CSP meta tag added to __root.tsx (defense-in-depth layer)
- [x] Email confirm + rate limiting enabled in Supabase
- [x] Cloudflare Turnstile on login/signup (react-turnstile, token gates form submit)
- [x] Zod validation on all server functions (chat, flashcards, tests)

### Phase 2 — SEO
- [x] Google Search Console verified
- [x] sitemap.xml at /public/sitemap.xml (submitted to GSC)
- [x] robots.txt at /public/robots.txt
- [x] Dynamic metadata (head()) on every route
- [x] OG tags (og:title, og:description, og:url, og:image) on all public routes
- [x] Twitter card meta tags (global via __root.tsx)
- [x] JSON-LD structured data on landing page (WebSite, WebApplication, Organization)
- [x] Canonical URLs on public routes
- [x] noindex/nofollow on all auth-protected routes
- [ ] og:image asset — needs 1200x630 PNG at public/og-image.png
