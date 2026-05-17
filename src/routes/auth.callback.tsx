import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  beforeLoad: async ({ location }) => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const type = params.get("type");

    // PKCE flow: code exchanged for session
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

      if (error) {
        console.error("Auth callback error:", error);
      }
    }

    // Implicit flow: tokens delivered in hash fragment (e.g. Google OAuth)
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (!error && data.session) {
        throw redirect({ to: "/chat" });
      }

      if (error) {
        console.error("Auth implicit flow error:", error);
      }
    }

    throw redirect({ to: "/login?error=auth_failed" });
  },
  component: () => null,
});
