import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — ScholarX" },
      {
        name: "description",
        content: "Sign in or create a free ScholarX account to access your AI tutor, flashcards, and study planner.",
      },
      { property: "og:title", content: "Sign In — ScholarX" },
      {
        property: "og:description",
        content: "Sign in or create a free ScholarX account to access your AI tutor, flashcards, and study planner.",
      },
      { property: "og:url", content: "https://scholarx.space/login" },
    ],
    links: [{ rel: "canonical", href: "https://scholarx.space/login" }],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode as string) === "signup" ? "signup" : "signin",
  }),
  component: LoginPage,
});

function LoginPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => setIsSignup(mode === "signup"), [mode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/chat" });
    });
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `https://scholarx.space/login?mode=signin`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created! Please check your email to verify your account.");
        // Don't immediately navigate - let user verify email first
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/chat" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address first");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      toast.success("Password reset email sent! Check your inbox.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-display text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          ScholarX
        </Link>

        <div className="glass rounded-2xl p-8 shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-bold">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup ? "Start learning with your AI tutor." : "Sign in to continue your studies."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignup && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex"
                  maxLength={60}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                required
                maxLength={255}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                maxLength={72}
              />
            </div>
            <Button type="submit" className="w-full glow" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>

          {!isSignup && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                Forgot your password?
              </button>
            </div>
          )}
          
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account? " : "New here? "}
            <button
              type="button"
              onClick={() => setIsSignup((v) => !v)}
              className="font-medium text-primary hover:underline"
            >
              {isSignup ? "Sign in" : "Create Account"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
