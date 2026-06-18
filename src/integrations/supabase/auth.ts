import { redirect } from "@tanstack/react-router";
import { supabase } from "./client";
import type { Session } from "@supabase/supabase-js";

export async function getSupabaseSession(): Promise<Session | null> {
  if (typeof window === "undefined") return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function loadSupabaseSession(): Promise<{ session: Session | null }> {
  return { session: await getSupabaseSession() };
}

export async function redirectIfAuthenticated(): Promise<void> {
  const session = await getSupabaseSession();
  if (session) throw redirect({ to: "/chat" });
}

export async function redirectIfUnauthenticated(): Promise<Session | null> {
  const session = await getSupabaseSession();
  if (!session) throw redirect({ to: "/login", search: { mode: "signin" as const } });
  return session;
}
