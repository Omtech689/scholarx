import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";

// The Termly policy ID for ScholarX's Privacy Notice.
// Find this in the Termly dashboard under your Privacy Policy document
// (Embed Code → the value of `data-id`). Update if the policy is regenerated.
const TERMLY_POLICY_ID = "REPLACE_WITH_TERMLY_POLICY_ID";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ScholarX" },
      { name: "description", content: "How ScholarX collects, uses, and protects your personal information." },
      { property: "og:title", content: "Privacy Policy — ScholarX" },
      { property: "og:description", content: "How ScholarX collects, uses, and protects your personal information." },
      { property: "og:url", content: "https://scholarx.space/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://scholarx.space/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  useEffect(() => {
    const SCRIPT_ID = "termly-jssdk";
    if (document.getElementById(SCRIPT_ID)) return;
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://app.termly.io/embed-policy.min.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link to="/" className="flex items-center gap-2 font-display font-semibold text-lg">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-primary-foreground text-xs font-bold"
            style={{ background: "var(--gradient-primary)" }}
          >
            S
          </span>
          ScholarX
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition">
          ← Back home
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div
          {...{ name: "termly-embed" }}
          data-id={TERMLY_POLICY_ID}
        />
      </main>

      <footer className="border-t border-border mt-16 px-6 py-6 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-4">
          <Link to="/privacy" className="hover:text-foreground transition">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-foreground transition">Terms of Service</Link>
          <span>·</span>
          <span>© {new Date().getFullYear()} ScholarX</span>
        </div>
      </footer>
    </div>
  );
}
