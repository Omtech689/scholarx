import { redirect } from "@tanstack/react-router";
import { supabase } from "./client";
import type { Session } from "@supabase/supabase-js";

export type AuthRouteSession = Session | null;

export async function getBrowserSession(): Promise<AuthRouteSession> {
  if (typeof window === "undefined") return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function getSessionRouteContext() {
  return { session: await getBrowserSession() };
}

export async function redirectIfSignedIn(to = "/chat") {
  if (typeof window === "undefined") return;
  const session = await getBrowserSession();
  if (session) throw redirect({ to });
}

export async function redirectIfNotSignedIn(opts: { to?: string; search?: Record<string, string> } = {}) {
  if (typeof window === "undefined") return { session: null };
  const session = await getBrowserSession();
  if (!session) throw redirect({ to: opts.to ?? "/login", search: opts.search });
  return { session };
}

export async function requireBrowserSession(redirectTo = "/login") {
  const session = await getBrowserSession();
  if (!session) throw redirect({ to: redirectTo });
  return { session };
}
