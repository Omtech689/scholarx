import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateFlashcards } from "@/api/flashcards.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteError } from "@/components/ui/route-error";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  Layers,
  Loader2,
  Send,
  Sparkles,
  Trash2,
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  LogOut,
  ListTodo,
  User,
  Menu,
  Plus,
  MessageSquare,
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
    if (!data.session) throw redirect({ to: "/login?mode=signin" });
  },
  errorComponent: RouteError,
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const navigate = useNavigate();
  const [topicSeed, setTopicSeed] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Card[] | null>(null);
  const [saving, setSaving] = useState(false);

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [studyIdx, setStudyIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const profileQuery = useQuery<string>({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sign in required");
      const { data: p, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", u.user.id)
        .maybeSingle();
      if (error) throw error;
      return p?.display_name ?? u.user.email?.split("@")[0] ?? "Student";
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const deckQuery = useQuery<DeckRow[]>({
    queryKey: ["flashcard_sets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flashcard_sets")
        .select("id, topic, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DeckRow[];
    },
    staleTime: 1000 * 60 * 3,
    retry: 1,
  });

  const studyCardsQuery = useQuery<DbCard[]>({
    queryKey: ["flashcards", selectedDeckId],
    queryFn: async () => {
      if (!selectedDeckId) return [] as DbCard[];
      const { data, error } = await supabase
        .from("flashcards")
        .select("id, question, answer, sort_order")
        .eq("set_id", selectedDeckId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DbCard[];
    },
    enabled: Boolean(selectedDeckId),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const displayName = profileQuery.data ?? "Student";
  const decks = deckQuery.data ?? [];
  const studyCards = studyCardsQuery.data ?? [];

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
          content: `Here are ${result.cards.length} flashcards for "${topic.slice(0, 120)}${topic.length > 120 ? "…" : ""}". Review them below, then use Save to library to keep them.`,
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
      queryClient.invalidateQueries({ queryKey: ["flashcard_sets"] });
      queryClient.invalidateQueries({ queryKey: ["flashcards", setRow.id] });
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
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
    queryClient.invalidateQueries({ queryKey: ["flashcard_sets"] });
    queryClient.invalidateQueries({ queryKey: ["flashcards", id] });
  }

  const currentStudy = studyCards[studyIdx];

  // Preview mode - fullscreen card display
  if (previewMode && selectedDeckId && studyCards.length > 0) {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        {/* Mobile drawer */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-80 p-0 flex flex-col">
            <div className="flex items-center gap-2 px-5 py-5 font-display text-lg font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent glow">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </span>
              ScholarX
            </div>
            <div className="px-3">
              <Button
                onClick={() => {
                  setPreviewMode(false);
                  setMobileMenuOpen(false);
                }}
                className="w-full justify-start gap-2"
                variant="secondary"
              >
                <ArrowLeft className="h-4 w-4" /> Back to study
              </Button>
            </div>
            <div className="mt-4 px-5 text-xs uppercase tracking-wider text-muted-foreground">
              My decks
            </div>
            <ScrollArea className="mt-2 flex-1 px-2">
              <ul className="space-y-1 pb-4">
                {deckQuery.isLoading ? (
                  [1, 2, 3].map((index) => (
                    <li key={index} className="rounded-2xl bg-muted/10 p-4 animate-pulse" />
                  ))
                ) : decks.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No saved decks yet.
                  </li>
                ) : null}
                {decks.map((d) => (
                  <li key={d.id}>
                    <button
                      onClick={() => {
                        setSelectedDeckId(d.id);
                        setPreviewMode(false);
                        setMobileMenuOpen(false);
                      }}
                      className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        selectedDeckId === d.id
                          ? "bg-primary/15 text-foreground"
                          : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate">{d.topic}</span>
                      <Trash2
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteDeck(d.id);
                        }}
                        className="h-3.5 w-3.5 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
            <div className="border-t border-border px-3 py-3 space-y-2">
              <Link
                to="/planner"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
              >
                <ListTodo className="h-4 w-4" />
                Study planner
              </Link>
              <Link
                to="/tests"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
              >
                <BookOpen className="h-4 w-4" />
                Test creator
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
                <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop sidebar */}
        <aside className="hidden w-80 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur md:flex">
          <div className="flex items-center gap-2 px-5 py-5 font-display text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </span>
            ScholarX
          </div>
          <div className="px-3">
            <Button
              onClick={() => setPreviewMode(false)}
              className="w-full justify-start gap-2"
              variant="secondary"
            >
              <ArrowLeft className="h-4 w-4" /> Back to study
            </Button>
          </div>
          <div className="mt-4 px-5 text-xs uppercase tracking-wider text-muted-foreground">
            Quick actions
          </div>
          <div className="px-3 mt-2">
            <Link
              to="/tests"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-secondary text-muted-foreground hover:text-foreground"
            >
              <BookOpen className="h-4 w-4" />
              Create test
            </Link>
          </div>
          <div className="mt-4 px-5 text-xs uppercase tracking-wider text-muted-foreground">
            My decks
          </div>
          <ScrollArea className="mt-2 flex-1 px-2">
            <ul className="space-y-1 pb-4">
              {deckQuery.isLoading ? (
                [1, 2, 3].map((index) => (
                  <li key={index} className="rounded-2xl bg-muted/10 p-4 animate-pulse" />
                ))
              ) : decks.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No saved decks yet.
                </li>
              ) : null}
              {decks.map((d) => (
                <li key={d.id}>
                  <div className="flex items-center gap-1 group">
                    <button
                      onClick={() => {
                        setSelectedDeckId(d.id);
                        setPreviewMode(false);
                      }}
                      className={`flex-1 flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        selectedDeckId === d.id
                          ? "bg-primary/15 text-foreground"
                          : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate">{d.topic}</span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void deleteDeck(d.id)}
                      className="h-8 w-8 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      title="Delete deck"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
          <div className="border-t border-border px-3 py-3 space-y-2">
            <Link
              to="/planner"
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
            >
              <ListTodo className="h-4 w-4" />
              Study planner
            </Link>
            <Link
              to="/tests"
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
            >
              <BookOpen className="h-4 w-4" />
              Test creator
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
              <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Main - preview cards list */}
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 border-b border-border px-4 py-3 md:px-6">
            <button
              className="md:hidden shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Preview all cards
            </h2>
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div className="mx-auto max-w-4xl space-y-3">
              {studyCards.map((c, i) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-border/80 bg-card/70 backdrop-blur-md p-4 cursor-pointer hover:border-primary/50 hover:bg-card/90 transition"
                  onClick={() => {
                    setStudyIdx(i);
                    setPreviewMode(false);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground mb-2">{c.question}</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                        {c.answer}
                      </p>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 font-medium">
                      #{i + 1}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main study/generation view
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Mobile drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-80 p-0 flex flex-col">
          <div className="flex items-center gap-2 px-5 py-5 font-display text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </span>
            ScholarX
          </div>
          <div className="px-3">
            <Link
              to="/chat"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition w-full"
            >
              <Plus className="h-4 w-4" /> New chat
            </Link>
          </div>
          <div className="mt-4 px-5 text-xs uppercase tracking-wider text-muted-foreground">
            My decks
          </div>
          <ScrollArea className="mt-2 flex-1 px-2">
            <ul className="space-y-1 pb-4">
              {decks.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No saved decks yet.
                </li>
              )}
              {decks.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => {
                      setSelectedDeckId(d.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedDeckId === d.id
                        ? "bg-primary/15 text-foreground"
                        : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">{d.topic}</span>
                    <Trash2
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteDeck(d.id);
                      }}
                      className="h-3.5 w-3.5 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
          <div className="border-t border-border px-3 py-3 space-y-2">
            <Link
              to="/planner"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
            >
              <ListTodo className="h-4 w-4" />
              Study planner
            </Link>
            <Link
              to="/tests"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
            >
              <BookOpen className="h-4 w-4" />
              Test creator
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
              <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden w-80 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur md:flex">
        <div className="flex items-center gap-2 px-5 py-5 font-display text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          ScholarX
        </div>
        <div className="px-3">
          <Button onClick={() => navigate({ to: "/chat" })} className="w-full justify-start gap-2" variant="secondary">
            <Plus className="h-4 w-4" /> New chat
          </Button>
        </div>
        <div className="mt-4 px-5 text-xs uppercase tracking-wider text-muted-foreground">
          My decks
        </div>
        <ScrollArea className="mt-2 flex-1 px-2">
          <ul className="space-y-1 pb-4">
            {decks.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                No saved decks yet.
              </li>
            )}
            {decks.map((d) => (
              <li key={d.id}>
                <div className="flex items-center gap-1 group">
                  <button
                    onClick={() => setSelectedDeckId(d.id)}
                    className={`flex-1 flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedDeckId === d.id
                        ? "bg-primary/15 text-foreground"
                        : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">{d.topic}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void deleteDeck(d.id)}
                    className="h-8 w-8 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    title="Delete deck"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
        <div className="border-t border-border px-3 py-3 space-y-2">
          <Link
            to="/planner"
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
          >
            <ListTodo className="h-4 w-4" />
            Study planner
          </Link>
          <Link
            to="/tests"
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
          >
            <BookOpen className="h-4 w-4" />
            Test creator
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
            <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Header with mobile menu button */}
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
              <Layers className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-semibold leading-none truncate" style={{ fontFamily: "var(--font-display)" }}>
                Flashcards
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">AI Q&amp;A → your library</p>
            </div>
          </div>
          <Link
            to="/planner"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition shrink-0 ml-auto"
          >
            Study planner
          </Link>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6 md:px-6 space-y-4">
            {/* Generator section - only show if not studying a deck */}
            {selectedDeckId && studyCardsQuery.isLoading ? (
              <div className="rounded-xl border border-border bg-card/70 backdrop-blur-md p-6 text-center text-sm text-muted-foreground">
                Loading cards…
              </div>
            ) : !selectedDeckId || studyCards.length === 0 ? (
              <>
                <div className="rounded-xl border border-border bg-card/70 backdrop-blur-md p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                      Generate from a topic
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Set a topic label (used as the deck title), chat with the AI to narrow or extend what you want,
                    then send to generate cards.
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
                          Describe what you want to study. Example: "Cellular respiration — focus on Krebs vs electron
                          transport."
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
              </>
            ) : null}

            {/* Study section */}
            {selectedDeckId && studyCards.length > 0 && currentStudy && (
              <div className="rounded-xl border border-border bg-card/70 backdrop-blur-md p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
                    <Layers className="h-4 w-4 text-primary" />
                    Study
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {studyIdx + 1} / {studyCards.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAnswer((v) => !v)}
                  className="w-full min-h-[180px] rounded-lg border border-border bg-background/50 p-4 text-left text-sm transition hover:bg-background/80"
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAnswer((v) => !v)}
                    className="gap-1"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Flip
                  </Button>
                  {studyIdx >= studyCards.length - 1 ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setPreviewMode(true)}
                      className="gap-1"
                    >
                      <Layers className="h-4 w-4" />
                      Preview all
                    </Button>
                  ) : (
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
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
