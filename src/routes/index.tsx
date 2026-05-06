import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, BookOpen, Calculator, FlaskConical, Landmark, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/chat" });
  },
  component: Landing,
});

function Landing() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          <span>Synaptic</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/login" search={{ mode: "signup" }}>Get started</Link>
          </Button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-16 pb-24 text-center">
        <div
          className={`inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground transition-all duration-700 ${
            mounted ? "opacity-100" : "opacity-0 -translate-y-2"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary glow" />
          AI tutor that helps you learn — not cheat
        </div>
        <h1
          className={`mt-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl transition-all duration-700 ${
            mounted ? "opacity-100" : "opacity-0 translate-y-3"
          }`}
        >
          Homework, <span className="text-gradient">decoded</span>.
        </h1>
        <p
          className={`mx-auto mt-6 max-w-xl text-lg text-muted-foreground transition-all duration-700 delay-100 ${
            mounted ? "opacity-100" : "opacity-0 translate-y-3"
          }`}
        >
          Ask questions across Math, Science, English, and History. Get clear, step-by-step
          explanations from a futuristic AI tutor designed for curious students.
        </p>
        <div
          className={`mt-10 flex items-center justify-center gap-3 transition-all duration-700 delay-200 ${
            mounted ? "opacity-100" : "opacity-0 translate-y-3"
          }`}
        >
          <Button asChild size="lg" className="glow">
            <Link to="/login" search={{ mode: "signup" }}>Start learning free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/login">I have an account</Link>
          </Button>
        </div>

        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: Calculator, label: "Math", color: "var(--math)" },
            { icon: FlaskConical, label: "Science", color: "var(--science)" },
            { icon: BookOpen, label: "English", color: "var(--english)" },
            { icon: Landmark, label: "History", color: "var(--history)" },
          ].map((s) => (
            <div
              key={s.label}
              className="glass flex flex-col items-center gap-2 rounded-xl p-4 transition-transform hover:-translate-y-1"
            >
              <s.icon className="h-6 w-6" style={{ color: s.color }} />
              <span className="text-sm font-medium">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-12 flex max-w-2xl items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left text-sm text-amber-200/90">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <strong className="font-semibold">Learn, don't cheat.</strong> Synaptic is built to
            explain, guide, and tutor. Submitting AI-written answers as your own may violate your
            school's academic honesty policy.
          </p>
        </div>
      </section>
    </main>
  );
}
