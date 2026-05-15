import { createFileRoute, Link } from "@tanstack/react-router";

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
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: May 15, 2026</p>

        <section className="space-y-8 text-sm leading-relaxed text-foreground/90">
          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              1. Information We Collect
            </h2>
            <p>
              When you create an account, we collect your email address and any display name you choose to provide.
              When you use ScholarX features (Chat, Flashcards, Planner, Tests), we store the content you submit
              so that it can be retrieved in future sessions.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              2. How We Use Your Information
            </h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>To provide and improve the ScholarX service.</li>
              <li>To send transactional emails (e.g., password resets).</li>
              <li>To diagnose technical issues and monitor service health.</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal information to third parties.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              3. Data Storage & Security
            </h2>
            <p>
              Your data is stored using Supabase, which applies industry-standard encryption at rest and in transit.
              Authentication is handled via secure, short-lived JWT tokens. We follow security best practices, but no
              system can guarantee absolute security.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              4. AI Processing
            </h2>
            <p>
              Questions and prompts you submit are sent to a third-party AI provider (Google Gemini) to generate
              answers. Please do not submit personally identifiable information or sensitive data in your questions.
              AI providers have their own privacy policies governing how they process requests.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              5. Cookies & Local Storage
            </h2>
            <p>
              We use browser local storage to maintain your login session. No third-party advertising cookies are used.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              6. Your Rights
            </h2>
            <p>
              You may delete your account at any time from your Profile settings. Upon deletion, your personal data
              and stored content will be removed from our systems within 30 days.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              7. Contact
            </h2>
            <p>
              If you have questions about this policy, please contact us at{" "}
              <a
                href="mailto:support@scholarx.app"
                className="text-primary underline underline-offset-2 hover:opacity-80"
              >
                support@scholarx.app
              </a>
              .
            </p>
          </div>
        </section>
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
