import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Loader2, ArrowLeft, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasValidToken, setHasValidToken] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(true);

  useEffect(() => {
    async function initSession() {
      // PKCE flow: Supabase sends ?code= as a query parameter
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          toast.error("Invalid or expired reset link. Please request a new one.");
          setTimeout(() => navigate({ to: "/login" }), 2000);
        } else {
          setHasValidToken(true);
          // Clean the code from the URL so it can't be replayed
          window.history.replaceState({}, "", "/reset-password");
        }
        setTokenLoading(false);
        return;
      }

      // Legacy implicit flow: #access_token=...&type=recovery
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      if (accessToken && type === "recovery") {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken ?? "",
        });
        if (error) {
          toast.error("Invalid or expired reset link. Please request a new one.");
          setTimeout(() => navigate({ to: "/login" }), 2000);
        } else {
          setHasValidToken(true);
          window.history.replaceState({}, "", "/reset-password");
        }
        setTokenLoading(false);
        return;
      }

      toast.error("Invalid reset link. Please request a new password reset.");
      setTimeout(() => navigate({ to: "/login" }), 2000);
      setTokenLoading(false);
    }

    void initSession();
  }, [navigate]);

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

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      toast.error("Password must contain uppercase letters, lowercase letters, and numbers");
      return;
    }

    setLoading(true);
    try {
      // Session is already established by exchangeCodeForSession / setSession in useEffect
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message || "Failed to reset password");
        return;
      }
      setIsSuccess(true);
      toast.success("Password reset successfully!");
      setTimeout(() => navigate({ to: "/login" }), 3000);
    } catch (err) {
      toast.error("Something went wrong");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (tokenLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Verifying reset link…</p>
        </div>
      </main>
    );
  }

  if (isSuccess) {
    return (
      <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="glass rounded-2xl p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="mb-2 text-2xl font-bold">Password Reset Successful</h1>
            <p className="mb-6 text-muted-foreground">
              Your password has been updated. Redirecting to sign in…
            </p>
            <Button onClick={() => navigate({ to: "/login" })} className="w-full">
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
            onClick={() => navigate({ to: "/login" })}
            className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
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

          <h1 className="mb-2 text-2xl font-bold">Reset your password</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Enter your new password below. At least 8 characters with uppercase, lowercase, and numbers.
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
            <Button type="submit" className="w-full glow" disabled={loading || !hasValidToken}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
