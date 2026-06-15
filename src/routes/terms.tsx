import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ScholarX" },
      { name: "description", content: "The terms and conditions for using ScholarX." },
      { property: "og:title", content: "Terms of Service — ScholarX" },
      { property: "og:description", content: "The terms and conditions for using ScholarX." },
      { property: "og:url", content: "https://scholarx.space/terms" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Terms of Service — ScholarX" },
      { name: "twitter:description", content: "The terms and conditions for using ScholarX." },
    ],
    links: [{ rel: "canonical", href: "https://scholarx.space/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: May 15, 2026</p>

        <section className="space-y-8 text-sm leading-relaxed text-foreground/90">
          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              1. Acceptance of Terms
            </h2>
            <p>
              By creating an account or using ScholarX ("Service"), you agree to be bound by these Terms of Service.
              If you do not agree, do not use the Service.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              2. Intended Use
            </h2>
            <p>
              ScholarX is an AI-powered study tool designed to help students understand concepts and build knowledge.
              It is intended to support learning — not to complete assignments on a student's behalf in violation of
              their school's academic integrity policies. You are responsible for how you use AI-generated content.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              3. Account Eligibility
            </h2>
            <p>
              You must be at least 13 years old to use ScholarX. If you are under 18, you represent that a parent
              or guardian has reviewed and agreed to these terms on your behalf.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              4. Fees, Subscriptions, and Billing
            </h2>
            <p>
              <strong>Freemium Model:</strong> ScholarX offers both free services (with daily limits) and paid
              premium subscriptions ("Premium Tier"). By upgrading to a Premium Tier, you agree to pay the monthly or
              annual subscription fees indicated at the time of purchase.
            </p>
            <p className="mt-2">
              <strong>Billing Cycle &amp; Auto-Renewal:</strong> Subscription fees are billed in advance on a recurring
              basis (monthly or annually) depending on the plan you select. Your subscription will automatically renew
              at the end of each billing cycle unless you cancel it through your account profile settings before your
              renewal date.
            </p>
            <p className="mt-2">
              <strong>Payment Processing:</strong> All payments are securely processed through our third-party payment
              gateway (Moyasar). ScholarX does not store your credit card or financial credentials on our servers. You
              agree to provide accurate and complete billing information.
            </p>
            <p className="mt-2">
              <strong>Refund Policy:</strong> To the maximum extent permitted by law, all subscription fees are
              non-refundable. We do not provide refunds or credits for partial subscription months, unused credits, or
              immediate downgrades.
            </p>
            <p className="mt-2">
              <strong>Changes to Fees:</strong> We reserve the right to modify our subscription fees and tier structures
              at any time. Any price changes will be communicated to you via email or a prominent notice on the Service
              at least 14 days before taking effect. Continued use of the Service after the price change constitutes
              agreement to the new fee.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              5. Prohibited Conduct
            </h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Attempting to reverse-engineer or scrape the Service.</li>
              <li>Submitting illegal, harmful, or abusive content.</li>
              <li>Sharing account credentials with others.</li>
              <li>Using the Service to generate misleading or harmful material.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              6. AI-Generated Content and Academic Integrity
            </h2>
            <p>
              <strong>No Academic Guarantees:</strong> Responses generated by the AI are provided for educational and
              informational purposes only. ScholarX makes no warranties, express or implied, regarding the accuracy,
              completeness, or reliability of AI outputs.
            </p>
            <p className="mt-2">
              <strong>Sole User Responsibility:</strong> You are entirely responsible for verifying any important facts,
              formulas, or code generated by ScholarX using authoritative sources, textbooks, or your instructors before
              submitting any schoolwork.
            </p>
            <p className="mt-2">
              <strong>Limitation of Academic Liability:</strong> ScholarX, its creators, and affiliates shall not be
              liable for any academic penalties, lowered grades, failing marks, school suspensions, academic
              probations, expulsions, or any other disciplinary actions taken against you by your educational
              institution. You acknowledge that using AI tools to complete assignments in violation of your school's
              rules constitutes academic dishonesty, and you assume all risks associated with such misuse.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              7. Service Availability
            </h2>
            <p>
              We strive to maintain uptime but do not guarantee uninterrupted access. We may update, modify, or
              discontinue the Service at any time with reasonable notice.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              8. Rate Limiting, Automated Access, and Fair Use
            </h2>
            <p>
              <strong>Infrastructure Protection:</strong> To ensure a stable, fair, and high-quality experience for all
              users and to prevent excessive infrastructure costs, ScholarX enforces strict rate limits on the number
              of messages, prompts, and API calls an account can make within a given period.
            </p>
            <p className="mt-2">
              <strong>Prohibited Automation:</strong> You are strictly prohibited from using automated scripts, bots,
              scrapers, web crawlers, browser extensions, or custom code to interact with our backend, send bulk
              queries, or bypass your assigned account credit limits.
            </p>
            <p className="mt-2">
              <strong>Suspension and Throttling:</strong> ScholarX reserves the right to immediately throttle,
              temporarily suspend, or permanently terminate your access to the Service without notice or refund if your
              account exhibits abnormal usage patterns, puts an unreasonable load on our servers, or appears to be
              utilizing automated tools to access the AI API.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              9. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, ScholarX shall not be liable for any indirect, incidental, or
              consequential damages arising from your use of the Service.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              10. Changes to Terms
            </h2>
            <p>
              We may update these terms from time to time. Continued use of the Service after changes constitutes
              acceptance of the updated terms.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              11. Contact
            </h2>
            <p>
              For questions about these terms, contact us at{" "}
              <a
                href="mailto:support@scholarx.space"
                className="text-primary underline underline-offset-2 hover:opacity-80"
              >
                support@scholarx.space
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
