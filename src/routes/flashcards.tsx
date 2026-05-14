import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateFlashcards } from "@/api/flashcards.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  ArrowLeft,
  Layers,
  Loader2,
  Send,
  Sparkles,
  Trash2,
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from "lucide-react";

type ChatMsg = { role: "user" | "assistant"; content: string };
type Card = { q: string; a: string };
type DeckRow = { id: string; topic: string; created_at: string };
type DbCard = { id: string; question: string; answer: string; sort_order: number };

export const Route = createFileRoute("/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — ScholarX" },
      { name: "description", content: "Generate AI flashcards from any topic and save them to your library." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { mode: "signin" } });
  },
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const [topicSeed, setTopicSeed] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Card[] | null>(null);
  const [saving, setSaving] = useState(false);

  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [decksLoading, setDecksLoading] = useState(true);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [studyCards, setStudyCards] = useState<DbCard[]>([]);
  const [studyIdx, setStudyIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const loadDecks = useCallback(async () => {
    setDecksLoading(true);
    const { data, error } = await supabase
      .from("flashcard_sets")
      .select("id, topic, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Could not load your decks");
      setDecks([]);
    } else {
      setDecks((data ?? []) as DeckRow[]);
    }
    setDecksLoading(false);
  }, []);

  useEffect(() => {
    void loadDecks();
  }, [loadDecks]);

  const loadStudyCards = useCallback(async (setId: string) => {
    const { data, error } = await supabase
      .from("flashcards")
      .select("id, question, answer, sort_order")
      .eq("set_id", setId)
      .order("sort_order", { ascending: true });
    if (error) {
      toast.error("Could not load cards");
      setStudyCards([]);
      return;
    }
    setStudyCards((data ?? []) as DbCard[]);
    setStudyIdx(0);
    setShowAnswer(false);
  }, []);

  useEffect(() => {
    if (selectedDeckId) void loadStudyCards(selectedDeckId);
    else {
      setStudyCards([]);
      setStudyIdx(0);
      setShowAnswer(false);
    }
  }, [selectedDeckId, loadStudyCards]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || loading) return;

    const nextMessages: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setDraft("");
    setLoading(true);
    setPreview(null);

    try {
      const topic =
        topicSeed.trim() ||
        nextMessages.find((m) => m.role === "user")?.content.slice(0, 400) ||
        "Study topic";

      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const result = await generateFlashcards({
        data: {
          topic,
          messages: nextMessages,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (result.error || !result.cards?.length) {
        toast.error(result.error ?? "No flashcards generated");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.error ?? "Something went wrong. Try rephrasing your topic." },
        ]);
        return;
      }

      setPreview(result.cards);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Here are ${result.cards.length} flashcards for “${topic.slice(0, 120)}${topic.length > 120 ? "…" : ""}”. Review them below, then use Save to library to keep them.`,
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

  async function saveDeck() {
    if (!preview?.length) return;
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.error("Sign in required");
        return;
      }
      const topic = topicSeed.trim() || messages.find((m) => m.role === "user")?.content.slice(0, 200) || "Deck";
      const { data: setRow, error: e1 } = await supabase
        .from("flashcard_sets")
        .insert({ user_id: u.user.id, topic: topic.slice(0, 500) })
        .select("id")
        .single();
      if (e1 || !setRow) {
        toast.error("Could not save deck");
        console.error(e1);
        return;
      }
      const rows = preview.map((c, i) => ({
        set_id: setRow.id,
        question: c.q,
        answer: c.a,
        sort_order: i,
      }));
      const { error: e2 } = await supabase.from("flashcards").insert(rows);
      if (e2) {
        toast.error("Could not save cards");
        console.error(e2);
        await supabase.from("flashcard_sets").delete().eq("id", setRow.id);
        return;
      }
      toast.success("Deck saved");
      setPreview(null);
      setSelectedDeckId(setRow.id);
      void loadDecks();
    } finally {
      setSaving(false);
    }
  }

  async function deleteDeck(id: string) {
    if (!confirm("Delete this deck and all its cards?")) return;
    const { error } = await supabase.from("flashcard_sets").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed");
      return;
    }
    if (selectedDeckId === id) setSelectedDeckId(null);
    toast.success("Deck deleted");
    void loadDecks();
  }

  const currentStudy = studyCards[studyIdx];

  return (
    <div className="min-h-screen relative">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ backgroundImage: "var(--gradient-aurora)" }}
      />

      <header className="sticky top-0 z-30 backdrop-blur-md border-b border-border bg-background/60">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/chat"
              className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition shrink-0"
              aria-label="Back to chat"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground shrink-0"
                style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
              >
                <Layers className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h1 className="text-base font-semibold leading-none truncate" style={{ fontFamily: "var(--font-display)" }}>
                  Flashcards
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">AI Q&amp;A → your library</p>
              </div>
            </div>
          </div>
          <Link
            to="/planner"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition shrink-0"
          >
            Study planner
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Generator + chat */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card/70 backdrop-blur-md p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                Generate from a topic
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Set a topic label (used as the deck title), chat with the AI to narrow or extend what you want, then send
              to generate cards.
            </p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Deck topic / title</label>
              <Input
                value={topicSeed}
                onChange={(e) => setTopicSeed(e.target.value)}
                placeholder="e.g. Photosynthesis, AP World — Unit 4, quadratic equations"
                className="bg-background/50"
              />
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
                    Describe what you want to study. Example: “Cellular respiration — focus on Krebs vs electron
                    transport.”
                  </li>
                )}
                {messages.map((m, i) => (
                  <li
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
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
                      Generating flashcards…
                    </div>
                  </li>
                )}
              </ul>
            </ScrollArea>
            <form onSubmit={handleSend} className="border-t border-border p-3 flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Message the AI about your topic…"
                className="bg-background/50"
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !draft.trim()} className="shrink-0 gap-1">
                <Send className="h-4 w-4" />
                Send
              </Button>
            </form>
          </div>

          {preview && preview.length > 0 && (
            <div className="rounded-xl border border-border bg-card/70 backdrop-blur-md p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
                  <Layers className="h-4 w-4 text-primary" />
                  Preview ({preview.length} cards)
                </h3>
                <Button onClick={saveDeck} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkPlus className="h-4 w-4" />}
                  Save to library
                </Button>
              </div>
              <ScrollArea className="h-[min(40vh,320px)] pr-2">
                <ol className="space-y-3 list-decimal list-inside text-sm">
                  {preview.map((c, i) => (
                    <li key={i} className="rounded-lg border border-border/80 bg-background/40 p-3">
                      <p className="font-medium text-foreground mb-1">{c.q}</p>
                      <p className="text-muted-foreground pl-0">{c.a}</p>
                    </li>
                  ))}
                </ol>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Sidebar: decks + study */}
        <div className="space-y-4 lg:sticky lg:top-20 self-start">
          <div className="rounded-xl border border-border bg-card/70 backdrop-blur-md p-4">
            <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>
              My decks
            </h3>
            {decksLoading ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </p>
            ) : decks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved decks yet.</p>
            ) : (
              <ul className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
                {decks.map((d) => (
                  <li key={d.id} className="flex items-center gap-1 group">
                    <button
                      type="button"
                      onClick={() => setSelectedDeckId(d.id)}
                      className={`flex-1 text-left text-sm rounded-md px-2 py-2 transition truncate ${
                        selectedDeckId === d.id ? "bg-primary/15 text-foreground" : "hover:bg-secondary text-muted-foreground"
                      }`}
                    >
                      {d.topic}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 opacity-70 hover:opacity-100 hover:text-destructive"
                      onClick={() => void deleteDeck(d.id)}
                      title="Delete deck"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedDeckId && studyCards.length > 0 && currentStudy && (
            <div className="rounded-xl border border-border bg-card/70 backdrop-blur-md p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                  Study
                </h3>
                <span className="text-xs text-muted-foreground">
                  {studyIdx + 1} / {studyCards.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAnswer((v) => !v)}
                className="w-full min-h-[140px] rounded-lg border border-border bg-background/50 p-4 text-left text-sm transition hover:bg-background/80"
              >
                {!showAnswer ? (
                  <p className="font-medium text-foreground">{currentStudy.question}</p>
                ) : (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Answer</p>
                    <p className="text-foreground whitespace-pre-wrap">{currentStudy.answer}</p>
                  </div>
                )}
              </button>
              <p className="text-xs text-muted-foreground text-center">
                {showAnswer ? "Tap card to see question" : "Tap card to reveal answer"}
              </p>
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={studyIdx === 0}
                  onClick={() => {
                    setStudyIdx((i) => Math.max(0, i - 1));
                    setShowAnswer(false);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAnswer((v) => !v)} className="gap-1">
                  <RotateCw className="h-3.5 w-3.5" />
                  Flip
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={studyIdx >= studyCards.length - 1}
                  onClick={() => {
                    setStudyIdx((i) => Math.min(studyCards.length - 1, i + 1));
                    setShowAnswer(false);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
