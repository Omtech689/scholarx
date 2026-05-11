import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  beforeLoad: async ({ location }) => {
    const code = new URLSearchParams(location.search).get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) throw redirect({ to: "/chat" });
    }
    throw redirect({ to: "/login" });
  },
  component: () => null,
});
