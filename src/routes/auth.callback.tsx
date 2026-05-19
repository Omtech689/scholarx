import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  beforeLoad: async ({ location }) => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const type = params.get("type");

    // PKCE flow: exchange code for session
    if (code && code.length > 10) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data.session) {
        if (type === "signup") {
          throw redirect({ to: "/auth/signup-confirmed" });
        }

        if (type === "email_change") {
          // new_email is still set when the first link (new address) was clicked
          // and cleared once the second link (old address) completes the change
          const isPending = Boolean(data.session.user.new_email);
          throw redirect({
            to: isPending ? "/auth/email-change-pending" : "/auth/email-changed",
          });
        }

        throw redirect({ to: "/chat" });
      }

      if (error) console.error("Auth PKCE callback error:", error);
      throw redirect({ to: "/login", search: { mode: "signin" as const } });
    }

    // No code — let the component handle implicit flow (hash-based tokens)
  },
  component: AuthCallback,
});

// Handles implicit grant flow where Supabase delivers tokens in the URL hash
// (e.g. Google OAuth). The hash is only readable client-side after mount.
function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (!accessToken || !refreshToken) {
      navigate({ to: "/login", search: { error: "auth_failed" } as never });
      return;
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ data, error }) => {
        if (!error && data.session) {
          navigate({ to: "/chat" });
        } else {
          console.error("Auth implicit flow error:", error);
          navigate({ to: "/login", search: { error: "auth_failed" } as never });
        }
      });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
