import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateTest } from "@/api/tests.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  Layers,
  Loader2,
  ListTodo,
  LogOut,
  Menu,
  MessageSquare,
  Sparkles,
  User,
  Send,
} from "lucide-react";

type ChatMsg = { role: "user" | "assistant"; content: string };
type TestMode = (typeof TEST_MODES)[number]["value"];
type TestQuestion = {
  id: string;
  type: "mcq" | "essay";
  question: string;
  answer: string;
  choices?: string[];
};

type SavedTest = {
  id: string;
  topic: string;
  mode: TestMode;
  createdAt: string;
  questions: TestQuestion[];
  answers: Record<string, string>;
};

const TEST_MODES = [
  { value: "all_mcq", label: "All multiple choice" },
  { value: "all_essay", label: "All essay" },
  { value: "mixed", label: "Mixed test" },
] as const;

export const Route = createFileRoute("/tests")({
  head: () => ({
    meta: [
      { title: "Test Creator — ScholarX" },
      { name: "description", content: "Generate interactive AI practice tests and answer them inside ScholarX." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { mode: "signin" } });
  },
  component: TestCreatorPage,
});

function TestCreatorPage() {
  const navigate = useNavigate();
  const [topicSeed, setTopicSeed] = useState("");
  const [testMode, setTestMode] = useState<(typeof TEST_MODES)[number]["value"]>("mixed");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<TestQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [savedTests, setSavedTests] = useState<SavedTest[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        setUserId(u.user.id);
        const { data: p } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", u.user.id)
          .maybeSingle();
        setDisplayName(p?.display_name ?? u.user.email?.split("@")[0] ?? "Student");
      }
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    void loadSavedTests();
  }, [userId]);

  async function loadSavedTests() {
    if (!userId) return;
    const { data, error } = await supabase
      .from("tests")
      .select("id, topic, mode, questions, answers, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load saved tests", error);
      return;
    }

    setSavedTests(
      (data ?? []).map((row) => ({
        id: row.id,
        topic: row.topic,
        mode: row.mode as TestMode,
        createdAt: row.created_at,
        questions: row.questions as TestQuestion[],
        answers: (row.answers as Record<string, string>) ?? {},
      })),
    );
  }

  async function selectSavedTest(id: string) {
    const saved = savedTests.find((test) => test.id === id);
    if (!saved) return;
    setSelectedTestId(id);
    setPreview(saved.questions);
    setAnswers(saved.answers);
    setTopicSeed(saved.topic);
    setTestMode(saved.mode);
  }

  async function updateSavedTest(update: Partial<SavedTest>) {
    if (!selectedTestId || !userId) return;
    const nextTests = savedTests.map((test) =>
      test.id === selectedTestId
        ? {
            ...test,
            ...update,
          }
        : test,
    );
    setSavedTests(nextTests);

    const saved = nextTests.find((test) => test.id === selectedTestId);
    if (!saved) return;

    const { error } = await supabase
      .from("tests")
      .update({
        topic: saved.topic,
        mode: saved.mode,
        questions: saved.questions,
        answers: saved.answers,
      })
      .eq("id", selectedTestId)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to update saved test", error);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || loading) return;

    const nextMessages: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setDraft("");
    setLoading(true);
    setPreview(null);
    setAnswers({});
    setRevealed({});

    try {
      const topic =
        topicSeed.trim() || nextMessages.find((m) => m.role === "user")?.content.slice(0, 400) || "Practice test";

      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const result = await generateTest({
        data: {
          topic,
          mode: testMode,
          messages: nextMessages,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (result.error || !result.questions?.length) {
        toast.error(result.error ?? "No test generated");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.error ?? "Something went wrong. Try rephrasing your topic." },
        ]);
        return;
      }

      const questions = result.questions.map((item, index) => ({
        id: `${Date.now()}-${index}`,
        ...item,
      }));

      let savedTestId = `test-${Date.now()}`;
      let createdAt = new Date().toISOString();

      if (userId) {
        const { data: inserted, error: insertError } = await supabase
          .from("tests")
          .insert([
            {
              user_id: userId,
              topic,
              mode: testMode,
              questions,
              answers: {},
            },
          ])
          .select("id, created_at")
          .single();

        if (!insertError && inserted) {
          savedTestId = inserted.id;
          createdAt = inserted.created_at;
        } else if (insertError) {
          console.error("Failed to create saved test", insertError);
          toast.error("Could not save the test. It will still work locally.");
        }
      }

      const savedTest: SavedTest = {
        id: savedTestId,
        topic,
        mode: testMode,
        createdAt,
        questions,
        answers: {},
      };

      setSelectedTestId(savedTest.id);
      setSavedTests((prev) => [savedTest, ...prev].slice(0, 20));
      setPreview(questions);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Generated ${questions.length} ${testMode === "all_mcq" ? "multiple-choice" : testMode === "all_essay" ? "essay" : "mixed"} questions for "${topic.slice(0, 120)}${topic.length > 120 ? "…" : ""}". Answer them below and reveal the model answers when you are ready.`,
        },
      ]);
    } catch (err) {
      console.error(err);
      toast.error("Request failed");
      setMessages((prev) => [...prev, { role: "assistant", content: "Request failed. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };
      updateSavedTest({ answers: next });
      return next;
    });
  }

  function revealAnswer(questionId: string) {
    setRevealed((prev) => ({ ...prev, [questionId]: true }));
  }

  function revealAll() {
    if (!preview) return;
    const next = preview.reduce<Record<string, boolean>>((acc, item) => {
      acc[item.id] = true;
      return acc;
    }, {});
    setRevealed(next);
  }

  function resetTest() {
    setPreview(null);
    setAnswers({});
    setRevealed({});
    setMessages([]);
    setDraft("");
    setSelectedTestId(null);
  }

  const mcqScore = preview?.reduce((count, item) => {
    if (item.type === "mcq" && answers[item.id] === item.answer) {
      return count + 1;
    }
    return count;
  }, 0);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-80 p-0 flex flex-col">
          <div className="flex items-center gap-2 px-5 py-5 font-display text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </span>
            ScholarX
          </div>
          <div className="px-3">
            <Button className="w-full justify-start gap-2" variant="secondary">
              <BookOpen className="h-4 w-4" /> New test
            </Button>
          </div>
          <div className="mt-auto border-t border-border px-3 py-3 space-y-2">
            <Link
              to="/planner"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
            >
              <ListTodo className="h-4 w-4" />
              Study planner
            </Link>
            <Link
              to="/flashcards"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
            >
              <Layers className="h-4 w-4" />
              Flashcards
            </Link>
            <Link
              to="/chat"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </Link>
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            <div className="flex items-center justify-between gap-2 px-2 text-sm">
              <span className="truncate text-muted-foreground">{displayName}</span>
              <Button variant="ghost" size="icon" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <aside className="hidden w-80 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur md:flex">
        <div className="flex items-center gap-2 px-5 py-5 font-display text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          ScholarX
        </div>
        <div className="px-3">
          <Button className="w-full justify-start gap-2" variant="secondary">
            <BookOpen className="h-4 w-4" /> New test
          </Button>
        </div>
        <div className="mt-4 px-5 text-xs uppercase tracking-wider text-muted-foreground">Test creator</div>
        <div className="mt-auto border-t border-border px-3 py-3 space-y-2">
          <Link
            to="/planner"
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
          >
            <ListTodo className="h-4 w-4" />
            Study planner
          </Link>
          <Link
            to="/flashcards"
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
          >
            <Layers className="h-4 w-4" />
            Flashcards
          </Link>
          <Link
            to="/chat"
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
          >
            <User className="h-4 w-4" />
            Profile
          </Link>
          <div className="flex items-center justify-between gap-2 px-2 text-sm">
            <span className="truncate text-muted-foreground">{displayName}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border px-4 py-3 md:px-6">
          <button
            className="md:hidden shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground shrink-0"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
            >
              <BookOpen className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-semibold leading-none truncate" style={{ fontFamily: "var(--font-display)" }}>
                Test creator
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">Create interactive practice tests with MCQ, essay, or mixed mode.</p>
            </div>
          </div>
          <Link to="/planner" className="text-xs font-medium text-muted-foreground hover:text-foreground transition shrink-0 ml-auto">
            Study planner
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 py-6 md:px-6 space-y-4">
            <div className="rounded-xl border border-border bg-card/70 backdrop-blur-md p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                  Generate an interactive test
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose the test type, set a topic, and optionally chat with the AI to narrow the focus before generating.
              </p>

              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Test topic / title</label>
                  <Input
                    value={topicSeed}
                    onChange={(e) => setTopicSeed(e.target.value)}
                    placeholder="e.g. Cellular respiration, Shakespeare Sonnets, algebra review"
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Mode</label>
                  <select
                    value={testMode}
                    onChange={(e) => setTestMode(e.target.value as typeof testMode)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                  >
                    {TEST_MODES.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/70 backdrop-blur-md flex flex-col min-h-[420px] max-h-[min(70vh,560px)]">
              <div className="border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Chat with the tutor
              </div>
              <ScrollArea className="flex-1 px-3">
                <ul className="space-y-3 py-4 pr-2">
                  {messages.length === 0 && (
                    <li className="text-sm text-muted-foreground text-center py-8">
                      Describe the topic or test focus. Example: "Make a short biology quiz on photosynthesis with a mix of questions."
                    </li>
                  )}
                  {messages.map((m, i) => (
                    <li key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted/80 text-foreground rounded-bl-md border border-border/60"
                        }`}
                      >
                        <span className="whitespace-pre-wrap">{m.content}</span>
                      </div>
                    </li>
                  ))}
                  {loading && (
                    <li className="flex justify-start">
                      <div className="rounded-2xl rounded-bl-md border border-border/60 bg-muted/50 px-3 py-2 text-sm flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating test…
                      </div>
                    </li>
                  )}
                </ul>
              </ScrollArea>
              <form onSubmit={handleSend} className="border-t border-border px-3 py-3">
                <div className="flex gap-2">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Refine the test request or ask for a narrower focus"
                    className="bg-background/50"
                  />
                  <Button type="submit" disabled={loading}>
                    {loading ? "Generating…" : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </form>
            </div>

            {preview ? (
              <div className="rounded-xl border border-border bg-card/70 backdrop-blur-md p-4 sm:p-5 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                      Interactive test
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Answer the questions below, then reveal correct responses and explanations.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={revealAll}>
                      Reveal all answers
                    </Button>
                    <Button variant="secondary" size="sm" onClick={resetTest}>
                      Reset test
                    </Button>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                  <div className="flex flex-wrap gap-3">
                    <span>{preview.length} questions</span>
                    <span className="capitalize">Mode: {testMode.replace("all_", "").replace("mixed", "mixed")}</span>
                    {typeof mcqScore === "number" && preview.some((item) => item.type === "mcq") && (
                      <span>
                        Correct MCQ: {mcqScore}/{preview.filter((item) => item.type === "mcq").length}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  {preview.map((item, index) => (
                    <div key={item.id} className="rounded-3xl border border-border bg-background/70 p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                          {item.type === "mcq" ? "Multiple choice" : "Essay"}
                        </span>
                        <span className="text-xs text-muted-foreground">Question {index + 1}</span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{item.question}</p>
                      {item.type === "mcq" ? (
                        <div className="mt-4 space-y-3">
                          {item.choices?.map((choice) => (
                            <label
                              key={choice}
                              className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
                                answers[item.id] === choice
                                  ? "border-primary/40 bg-primary/5"
                                  : "border-border bg-muted/5 hover:border-border/80"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question-${item.id}`}
                                value={choice}
                                checked={answers[item.id] === choice}
                                onChange={() => setAnswer(item.id, choice)}
                                className="h-4 w-4 accent-primary"
                              />
                              <span>{choice}</span>
                            </label>
                          ))}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Button size="sm" variant="outline" onClick={() => revealAnswer(item.id)}>
                              Reveal answer
                            </Button>
                            {revealed[item.id] && (
                              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                Correct: {item.answer}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          <Textarea
                            value={answers[item.id] ?? ""}
                            onChange={(e) => setAnswer(item.id, e.target.value)}
                            placeholder="Write your answer here..."
                            className="min-h-[140px] bg-background/50"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => revealAnswer(item.id)}>
                              Reveal sample answer
                            </Button>
                            {revealed[item.id] && (
                              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                Sample answer shown
                              </span>
                            )}
                          </div>
                          {revealed[item.id] && (
                            <div className="rounded-2xl border border-border bg-muted/10 p-3 text-sm text-foreground">
                              <p className="font-semibold">Model answer</p>
                              <p className="mt-2 whitespace-pre-wrap">{item.answer}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
          ) : (
            <div className="rounded-xl border border-border bg-card/70 backdrop-blur-md p-6 text-center text-sm text-muted-foreground">
              Generate a test to see interactive questions here.
            </div>
          )}

          {savedTests.length > 0 && (
            <div className="rounded-xl border border-border bg-card/70 backdrop-blur-md p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                  Saved tests
                </h2>
                <span className="text-xs text-muted-foreground">{savedTests.length} saved</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {savedTests.map((test) => (
                  <button
                    key={test.id}
                    type="button"
                    onClick={() => selectSavedTest(test.id)}
                    className={`rounded-3xl border px-4 py-4 text-left transition ${
                      selectedTestId === test.id ? "border-primary bg-primary/5" : "border-border bg-background/80 hover:border-border/90"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm text-foreground truncate">{test.topic}</p>
                        <p className="text-xs text-muted-foreground">
                          {test.mode.replace("all_", "").replace("mixed", "mixed")} • {new Date(test.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">Load</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </main>
    </div>
  );
}
