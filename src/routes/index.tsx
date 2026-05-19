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
          "ScholarX is an AI study toolkit — AI tutor, flashcards, practice tests, a graphing calculator, and a study planner for Math, Science, English and History. Built to help you learn, not cheat.",
      },
      { property: "og:title", content: "ScholarX — Your AI Study Companion" },
      {
        property: "og:description",
        content:
          "AI tutor with voice conversation, math rendering, flashcards with spaced repetition, practice tests, a Desmos graphing calculator, and a study planner. Learn smarter.",
      },
      { property: "og:url", content: "https://scholarx.space/" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "ScholarX — Your AI Study Companion" },
      {
        name: "twitter:description",
        content: "AI tutor, flashcards, practice tests, graphing calculator, and study planner — all free. Learn smarter.",
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
                "AI study toolkit — tutor, flashcards with spaced repetition, practice tests, graphing calculator, and study planner for Math, Science, English and History.",
            },
            {
              "@type": "WebApplication",
              "@id": "https://scholarx.space/#app",
              name: "ScholarX",
              url: "https://scholarx.space",
              applicationCategory: "EducationApplication",
              operatingSystem: "Web",
              description:
                "AI tutor with voice conversation, KaTeX math rendering, Desmos graphing, AI flashcards with spaced repetition, practice test creator, and a study planner with progress tracking.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            },
            {
              "@type": "Organization",
              "@id": "https://scholarx.space/#org",
              name: "ScholarX",
              url: "https://scholarx.space",
              logo: "https://scholarx.space/logo-favicon.png",
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
            <img src="/logo-favicon.png" className="h-6 w-6 object-contain" alt="" aria-hidden="true" />
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
        <a href="#support" className="mobile-nav-link" onClick={closeMobileNav}>Support</a>

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
            <img src="/logo-favicon.png" className="h-6 w-6 object-contain" alt="" aria-hidden="true" />
            <span>ScholarX</span>
          </a>

          <nav className="landing-nav" aria-label="Main navigation">
            {/* Desktop links */}
            <div className="nav-links">
              <a href="#features" className="nav-link">Features</a>
              <a href="#how" className="nav-link">How it works</a>
              <a href="#planner" className="nav-link">Planner</a>
              <a href="#support" className="nav-link">Support</a>
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
          AI tutor · Flashcards · Tests · Graphing · Planner
        </div>

        <h1 className="hero-title hero-animate delay-1">
          Homework, <span className="accent">decoded</span>.
          <br />
          Mind, <span className="accent">unlocked</span>.
        </h1>

        <p className="hero-sub hero-animate delay-2">
          ScholarX is a full AI study toolkit — step-by-step tutoring for Math, Science, English and History,
          plus flashcards, practice tests, a graphing calculator, and a study planner, all in one place.
          Built to help you understand, not just answer.
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
            <div className="stat-num">7</div>
            <div className="stat-label">Tools built-in</div>
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
            ScholarX isn't just a chat box. It's a complete study toolkit — AI tutor, voice conversation, flashcards, practice tests, a graphing calculator, and a study planner, all in one place.
          </p>
        </div>

        <div className="features">
          <Link to="/chat" className="feature is-accent reveal" style={{ textDecoration: "none", cursor: "pointer" }}>
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4" /><path d="m4.93 4.93 2.83 2.83" /><path d="M2 12h4" /><path d="m4.93 19.07 2.83-2.83" /><path d="M12 18v4" /><path d="m16.24 16.24 2.83 2.83" /><path d="M18 12h4" /><path d="m16.24 7.76 2.83-2.83" /><circle cx="12" cy="12" r="4" /></svg>
            </div>
            <h3 className="feature-title">AI tutor, on demand</h3>
            <p className="feature-desc">Step-by-step explanations tuned for students. Ask follow-ups, get analogies, request examples — until it actually clicks.</p>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", marginTop: "0.75rem", fontSize: "0.82rem", fontWeight: 600, color: "var(--primary)", opacity: 0.85 }}>
              Learn more
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </span>
          </Link>

          <Link to="/graph" className="feature is-math reveal delay-1" style={{ textDecoration: "none", cursor: "pointer" }}>
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3-9 4 18 3-9h4" /></svg>
            </div>
            <h3 className="feature-title">Math rendering &amp; graphing</h3>
            <p className="feature-desc">Equations render with KaTeX — fractions, integrals, matrices. Click any formula to instantly graph it in the built-in Desmos calculator.</p>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", marginTop: "0.75rem", fontSize: "0.82rem", fontWeight: 600, color: "var(--math)", opacity: 0.85 }}>
              Learn more
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </span>
          </Link>

          <Link to="/chat" className="feature is-sci reveal delay-2" style={{ textDecoration: "none", cursor: "pointer" }}>
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </div>
            <h3 className="feature-title">Voice conversation mode</h3>
            <p className="feature-desc">Go fully hands-free — speak your question, hear the answer, ask a follow-up, all by voice. Or just use the mic to dictate questions when typing isn't convenient.</p>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", marginTop: "0.75rem", fontSize: "0.82rem", fontWeight: 600, color: "var(--science)", opacity: 0.85 }}>
              Learn more
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </span>
          </Link>

          <Link to="/flashcards" className="feature is-eng reveal" style={{ textDecoration: "none", cursor: "pointer" }}>
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/><path d="m9 13 2 2 4-4"/></svg>
            </div>
            <h3 className="feature-title">AI flashcards &amp; spaced repetition</h3>
            <p className="feature-desc">Generate a full deck from any topic in seconds. Study with smart spaced repetition (SM-2 algorithm) so you review cards at exactly the right time — not too soon, not too late.</p>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", marginTop: "0.75rem", fontSize: "0.82rem", fontWeight: 600, color: "var(--english)", opacity: 0.85 }}>
              Learn more
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </span>
          </Link>

          <Link to="/tests" className="feature is-hist reveal delay-1" style={{ textDecoration: "none", cursor: "pointer" }}>
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6"/><path d="M9 18h6"/><path d="M9 12h1"/></svg>
            </div>
            <h3 className="feature-title">Practice test creator</h3>
            <p className="feature-desc">Generate multiple-choice or essay tests on any topic. Answer interactively, see your MCQ score, reveal model answers, and export to PDF or Markdown.</p>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", marginTop: "0.75rem", fontSize: "0.82rem", fontWeight: 600, color: "var(--history)", opacity: 0.85 }}>
              Learn more
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </span>
          </Link>

          <Link to="/chat" className="feature is-accent reveal delay-2" style={{ textDecoration: "none", cursor: "pointer" }}>
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </div>
            <h3 className="feature-title">Photo problem solver</h3>
            <p className="feature-desc">Snap or upload a photo of a textbook problem, diagram, or handwritten work — ScholarX reads it and walks you through the solution step by step.</p>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", marginTop: "0.75rem", fontSize: "0.82rem", fontWeight: 600, color: "var(--primary)", opacity: 0.85 }}>
              Learn more
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </span>
          </Link>
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
            <p className="step-desc">Type a question, upload a photo of a problem, or speak it aloud. Ask about Math, Science, English, or History.</p>
          </div>
          <div className="step reveal delay-1">
            <div className="step-num">STEP 02</div>
            <h3 className="step-title">Learn step-by-step</h3>
            <p className="step-desc">ScholarX breaks the problem down, shows the reasoning, and waits while you catch up — not faster, but clearer.</p>
          </div>
          <div className="step reveal delay-2">
            <div className="step-num">STEP 03</div>
            <h3 className="step-title">Drill &amp; prepare</h3>
            <p className="step-desc">Turn what you've learned into flashcards, run a practice test before the big day, and track it all in the planner.</p>
          </div>
        </div>
      </section>

      {/* ---------- Planner teaser ---------- */}
      <section id="planner" className="section">
        <div className="section-head reveal">
          <span className="section-eyebrow">Planner &amp; Progress</span>
          <h2 className="section-title">Your study hub, all in one place</h2>
          <p className="section-sub">
            Track assignments, deadlines, and priorities in the planner. Then watch your progress grow — chat activity, flashcard decks, and test scores all visualised in one dashboard. Built right into ScholarX, no extra app needed.
          </p>
        </div>
        <div className="steps reveal" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", maxWidth: "48rem", margin: "0 auto" }}>
          <Link to="/planner" style={{ textDecoration: "none" }}>
            <div className="step" style={{ height: "100%" }}>
              <div className="step-num">Planner</div>
              <h3 className="step-title">Task &amp; deadline tracker</h3>
              <p className="step-desc">Add tasks, set due dates and priorities, and check things off as you go.</p>
            </div>
          </Link>
          <Link to="/progress" style={{ textDecoration: "none" }}>
            <div className="step" style={{ height: "100%" }}>
              <div className="step-num">Progress</div>
              <h3 className="step-title">Stats &amp; analytics</h3>
              <p className="step-desc">See your chat activity, flashcard reviews, and test scores in one dashboard.</p>
            </div>
          </Link>
          <Link to="/study" style={{ textDecoration: "none" }}>
            <div className="step" style={{ height: "100%" }}>
              <div className="step-num">Study Guide</div>
              <h3 className="step-title">Instant structured notes</h3>
              <p className="step-desc">Turn any topic into an organized study guide with key concepts and examples.</p>
            </div>
          </Link>
        </div>
      </section>

      {/* ---------- Support / FAQ ---------- */}
      <section id="support" className="section">
        <div className="section-head reveal">
          <span className="section-eyebrow">Help &amp; Support</span>
          <h2 className="section-title">Frequently asked questions</h2>
          <p className="section-sub">
            Quick answers to common questions. Need more help?{" "}
            <Link to="/support" className="underline hover:opacity-80">Visit the full support page</Link>{" "}
            or email us at{" "}
            <a href="mailto:support@scholarx.app" className="underline hover:opacity-80">support@scholarx.app</a>.
          </p>
        </div>

        <div className="steps reveal" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <div className="step reveal">
            <div className="step-num">Q</div>
            <h3 className="step-title">Is ScholarX free?</h3>
            <p className="step-desc">Yes — 100% free. No credit card, no subscription, no hidden fees. Create an account and start learning immediately.</p>
          </div>
          <div className="step reveal delay-1">
            <div className="step-num">Q</div>
            <h3 className="step-title">What subjects are supported?</h3>
            <p className="step-desc">Math, Science, English, and History — with a general mode for anything else. Photo problem-solving works across all subjects.</p>
          </div>
          <div className="step reveal delay-2">
            <div className="step-num">Q</div>
            <h3 className="step-title">Is my data private?</h3>
            <p className="step-desc">Your conversations are stored securely in your account and are never shared with third parties or used to train AI models.</p>
          </div>
          <div className="step reveal">
            <div className="step-num">Q</div>
            <h3 className="step-title">Can I use it on mobile?</h3>
            <p className="step-desc">Yes. ScholarX is fully responsive and works in any modern mobile browser. Voice input and voice conversation mode are supported too.</p>
          </div>
          <div className="step reveal delay-1">
            <div className="step-num">Q</div>
            <h3 className="step-title">Can I upload photos of problems?</h3>
            <p className="step-desc">Yes — tap the image icon in the chat to upload a photo of a textbook question or handwritten problem. ScholarX will solve and explain it.</p>
          </div>
          <div className="step reveal delay-2">
            <div className="step-num">Q</div>
            <h3 className="step-title">How do I reset my password?</h3>
            <p className="step-desc">On the sign-in page, click "Forgot your password?" and enter your email. You'll receive a reset link within a few minutes.</p>
          </div>
        </div>

        <div className="reveal" style={{ textAlign: "center", marginTop: "2rem" }}>
          <Link to="/support" className="btn btn-outline">View all FAQs →</Link>
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
          <Link to="/support" className="hover:opacity-100 transition-opacity">Help</Link>
          <span>·</span>
          <Link to="/privacy" className="hover:opacity-100 transition-opacity">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:opacity-100 transition-opacity">Terms of Service</Link>
        </span>
      </footer>
    </main>
  );
}
