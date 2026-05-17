import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/landing.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ScholarX — Your AI Study Companion" },
      {
        name: "description",
        content:
          "ScholarX is an AI tutor + study planner that explains Math, Science, English and History — built to help you learn, not cheat.",
      },
      { property: "og:title", content: "ScholarX — Your AI Study Companion" },
      {
        property: "og:description",
        content:
          "AI tutor with voice mode, math rendering, and a built-in study planner. Learn smarter, not shadier.",
      },
      { property: "og:url", content: "https://scholarx.space/" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "ScholarX — Your AI Study Companion" },
      {
        name: "twitter:description",
        content: "AI tutor with voice mode, math rendering, and a built-in study planner. Learn smarter, not shadier.",
      },
    ],
    links: [{ rel: "canonical", href: "https://scholarx.space/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": "https://scholarx.space/#website",
              url: "https://scholarx.space",
              name: "ScholarX",
              description:
                "AI homework helper that explains Math, Science, English and History — built to help students learn, not cheat.",
            },
            {
              "@type": "WebApplication",
              "@id": "https://scholarx.space/#app",
              name: "ScholarX",
              url: "https://scholarx.space",
              applicationCategory: "EducationApplication",
              operatingSystem: "Web",
              description:
                "AI tutor + study planner with voice mode, math rendering, flashcards, and practice tests.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            },
            {
              "@type": "Organization",
              "@id": "https://scholarx.space/#org",
              name: "ScholarX",
              url: "https://scholarx.space",
              logo: "https://scholarx.space/logo-removebg-preview.png",
            },
          ],
        }),
      },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/chat" });
  },
  component: Landing,
});

function Landing() {
  const rootRef = useRef<HTMLElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Scroll-reveal
  useEffect(() => {
    if (!rootRef.current) return;
    const els = rootRef.current.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <main className="landing" ref={rootRef}>
      <div className="aurora" aria-hidden="true" />
      <div className="landing-grid" aria-hidden="true" />

      {/* ---------- Mobile nav overlay ---------- */}
      <div className={`mobile-nav${mobileNavOpen ? " is-open" : ""}`} aria-modal="true" role="dialog" aria-label="Navigation menu">
        <div className="mobile-nav-header">
          <a href="/" className="landing-logo" onClick={closeMobileNav}>
            <span className="landing-logo-mark">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
              </svg>
            </span>
            <span>ScholarX</span>
          </a>
          <button className="mobile-nav-close" onClick={closeMobileNav} aria-label="Close menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <a href="#features" className="mobile-nav-link" onClick={closeMobileNav}>Features</a>
        <a href="#how" className="mobile-nav-link" onClick={closeMobileNav}>How it works</a>
        <a href="#planner" className="mobile-nav-link" onClick={closeMobileNav}>Planner</a>

        <div className="mobile-nav-divider" />

        <div className="mobile-nav-actions">
          <a href="/login" className="btn btn-outline btn-full">Sign in</a>
          <a href="/login?mode=signup" className="btn btn-gradient btn-full btn-glow">Get started free</a>
        </div>
      </div>

      {/* ---------- Header ---------- */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <a href="/" className="landing-logo">
            <span className="landing-logo-mark">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
              </svg>
            </span>
            <span>ScholarX</span>
          </a>

          <nav className="landing-nav" aria-label="Main navigation">
            {/* Desktop links */}
            <div className="nav-links">
              <a href="#features" className="nav-link">Features</a>
              <a href="#how" className="nav-link">How it works</a>
              <a href="#planner" className="nav-link">Planner</a>
            </div>
            {/* Desktop CTAs */}
            <a href="/login" className="btn btn-ghost nav-cta">Sign in</a>
            <a href="/login?mode=signup" className="btn btn-gradient nav-cta">Get started</a>
            {/* Mobile hamburger */}
            <button
              className="mobile-nav-btn"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileNavOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </button>
          </nav>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="section hero">
        <div className="hero-pill hero-animate">
          <span className="hero-pill-dot" />
          New · Voice tutor &amp; study planner
        </div>

        <h1 className="hero-title hero-animate delay-1">
          Homework, <span className="accent">decoded</span>.
          <br />
          Mind, <span className="accent">unlocked</span>.
        </h1>

        <p className="hero-sub hero-animate delay-2">
          A fancy AI tutor that explains Math, Science, English and History step by step —
          plus a built-in study planner that keeps you on track. Built to teach, not to do
          the work for you.
        </p>

        <div className="hero-actions hero-animate delay-3">
          <a href="/login?mode=signup" className="btn btn-gradient btn-lg btn-glow">
            Start learning free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </a>
          <a href="/login" className="btn btn-outline btn-lg">I have an account</a>
        </div>

        <div className="hero-stats hero-animate delay-4">
          <div className="stat">
            <div className="stat-num">4</div>
            <div className="stat-label">Core subjects</div>
          </div>
          <div className="stat">
            <div className="stat-num">24/7</div>
            <div className="stat-label">Always-on tutor</div>
          </div>
          <div className="stat">
            <div className="stat-num">$0</div>
            <div className="stat-label">To get started</div>
          </div>
        </div>
      </section>

      {/* ---------- Showcase preview ---------- */}
      <section className="section section-narrow">
        <div className="showcase reveal">
          <div className="showcase-bar" aria-hidden="true">
            <span /><span /><span />
          </div>
          <div className="showcase-body">
            <div className="bubble bubble-user">Solve 2x² + 5x − 3 = 0 and explain.</div>
            <div className="bubble bubble-ai">
              Use the quadratic formula <code>x = (−b ± √(b² − 4ac)) / 2a</code> with
              <code> a=2, b=5, c=−3</code>. The discriminant is 49, so √49 = 7.
              <br />→ <strong>x = 1/2</strong> or <strong>x = −3</strong>. Want me to walk you through factoring instead?
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" className="section">
        <div className="section-head reveal">
          <span className="section-eyebrow">Features</span>
          <h2 className="section-title">Everything you need to actually understand it</h2>
          <p className="section-sub">
            ScholarX isn't just a chat box. It's a full study toolkit — tutor, planner, and voice partner — wrapped in a design that doesn't feel like 2009.
          </p>
        </div>

        <div className="features">
          <div className="feature is-accent reveal">
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4" /><path d="m4.93 4.93 2.83 2.83" /><path d="M2 12h4" /><path d="m4.93 19.07 2.83-2.83" /><path d="M12 18v4" /><path d="m16.24 16.24 2.83 2.83" /><path d="M18 12h4" /><path d="m16.24 7.76 2.83-2.83" /><circle cx="12" cy="12" r="4" /></svg>
            </div>
            <h3 className="feature-title">AI tutor, on demand</h3>
            <p className="feature-desc">Step-by-step explanations tuned for students. Ask follow-ups, get analogies, request examples — until it actually clicks.</p>
          </div>

          <div className="feature is-math reveal delay-1">
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3-9 4 18 3-9h4" /></svg>
            </div>
            <h3 className="feature-title">Beautiful math rendering</h3>
            <p className="feature-desc">Equations render with KaTeX — fractions, integrals, matrices, all looking exactly like your textbook.</p>
          </div>

          <div className="feature is-sci reveal delay-2">
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19a7 7 0 0 0 7-7" /><path d="M12 19a7 7 0 0 1-7-7" /><circle cx="12" cy="5" r="3" /><path d="M12 8v4" /></svg>
            </div>
            <h3 className="feature-title">Voice tutor mode</h3>
            <p className="feature-desc">Talk it out. Ask questions out loud and get spoken answers — perfect for studying on the go or hands-free.</p>
          </div>

          <div className="feature is-eng reveal">
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="m9 16 2 2 4-4" /></svg>
            </div>
            <h3 className="feature-title">Built-in study planner</h3>
            <p className="feature-desc">Track assignments, deadlines, and priorities. See what's due, what's overdue, and what you've crushed — all in one view.</p>
          </div>

          <div className="feature is-hist reveal delay-1">
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
            </div>
            <h3 className="feature-title">Saved conversations</h3>
            <p className="feature-desc">Every chat is saved to your account so you can revisit explanations anytime — across phone, tablet, and laptop.</p>
          </div>

          <div className="feature is-accent reveal delay-2">
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></svg>
            </div>
            <h3 className="feature-title">Honesty-first</h3>
            <p className="feature-desc">ScholarX guides you to the answer rather than handing it over. Learn the why, not just the what.</p>
          </div>
        </div>

        <div className="subjects">
          <div className="subject-card reveal">
            <svg className="subject-icon" viewBox="0 0 24 24" fill="none" stroke="var(--math)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="16" height="20" x="4" y="2" rx="2" /><path d="M8 6h8" /><path d="M8 10h.01" /><path d="M12 10h.01" /><path d="M16 10h.01" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14v4" /></svg>
            <span className="subject-label">Math</span>
          </div>
          <div className="subject-card reveal delay-1">
            <svg className="subject-icon" viewBox="0 0 24 24" fill="none" stroke="var(--science)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 2v7.31" /><path d="M14 9.3V1.99" /><path d="M8.5 2h7" /><path d="M14 9.3a6.5 6.5 0 1 1-4 0" /></svg>
            <span className="subject-label">Science</span>
          </div>
          <div className="subject-card reveal delay-2">
            <svg className="subject-icon" viewBox="0 0 24 24" fill="none" stroke="var(--english)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
            <span className="subject-label">English</span>
          </div>
          <div className="subject-card reveal delay-3">
            <svg className="subject-icon" viewBox="0 0 24 24" fill="none" stroke="var(--history)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="3" x2="21" y1="22" y2="22" /><line x1="6" x2="6" y1="18" y2="11" /><line x1="10" x2="10" y1="18" y2="11" /><line x1="14" x2="14" y1="18" y2="11" /><line x1="18" x2="18" y1="18" y2="11" /><polygon points="12 2 20 7 4 7" /></svg>
            <span className="subject-label">History</span>
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="section">
        <div className="section-head reveal">
          <span className="section-eyebrow">How it works</span>
          <h2 className="section-title">Three steps to a smarter study session</h2>
        </div>
        <div className="steps">
          <div className="step reveal">
            <div className="step-num">STEP 01</div>
            <h3 className="step-title">Ask anything</h3>
            <p className="step-desc">Drop in a question, an equation, or a paragraph you don't understand. Type it or say it out loud.</p>
          </div>
          <div className="step reveal delay-1">
            <div className="step-num">STEP 02</div>
            <h3 className="step-title">Learn step-by-step</h3>
            <p className="step-desc">ScholarX breaks the problem down, shows the reasoning, and waits while you catch up — not faster, but clearer.</p>
          </div>
          <div className="step reveal delay-2">
            <div className="step-num">STEP 03</div>
            <h3 className="step-title">Plan &amp; conquer</h3>
            <p className="step-desc">Add what's due to the planner. Tick things off. Watch your week stop being scary.</p>
          </div>
        </div>
      </section>

      {/* ---------- Planner teaser ---------- */}
      <section id="planner" className="section">
        <div className="section-head reveal">
          <span className="section-eyebrow">New</span>
          <h2 className="section-title">Your study planner, finally not boring</h2>
          <p className="section-sub">
            See every assignment, deadline and priority in one quiet, glassy interface. Built right into ScholarX — no extra app, no extra account.
          </p>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="section">
        <div className="cta reveal">
          <h2 className="cta-title">
            Ready to make homework{" "}
            <span style={{ background: "var(--gradient-primary)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              actually click
            </span>
            ?
          </h2>
          <p className="cta-sub">Free to start. No credit card. Built for curious students.</p>
          <a href="/login?mode=signup" className="btn btn-gradient btn-lg btn-glow">Create your free account</a>

          <div className="honesty">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="M12 8v4" /><path d="M12 16h.01" />
            </svg>
            <p>
              <strong>Learn, don't cheat.</strong> ScholarX is built to explain and tutor. Submitting AI-written answers as your own may violate your school's academic honesty policy.
            </p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} ScholarX · Built for students who want to actually understand it.</span>
        <span className="flex items-center gap-3 text-xs opacity-70">
          <Link to="/privacy" className="hover:opacity-100 transition-opacity">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:opacity-100 transition-opacity">Terms of Service</Link>
        </span>
      </footer>
    </main>
  );
}
