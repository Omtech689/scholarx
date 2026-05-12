import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Layers,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  X,
  Sparkles,
  BookOpen,
  ListTodo,
  MessageSquare,
  User,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Deck = { id: string; title: string; subject: string | null; card_count: number; created_at: string };
type Card = { id: string; front: string; back: string };
type View = "decks" | "deck" | "study";

const SUBJECTS = ["Math", "Science", "English", "History", "General", "Other"];

export const Route = createFileRoute("/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — ScholarX" },
      { name: "description", content: "Create and study flashcard decks for any subject." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const [view, setView] = useState<View>("decks");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);

  // Deck form
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [deckTitle, setDeckTitle] = useState("");
  const [deckSubject, setDeckSubject] = useState("General");
  const [savingDeck, setSavingDeck] = useState(false);

  // Card form
  const [showNewCard, setShowNewCard] = useState(false);
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [savingCard, setSavingCard] = useState(false);

  // Delete confirmations
  const [deleteDeckConfirm, setDeleteDeckConfirm] = useState<Deck | null>(null);
  const [deleteCardConfirm, setDeleteCardConfirm] = useState<Card | null>(null);

  // Study mode
  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [unknown, setUnknown] = useState<Set<string>>(new Set());

  useEffect(() => {
    void loadDecks();
  }, []);

  async function loadDecks() {
    setLoadingDecks(true);
    const { data, error } = await supabase
      .from("flashcard_decks")
      .select("id, title, subject, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Couldn't load decks");
      setLoadingDecks(false);
      return;
    }

    // Fetch card counts
    const decksWithCounts = await Promise.all(
      (data ?? []).map(async (d) => {
        const { count } = await supabase
          .from("flashcards")
          .select("id", { count: "exact", head: true })
          .eq("deck_id", d.id);
        return { ...d, card_count: count ?? 0 };
      }),
    );
    setDecks(decksWithCounts);
    setLoadingDecks(false);
  }

  async function loadCards(deckId: string) {
    setLoadingCards(true);
    const { data, error } = await supabase
      .from("flashcards")
      .select("id, front, back")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Couldn't load cards");
    } else {
      setCards(data ?? []);
    }
    setLoadingCards(false);
  }

  async function createDeck(e: React.FormEvent) {
    e.preventDefault();
    if (!deckTitle.trim()) return;
    setSavingDeck(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in required"); setSavingDeck(false); return; }
    const { error } = await supabase.from("flashcard_decks").insert({
      user_id: u.user.id,
      title: deckTitle.trim(),
      subject: deckSubject,
    });
    setSavingDeck(false);
    if (error) { toast.error("Couldn't create deck"); return; }
    toast.success("Deck created");
    setDeckTitle("");
    setShowNewDeck(false);
    void loadDecks();
  }

  async function confirmDeleteDeck() {
    if (!deleteDeckConfirm) return;
    const { error } = await supabase.from("flashcard_decks").delete().eq("id", deleteDeckConfirm.id);
    setDeleteDeckConfirm(null);
    if (error) { toast.error("Couldn't delete deck"); return; }
    toast.success("Deck deleted");
    if (activeDeck?.id === deleteDeckConfirm.id) {
      setActiveDeck(null);
      setCards([]);
      setView("decks");
    }
    void loadDecks();
  }

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    if (!cardFront.trim() || !cardBack.trim() || !activeDeck) return;
    setSavingCard(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in required"); setSavingCard(false); return; }
    const { error } = await supabase.from("flashcards").insert({
      deck_id: activeDeck.id,
      user_id: u.user.id,
      front: cardFront.trim(),
      back: cardBack.trim(),
    });
    setSavingCard(false);
    if (error) { toast.error("Couldn't add card"); return; }
    toast.success("Card added");
    setCardFront("");
    setCardBack("");
    setShowNewCard(false);
    void loadCards(activeDeck.id);
    // Update card count in decks list
    void loadDecks();
  }

  async function confirmDeleteCard() {
    if (!deleteCardConfirm || !activeDeck) return;
    const { error } = await supabase.from("flashcards").delete().eq("id", deleteCardConfirm.id);
    setDeleteCardConfirm(null);
    if (error) { toast.error("Couldn't delete card"); return; }
    toast.success("Card deleted");
    void loadCards(activeDeck.id);
    void loadDecks();
  }

  function openDeck(deck: Deck) {
    setActiveDeck(deck);
    setView("deck");
    void loadCards(deck.id);
  }

  function startStudy() {
    if (cards.length === 0) { toast.error("Add some cards first"); return; }
    setStudyIndex(0);
    setFlipped(false);
    setKnown(new Set());
    setUnknown(new Set());
    setView("study");
  }

  function studyNext(markKnown: boolean) {
    if (!cards[studyIndex]) return;
    const id = cards[studyIndex].id;
    if (markKnown) {
      setKnown((s) => new Set([...s, id]));
    } else {
      setUnknown((s) => new Set([...s, id]));
    }
    if (studyIndex < cards.length - 1) {
      setStudyIndex((i) => i + 1);
      setFlipped(false);
    } else {
      // Session complete
      setView("study-done" as View);
    }
  }

  const subjectColor: Record<string, string> = {
    Math: "var(--math)", Science: "var(--science)",
    English: "var(--english)", History: "var(--history)",
  };

  // ── Deck list view ───────────────────────────────────────────────
  if (view === "decks") {
    return (
      <div className="min-h-screen relative">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10"
          style={{ backgroundImage: "var(--gradient-aurora)" }} />

        <header className="sticky top-0 z-30 backdrop-blur-md border-b border-border bg-background/60">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 overflow-x-auto">
              <Link to="/chat" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Chat</span>
              </Link>
              <Link to="/planner" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground">
                <ListTodo className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Planner</span>
              </Link>
              <Link to="/flashcards" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition bg-primary text-primary-foreground">
                <Layers className="h-3.5 w-3.5" />
                <span>Flashcards</span>
              </Link>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button onClick={() => setShowNewDeck((v) => !v)} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New deck</span>
                <span className="sm:hidden">New</span>
              </Button>
              <Link to="/profile" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition" title="Profile">
                <User className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          {showNewDeck && (
            <form onSubmit={createDeck} className="rounded-xl border border-border bg-card/70 backdrop-blur-md p-4 sm:p-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>New deck</h2>
              </div>
              <Input value={deckTitle} onChange={(e) => setDeckTitle(e.target.value)} placeholder="e.g. Chapter 5 — Cell Biology" required autoFocus />
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Subject</label>
                <select value={deckSubject} onChange={(e) => setDeckSubject(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background text-foreground px-3 text-sm">
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={() => setShowNewDeck(false)}>Cancel</Button>
                <Button type="submit" disabled={savingDeck || !deckTitle.trim()}>
                  {savingDeck ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create deck"}
                </Button>
              </div>
            </form>
          )}

          {loadingDecks ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : decks.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent glow">
                <Layers className="h-6 w-6 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-bold">No decks yet</h2>
              <p className="text-sm text-muted-foreground">Create a deck and start adding cards to study.</p>
              <Button onClick={() => setShowNewDeck(true)} className="gap-2 mt-2">
                <Plus className="h-4 w-4" /> Create your first deck
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {decks.map((deck) => (
                <div key={deck.id} className="group glass rounded-xl p-5 flex flex-col gap-3 hover:-translate-y-0.5 transition cursor-pointer"
                  onClick={() => openDeck(deck)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{deck.title}</p>
                      {deck.subject && (
                        <span className="inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-primary-foreground"
                          style={{ background: subjectColor[deck.subject] ?? "var(--primary)" }}>
                          {deck.subject}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteDeckConfirm(deck); }}
                      className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:text-destructive transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    {deck.card_count} card{deck.card_count !== 1 ? "s" : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <Dialog open={!!deleteDeckConfirm} onOpenChange={(open) => !open && setDeleteDeckConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete deck?</DialogTitle>
              <DialogDescription>"{deleteDeckConfirm?.title}" and all its cards will be permanently deleted.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setDeleteDeckConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteDeck}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Deck detail / card management view ───────────────────────────────────────────
  if (view === "deck" && activeDeck) {
    return (
      <div className="min-h-screen relative">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10"
          style={{ backgroundImage: "var(--gradient-aurora)" }} />

        <header className="sticky top-0 z-30 backdrop-blur-md border-b border-border bg-background/60">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => setView("decks")}
                className="inline-flex shrink-0 items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition text-muted-foreground">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <p className="font-semibold truncate leading-none">{activeDeck.title}</p>
                {activeDeck.subject && (
                  <span className="text-xs text-muted-foreground">{activeDeck.subject}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {cards.length > 0 && (
                <Button onClick={startStudy} variant="secondary" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Study</span>
                </Button>
              )}
              <Button onClick={() => setShowNewCard((v) => !v)} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add card</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
          {showNewCard && (
            <form onSubmit={addCard} className="rounded-xl border border-border bg-card/70 backdrop-blur-md p-4 sm:p-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>New card</h2>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Front (question / term)</label>
                <Textarea value={cardFront} onChange={(e) => setCardFront(e.target.value)} placeholder="e.g. What is mitosis?" rows={2} required autoFocus />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Back (answer / definition)</label>
                <Textarea value={cardBack} onChange={(e) => setCardBack(e.target.value)} placeholder="e.g. Cell division that produces two identical daughter cells." rows={2} required />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={() => setShowNewCard(false)}>Cancel</Button>
                <Button type="submit" disabled={savingCard || !cardFront.trim() || !cardBack.trim()}>
                  {savingCard ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add card"}
                </Button>
              </div>
            </form>
          )}

          {loadingCards ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : cards.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <h2 className="text-lg font-semibold">No cards yet</h2>
              <p className="text-sm text-muted-foreground">Add your first card to start studying.</p>
              <Button onClick={() => setShowNewCard(true)} className="gap-2 mt-2"><Plus className="h-4 w-4" /> Add card</Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {cards.map((card) => (
                <div key={card.id} className="group glass rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Front</p>
                    <button onClick={() => setDeleteCardConfirm(card)}
                      className="shrink-0 rounded-md p-1 text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:text-destructive transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-sm font-medium">{card.front}</p>
                  <hr className="border-border" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Back</p>
                  <p className="text-sm text-muted-foreground">{card.back}</p>
                </div>
              ))}
            </div>
          )}
        </main>

        <Dialog open={!!deleteCardConfirm} onOpenChange={(open) => !open && setDeleteCardConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete card?</DialogTitle>
              <DialogDescription>This card will be permanently removed from the deck.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setDeleteCardConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteCard}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Study mode ─────────────────────────────────────────────────────────────
  if (view === "study" || (view as string) === "study-done") {
    const isDone = (view as string) === "study-done";
    const current = cards[studyIndex];
    const progress = isDone ? cards.length : studyIndex;

    return (
      <div className="min-h-screen relative flex flex-col">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10"
          style={{ backgroundImage: "var(--gradient-aurora)" }} />

        <header className="sticky top-0 z-30 backdrop-blur-md border-b border-border bg-background/60">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <button onClick={() => { setView("deck"); setFlipped(false); }}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
              <ChevronLeft className="h-4 w-4" />
              Back to deck
            </button>
            <span className="text-sm text-muted-foreground">{progress} / {cards.length}</span>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <div className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(progress / cards.length) * 100}%` }} />
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
          {isDone ? (
            <div className="w-full max-w-md text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent glow">
                <Sparkles className="h-7 w-7 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold">Session complete!</h2>
              <div className="flex justify-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">{known.size}</p>
                  <p className="text-muted-foreground">Knew it</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">{unknown.size}</p>
                  <p className="text-muted-foreground">Still learning</p>
                </div>
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={startStudy} className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Study again
                </Button>
                <Button onClick={() => setView("deck")} className="gap-2">
                  <ChevronLeft className="h-4 w-4" /> Back to deck
                </Button>
              </div>
            </div>
          ) : current ? (
            <div className="w-full max-w-lg space-y-6">
              {/* Card flip */}
              <div
                onClick={() => setFlipped((v) => !v)}
                className="glass rounded-2xl p-8 min-h-52 flex flex-col items-center justify-center text-center cursor-pointer select-none hover:-translate-y-0.5 transition"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-4">
                  {flipped ? "Back" : "Front — tap to reveal"}
                </p>
                <p className="text-lg font-medium leading-relaxed">
                  {flipped ? current.back : current.front}
                </p>
              </div>

              {flipped ? (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 border-red-400/40 text-red-500 hover:bg-red-500/10 hover:text-red-500"
                    onClick={() => studyNext(false)}
                  >
                    <X className="h-4 w-4" /> Still learning
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => studyNext(true)}
                  >
                    <Check className="h-4 w-4" /> Knew it
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setFlipped(true)}>
                    Reveal answer
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { setStudyIndex((i) => Math.max(0, i - 1)); setFlipped(false); }} disabled={studyIndex === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { setStudyIndex((i) => Math.min(cards.length - 1, i + 1)); setFlipped(false); }} disabled={studyIndex === cards.length - 1}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <p className="text-center text-xs text-muted-foreground">
                Card {studyIndex + 1} of {cards.length}
              </p>
            </div>
          ) : null}
        </main>
      </div>
    );
  }

  return null;
}
