import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import "@/styles/landing.css";

export type FeatureId =
  | "chat"
  | "flashcards"
  | "tests"
  | "study"
  | "research"
  | "planner"
  | "progress"
  | "graph";

type FeatureDef = {
  name: string;
  pill: string;
  headlineA: string;
  accentWord: string;
  headlineB?: string;
  sub: string;
  steps: { num: string; title: string; desc: string }[];
  highlights: { icon: React.ReactNode; title: string; desc: string; colorClass?: string }[];
};

const ChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4" /><path d="m4.93 4.93 2.83 2.83" /><path d="M2 12h4" /><path d="m4.93 19.07 2.83-2.83" />
    <path d="M12 18v4" /><path d="m16.24 16.24 2.83 2.83" /><path d="M18 12h4" /><path d="m16.24 7.76 2.83-2.83" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);
const FlashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="14" rx="2" /><path d="M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" /><path d="m9 13 2 2 4-4" />
  </svg>
);
const TestIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" /><path d="M9 15h6" /><path d="M9 18h6" /><path d="M9 12h1" />
  </svg>
);
const StudyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
  </svg>
);
const ResearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const PlannerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
    <path d="m9 16 2 2 4-4" />
  </svg>
);
const ProgressIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12h4l3-9 4 18 3-9h4" />
  </svg>
);
const GraphIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const VoiceIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);
const PhotoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);
const MathIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12h4l3-9 4 18 3-9h4" />
  </svg>
);
const SrsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" /><path d="M12 7v5l4 2" />
  </svg>
);
const ExportIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);
const ScoreIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);
const EssayIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const ListIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" />
    <line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" />
    <line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" />
  </svg>
);
const PriorityIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 8 4-4 4 4" /><path d="M7 4v16" /><path d="M11 12h4" /><path d="M11 16h7" /><path d="M11 20h10" />
  </svg>
);
const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const DesmosIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const TouchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" /><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
    <path d="M10 10.5a2 2 0 0 0-2-2a2 2 0 0 0-2 2V19a5 5 0 0 0 5 5h2a5 5 0 0 0 5-5v-5a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
  </svg>
);
const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" />
    <line x1="6" x2="6" y1="20" y2="14" />
  </svg>
);

const FEATURES: Record<FeatureId, FeatureDef> = {
  chat: {
    name: "AI Tutor",
    pill: "AI Tutor · Voice · Photos",
    headlineA: "Homework,",
    accentWord: "decoded",
    headlineB: "on demand.",
    sub: "Ask any question in Math, Science, English, or History. Get clear step-by-step explanations — not just answers. Ask follow-ups, use voice, or upload a photo of your problem.",
    steps: [
      { num: "01", title: "Ask anything", desc: "Type a question, speak it aloud, or upload a photo of a textbook problem. Any subject, any level." },
      { num: "02", title: "Get step-by-step help", desc: "ScholarX breaks problems down clearly and waits for you to catch up — not faster, but clearer." },
      { num: "03", title: "Keep going", desc: "Ask follow-ups, switch to voice, or turn what you've learned into a flashcard deck or practice test." },
    ],
    highlights: [
      { icon: <VoiceIcon />, title: "Voice conversation", desc: "Go hands-free — speak your question and hear the answer. Full back-and-forth voice mode." },
      { icon: <PhotoIcon />, title: "Photo problem solver", desc: "Snap or upload a photo of any textbook page or handwritten problem. ScholarX reads and solves it." },
      { icon: <MathIcon />, title: "Math rendering", desc: "Equations render beautifully with KaTeX — fractions, integrals, matrices, and more." },
    ],
  },
  flashcards: {
    name: "Flashcards",
    pill: "Flashcards · Spaced Repetition",
    headlineA: "Turn any topic into",
    accentWord: "smart",
    headlineB: "study cards.",
    sub: "Generate a full flashcard deck from any topic in seconds. Study with the SM-2 spaced repetition algorithm so you review cards at exactly the right time — not too soon, not too late.",
    steps: [
      { num: "01", title: "Enter a topic", desc: "Type any topic or concept — from photosynthesis to quadratic equations, in any subject." },
      { num: "02", title: "Get instant cards", desc: "AI generates a complete Q&A deck tailored to your topic in seconds." },
      { num: "03", title: "Study smarter", desc: "Rate each card as Easy, Hard, or Again. The algorithm schedules future reviews automatically." },
    ],
    highlights: [
      { icon: <SrsIcon />, title: "SM-2 spaced repetition", desc: "The same algorithm used by Anki — proven to maximize retention and minimize study time." },
      { icon: <FlashIcon />, title: "Instant deck generation", desc: "Generate a ready-to-study deck on any topic in under 10 seconds." },
      { icon: <ExportIcon />, title: "Export to CSV or PDF", desc: "Save and print your flashcard decks for offline study or sharing." },
    ],
  },
  tests: {
    name: "Practice Tests",
    pill: "Tests · MCQ · Essay · Auto-grading",
    headlineA: "Practice tests that",
    accentWord: "actually",
    headlineB: "prepare you.",
    sub: "Generate multiple-choice or essay tests on any topic. Answer interactively, get your MCQ score instantly, and see AI-written model answers — all without leaving ScholarX.",
    steps: [
      { num: "01", title: "Pick a topic and format", desc: "Choose multiple-choice, essay, or a mix. Set how many questions you want — up to 20." },
      { num: "02", title: "Take the test", desc: "Answer questions interactively. Multiple-choice answers are checked on the spot." },
      { num: "03", title: "Review and export", desc: "See your MCQ score, read model answers, and export the whole test to PDF or Markdown." },
    ],
    highlights: [
      { icon: <TestIcon />, title: "MCQ + essay in one test", desc: "Mix question formats to match real exam styles. You control the balance." },
      { icon: <ScoreIcon />, title: "Instant MCQ scoring", desc: "See which answers were right or wrong the moment you finish, with explanations." },
      { icon: <EssayIcon />, title: "AI-graded essays", desc: "Submit essay answers and get detailed feedback and a model answer from ScholarX." },
    ],
  },
  study: {
    name: "Study Guide",
    pill: "Study Guides · Structured Notes",
    headlineA: "Structured study guides,",
    accentWord: "instantly",
    headlineB: undefined,
    sub: "Turn any topic into a clear, organized study guide with key concepts, summaries, definitions, and worked examples — ready in seconds, no formatting needed.",
    steps: [
      { num: "01", title: "Enter a topic", desc: "Type any subject or chapter — from Newton's laws to the causes of the First World War." },
      { num: "02", title: "Get a structured guide", desc: "ScholarX generates an organized outline with key points, definitions, and examples." },
      { num: "03", title: "Study or export", desc: "Read through the guide inline, or export it to Markdown for your own notes." },
    ],
    highlights: [
      { icon: <StudyIcon />, title: "Key concepts first", desc: "Every guide leads with the most important points, clearly explained and in order." },
      { icon: <MathIcon />, title: "Examples included", desc: "Concepts are paired with worked examples so they're concrete, not abstract." },
      { icon: <ExportIcon />, title: "Export to Markdown", desc: "Copy or download your guide in Markdown for use in Notion, Obsidian, or anywhere else." },
    ],
  },
  research: {
    name: "Research Mode",
    pill: "Research Mode · Deep Dives",
    headlineA: "Go",
    accentWord: "deeper",
    headlineB: "on any topic.",
    sub: "Research mode builds a structured, in-depth overview of any topic — great for essays, projects, and getting the full picture before a big exam.",
    steps: [
      { num: "01", title: "Enter your topic", desc: "Type a topic, question, or theme you want to understand in depth." },
      { num: "02", title: "Get a structured breakdown", desc: "ScholarX organizes the topic into clearly labelled sections with explanations and context." },
      { num: "03", title: "Drill in further", desc: "Ask follow-up questions to explore any section, or use the output as a foundation for writing." },
    ],
    highlights: [
      { icon: <ResearchIcon />, title: "Structured overviews", desc: "Topics are broken into logical sections — no more walls of unstructured text." },
      { icon: <StudyIcon />, title: "Great for essays", desc: "Use the research output as a scaffold for your own writing or revision notes." },
      { icon: <ChatIcon />, title: "Linked to AI tutor", desc: "Jump between research mode and the chat tutor to explore anything in more depth." },
    ],
  },
  planner: {
    name: "Study Planner",
    pill: "Planner · Tasks · Deadlines",
    headlineA: "Stay on top of",
    accentWord: "every",
    headlineB: "deadline.",
    sub: "Organize your assignments and study tasks in one place. Set due dates, priorities, and notes — then check things off as you go.",
    steps: [
      { num: "01", title: "Add your tasks", desc: "Create tasks with a title, due date, priority level, and optional notes." },
      { num: "02", title: "Organize by priority", desc: "See what's urgent at a glance. Sort and filter by due date or priority." },
      { num: "03", title: "Check things off", desc: "Mark tasks complete as you finish them and stay focused on what's next." },
    ],
    highlights: [
      { icon: <PriorityIcon />, title: "Priority levels", desc: "Tag tasks as Low, Medium, or High priority to focus on what matters most right now." },
      { icon: <PlannerIcon />, title: "Due dates", desc: "Set deadlines so nothing sneaks up on you before exam season." },
      { icon: <CheckIcon />, title: "Simple and fast", desc: "No bloat — just a clean, fast task list built for students with real deadlines." },
    ],
  },
  progress: {
    name: "Progress Dashboard",
    pill: "Progress · Analytics · Stats",
    headlineA: "See exactly",
    accentWord: "how far",
    headlineB: "you've come.",
    sub: "Track your chat sessions, flashcard performance, and test scores in one dashboard. Understand what you're studying and where you're improving — automatically.",
    steps: [
      { num: "01", title: "Study normally", desc: "Use the AI tutor, flashcards, and practice tests as you normally would." },
      { num: "02", title: "Watch your stats update", desc: "The dashboard updates automatically — no manual logging or tracking needed." },
      { num: "03", title: "Spot the gaps", desc: "See which subjects you study most and where scores are lower, so you can focus revision where it counts." },
    ],
    highlights: [
      { icon: <ChartIcon />, title: "Chat activity", desc: "See how many conversations you've had and your most-studied subjects over time." },
      { icon: <FlashIcon />, title: "Flashcard stats", desc: "Track how many cards you've reviewed, and your due vs. ready breakdown per deck." },
      { icon: <ScoreIcon />, title: "Test scores", desc: "See your MCQ scores over time and identify topics that need more revision." },
    ],
  },
  graph: {
    name: "Graphing Calculator",
    pill: "Graphing Calculator · Desmos",
    headlineA: "Visualize math",
    accentWord: "instantly",
    headlineB: undefined,
    sub: "The full Desmos graphing calculator built right into ScholarX. Plot functions, explore equations, and see the math behind the numbers — on any device.",
    steps: [
      { num: "01", title: "Type an equation", desc: "Enter any function — from y=x² to polar curves, parametric equations, and implicit relations." },
      { num: "02", title: "See it graphed instantly", desc: "The graph updates in real time as you type. Zoom, pan, and explore with sliders." },
      { num: "03", title: "Use alongside the tutor", desc: "Click any formula in the AI tutor to send it straight to the graph with one click." },
    ],
    highlights: [
      { icon: <DesmosIcon />, title: "Full Desmos power", desc: "Everything Desmos can do — sliders, multiple functions, polar, parametric, and more." },
      { icon: <ChatIcon />, title: "Linked to the AI tutor", desc: "Formulas from the tutor can be graphed instantly — no copy-pasting needed." },
      { icon: <TouchIcon />, title: "Works on mobile", desc: "Touch-friendly interface for on-the-go graphing on any phone or tablet." },
    ],
  },
};

const FEATURE_COLORS: Record<FeatureId, string> = {
  chat: "var(--primary)",
  flashcards: "var(--english)",
  tests: "var(--history)",
  study: "var(--science)",
  research: "var(--math)",
  planner: "var(--primary)",
  progress: "var(--science)",
  graph: "var(--math)",
};

export function FeatureLanding({ feature }: { feature: FeatureId }) {
  const rootRef = useRef<HTMLElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const def = FEATURES[feature];
  const accentColor = FEATURE_COLORS[feature];

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

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <main className="landing" ref={rootRef}>
      <div className="aurora" aria-hidden="true" />
      <div className="landing-grid" aria-hidden="true" />

      {/* ---------- Mobile nav ---------- */}
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
        <a href="/#features" className="mobile-nav-link" onClick={closeMobileNav}>Features</a>
        <a href="/#how" className="mobile-nav-link" onClick={closeMobileNav}>How it works</a>
        <a href="/#planner" className="mobile-nav-link" onClick={closeMobileNav}>Planner</a>
        <a href="/support" className="mobile-nav-link" onClick={closeMobileNav}>Support</a>
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
            <div className="nav-links">
              <a href="/#features" className="nav-link">Features</a>
              <a href="/#how" className="nav-link">How it works</a>
              <a href="/#planner" className="nav-link">Planner</a>
              <a href="/support" className="nav-link">Support</a>
            </div>
            <a href="/login" className="btn btn-ghost nav-cta">Sign in</a>
            <a href="/login?mode=signup" className="btn btn-gradient nav-cta">Get started</a>
            <button
              className="mobile-nav-btn"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileNavOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </button>
          </nav>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="section hero">
        <div className="hero-pill hero-animate">
          <span className="hero-pill-dot" />
          {def.pill}
        </div>

        <h1 className="hero-title hero-animate delay-1">
          {def.headlineA}{" "}
          <span className="accent" style={{ background: `var(--gradient-primary)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            {def.accentWord}
          </span>
          {def.headlineB ? (
            <>
              <br />
              {def.headlineB}
            </>
          ) : "."}
        </h1>

        <p className="hero-sub hero-animate delay-2">{def.sub}</p>

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
            <div className="stat-num">Free</div>
            <div className="stat-label">No credit card</div>
          </div>
          <div className="stat">
            <div className="stat-num">7</div>
            <div className="stat-label">Tools built-in</div>
          </div>
          <div className="stat">
            <div className="stat-num">24/7</div>
            <div className="stat-label">Always available</div>
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="section">
        <div className="section-head reveal">
          <span className="section-eyebrow">How it works</span>
          <h2 className="section-title">Three steps to get started</h2>
        </div>
        <div className="steps">
          {def.steps.map((step, i) => (
            <div key={step.num} className={`step reveal${i > 0 ? ` delay-${i}` : ""}`}>
              <div className="step-num">STEP {step.num}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Highlights ---------- */}
      <section className="section">
        <div className="section-head reveal">
          <span className="section-eyebrow">What you get</span>
          <h2 className="section-title">Everything included, free</h2>
          <p className="section-sub">
            {def.name} is one of seven tools built into ScholarX — all free, all in one place.
          </p>
        </div>
        <div className="features" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))" }}>
          {def.highlights.map((h, i) => (
            <div key={h.title} className={`feature reveal${i > 0 ? ` delay-${i}` : ""}`}>
              <div className="feature-icon" style={{ color: accentColor, background: `color-mix(in oklab, ${accentColor} 15%, transparent)`, borderColor: `color-mix(in oklab, ${accentColor} 35%, transparent)` }}>
                {h.icon}
              </div>
              <h3 className="feature-title">{h.title}</h3>
              <p className="feature-desc">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Other features teaser ---------- */}
      <section className="section">
        <div className="section-head reveal">
          <span className="section-eyebrow">Also in ScholarX</span>
          <h2 className="section-title">The full study toolkit</h2>
          <p className="section-sub">
            One free account gets you every tool ScholarX offers — AI tutor, flashcards, tests, graphing calculator, study planner, and more.
          </p>
        </div>
        <div className="steps reveal" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))" }}>
          {(Object.entries(FEATURES) as [FeatureId, FeatureDef][])
            .filter(([id]) => id !== feature)
            .slice(0, 3)
            .map(([id, f], i) => (
              <Link
                key={id}
                to={`/${id}`}
                className={`step reveal delay-${i + 1}`}
                style={{ textDecoration: "none", display: "block" }}
              >
                <div className="step-num" style={{ color: FEATURE_COLORS[id] }}>{f.name}</div>
                <h3 className="step-title">{f.pill.split("·")[0].trim()}</h3>
                <p className="step-desc">{f.sub.slice(0, 90)}…</p>
              </Link>
            ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="section">
        <div className="cta reveal">
          <h2 className="cta-title">
            Ready to try{" "}
            <span style={{ background: "var(--gradient-primary)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              {def.name}
            </span>
            ?
          </h2>
          <p className="cta-sub">Free to start. No credit card. All seven tools included.</p>
          <a href="/login?mode=signup" className="btn btn-gradient btn-lg btn-glow">Create your free account</a>
          <div className="honesty">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
              <path d="M12 8v4" /><path d="M12 16h.01" />
            </svg>
            <p>
              <strong>Learn, don't cheat.</strong> ScholarX is built to explain and tutor — not to do your work for you. Use it to understand, not just to copy.
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
