import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Loader2, ArrowLeft, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — ScholarX" },
      { name: "description", content: "Set a new password for your ScholarX account." },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://scholarx.space/reset-password" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasValidToken, setHasValidToken] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const readHashParams = () => {
      const raw = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const p = new URLSearchParams(raw);
      return {
        accessToken: p.get("access_token"),
        refreshToken: p.get("refresh_token"),
        type: p.get("type"),
      };
    };

    async function initRecovery() {
      const { accessToken, refreshToken, type } = readHashParams();
      const typeNorm = type?.toLowerCase() ?? "";
      const hasTokenPair = Boolean(accessToken);
      // Supabase recovery links use type=recovery; some clients omit type while still sending the pair.
      const recoveryLikely =
        typeNorm === "recovery" ||
        (hasTokenPair &&
          typeNorm !== "signup" &&
          typeNorm !== "email_change" &&
          typeNorm !== "magiclink" &&
          typeNorm !== "invite");

      const w = window as Window & { resetTokens?: { accessToken: string; refreshToken: string } };
      if (hasTokenPair && recoveryLikely) {
        w.resetTokens = { accessToken: accessToken!, refreshToken: refreshToken! };
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code && code.length > 10) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          toast.error("Invalid or expired reset link. Please request a new password reset.");
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
          return;
        }
        setHasValidToken(true);
        window.history.replaceState({}, document.title, url.pathname);
        return;
      }

      await supabase.auth.initialize();
      if (cancelled) return;

      if (w.resetTokens?.accessToken && w.resetTokens?.refreshToken) {
        setHasValidToken(true);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (hasTokenPair && recoveryLikely && sessionData.session?.user) {
        w.resetTokens = { accessToken: accessToken!, refreshToken: refreshToken! };
        setHasValidToken(true);
        return;
      }

      toast.error("Invalid reset link. Please request a new password reset.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    }

    void initRecovery();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    // Validate password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      toast.error("Password must contain uppercase letters, lowercase letters, and numbers");
      return;
    }

    setLoading(true);
    try {
      let {
        data: { session },
      } = await supabase.auth.getSession();

      // PKCE or implicit session may already exist after opening the email link.
      if (!session?.user) {
        const stored = (window as Window & { resetTokens?: { accessToken: string; refreshToken: string } })
          .resetTokens;
        if (stored?.accessToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: stored.accessToken,
            refresh_token: stored.refreshToken,
          });
          if (sessionError) {
            toast.error("Invalid or expired reset link. Please request a new password reset.");
            setTimeout(() => {
              window.location.href = "/login";
            }, 2000);
            return;
          }
          ({
            data: { session },
          } = await supabase.auth.getSession());
        }
      }

      if (!session?.user) {
        toast.error("Reset session not found. Open the link from your email again, or request a new reset.");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast.error(error.message || "Failed to reset password");
        console.error(error);
        return;
      }

      setIsSuccess(true);
      toast.success("Password reset successfully!");
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        window.location.href = "/login";
      }, 3000);
      
    } catch (err) {
      toast.error("Something went wrong");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="glass rounded-2xl p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Password Reset Successful</h1>
            <p className="text-muted-foreground mb-6">
              Your password has been successfully updated. You will be redirected to the login page shortly.
            </p>
            <Button onClick={() => window.location.href = "/login"} className="w-full">
              Sign in now
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <button
            onClick={() => window.location.href = "/login"}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </button>
        </div>

        <div className="glass rounded-2xl p-8 shadow-[var(--shadow-card)]">
          <div className="mb-6 flex items-center justify-center gap-2 font-display text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </span>
            ScholarX
          </div>

          <h1 className="text-2xl font-bold mb-2">Reset your password</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Enter your new password below. Make sure it's at least 8 characters long and includes uppercase, lowercase, and numbers.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={8}
                maxLength={72}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={8}
                maxLength={72}
              />
            </div>

            <Button type="submit" className="w-full glow" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Password Requirements:</h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• At least 8 characters long</li>
              <li>• Contains uppercase letters (A-Z)</li>
              <li>• Contains lowercase letters (a-z)</li>
              <li>• Contains numbers (0-9)</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
