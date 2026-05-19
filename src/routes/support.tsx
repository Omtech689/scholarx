import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, Mail, LifeBuoy, MessageSquare, BookOpen, Layers, ListTodo, MessagesSquare } from "lucide-react";
import { openTawkChat } from "@/components/tawkto";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Help & Support — ScholarX" },
      {
        name: "description",
        content:
          "Get help with ScholarX — answers to common questions, how-to guides, and contact information.",
      },
      { property: "og:title", content: "Help & Support — ScholarX" },
      {
        property: "og:description",
        content: "Answers to common questions about ScholarX — AI tutor, flashcards, practice tests, planner, and more.",
      },
    ],
    links: [{ rel: "canonical", href: "https://scholarx.space/support" }],
  }),
  component: SupportPage,
});

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is ScholarX completely free?",
    a: "Yes. ScholarX is 100% free — no credit card, no subscription, no hidden fees. Just create an account and start learning.",
  },
  {
    q: "What subjects does ScholarX support?",
    a: "ScholarX supports Math, Science, English, and History. You can also ask general questions outside those subjects in the chat.",
  },
  {
    q: "Is my data private and secure?",
    a: "Yes. Your conversations are stored securely in your account and are never shared with third parties or used to train AI models. You can delete your conversation history at any time from the chat sidebar.",
  },
  {
    q: "Can I use ScholarX on my phone?",
    a: "Yes. ScholarX is fully responsive and works on phones and tablets in any modern browser. Voice input and voice conversation mode are also supported on compatible mobile browsers.",
  },
  {
    q: "How do I reset my password?",
    a: 'Go to the sign-in page and click "Forgot your password?" — enter your email address and you\'ll receive a password reset link within a few minutes.',
  },
  {
    q: "How does spaced repetition work in flashcards?",
    a: "ScholarX uses the SM-2 spaced repetition algorithm. After each review you rate how well you remembered the card, and the algorithm schedules the next review accordingly — easy cards come back later, hard ones sooner.",
  },
  {
    q: "Can I upload a photo of a problem?",
    a: "Yes. In the chat composer, tap the image icon to upload a photo of a textbook problem, diagram, or handwritten work. ScholarX will read it and walk you through the solution step by step.",
  },
  {
    q: "What is voice conversation mode?",
    a: "Voice conversation mode lets you speak your question and hear the answer — fully hands-free. It uses your browser's speech recognition and text-to-speech. Tap the headphones icon in the chat to start.",
  },
  {
    q: "Can I export my notes, flashcards, or test results?",
    a: "Yes. Study guides, practice tests, and chat conversations can be exported to Markdown or PDF directly from the page header.",
  },
  {
    q: "Does using ScholarX violate academic honesty policies?",
    a: "ScholarX is built to explain and tutor — not to write answers for you to submit. Using AI-generated text as your own work may violate your school's academic honesty policy. Use it to understand, not to copy.",
  },
  {
    q: "How do I delete my account?",
    a: "To delete your account and all associated data, please email us at support@scholarx.app from your registered email address and we'll process the request promptly.",
  },
  {
    q: "The AI gave me a wrong answer — what should I do?",
    a: "AI tutors can occasionally make mistakes, especially on complex problems. Always double-check answers against your textbook or teacher. If you spot a consistent issue, please let us know at support@scholarx.app.",
  },
];

const QUICK_LINKS = [
  { icon: MessageSquare, label: "AI Tutor (Chat)", to: "/chat" as const },
  { icon: Layers, label: "Flashcards", to: "/flashcards" as const },
  { icon: BookOpen, label: "Practice Tests", to: "/tests" as const },
  { icon: ListTodo, label: "Study Planner", to: "/planner" as const },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-0 py-4 text-left text-sm font-medium transition hover:text-primary"
        aria-expanded={open}
      >
        <span>{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

function SupportPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <img src="/logo-favicon.png" className="h-7 w-7 object-contain" alt="ScholarX" />
            ScholarX
          </Link>
          <Link to="/login" search={{ mode: "signin" as const }} className="text-sm text-muted-foreground hover:text-foreground transition">
            Sign in →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Hero */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <LifeBuoy className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Help &amp; Support</h1>
          <p className="mt-2 text-muted-foreground">
            Find answers to common questions or get in touch with us.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* FAQ — takes up 2 columns */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">Frequently asked questions</h2>
            <div className="glass rounded-xl px-6">
              {FAQ.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>

          {/* Sidebar — contact + quick links */}
          <div className="space-y-6">
            {/* Contact */}
            <div className="glass rounded-xl p-6">
              <h2 className="mb-3 text-base font-semibold">Contact us</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Didn't find what you were looking for? Chat with us live or send an email.
              </p>
              <div className="space-y-2">
                <button
                  onClick={openTawkChat}
                  className="flex w-full items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  <MessagesSquare className="h-4 w-4" />
                  Chat with us
                </button>
                <a
                  href="mailto:support@scholarx.app"
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:text-foreground hover:bg-accent"
                >
                  <Mail className="h-4 w-4" />
                  support@scholarx.app
                </a>
              </div>
            </div>

            {/* Quick links */}
            <div className="glass rounded-xl p-6">
              <h2 className="mb-3 text-base font-semibold">Quick links</h2>
              <div className="space-y-2">
                {QUICK_LINKS.map(({ icon: Icon, label, to }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Account links */}
            <div className="glass rounded-xl p-6">
              <h2 className="mb-3 text-base font-semibold">Account</h2>
              <div className="space-y-2">
                <Link
                  to="/login"
                  search={{ mode: "signup" as const }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                >
                  Create a free account
                </Link>
                <Link
                  to="/login"
                  search={{ mode: "signin" as const }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                >
                  Sign in
                </Link>
                <Link
                  to="/privacy"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/terms"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-12 border-t border-border py-6 text-center text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} ScholarX</span>
        <span className="mx-2">·</span>
        <Link to="/privacy" className="hover:text-foreground transition">Privacy</Link>
        <span className="mx-2">·</span>
        <Link to="/terms" className="hover:text-foreground transition">Terms</Link>
        <span className="mx-2">·</span>
        <Link to="/" className="hover:text-foreground transition">Home</Link>
      </footer>
    </main>
  );
}
