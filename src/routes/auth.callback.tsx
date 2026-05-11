import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  beforeLoad: async ({ location }) => {
    const code = new URLSearchParams(location.search).get("code");
    
    // Basic validation of auth code format
    if (code && code.length > 10) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.session) {
        throw redirect({ to: "/chat" });
      }
      if (error) {
        console.error("Auth callback error:", error);
      }
    }
    throw redirect({ to: "/login?error=auth_failed" });
  },
  component: () => null,
});
