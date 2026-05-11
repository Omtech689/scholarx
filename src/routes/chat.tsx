import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { askHomework } from "@/api/chat.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import katex from "katex";
import {
  Sparkles,
  Plus,
  Send,
  Loader2,
  LogOut,
  Calculator,
  FlaskConical,
  BookOpen,
  Landmark,
  MessageSquare,
  Trash2,
  ShieldAlert,
  Mic,
  MicOff,
  Volume2,
  Square,
  Headphones,
  PhoneOff,
  ListTodo,
} from "lucide-react";

type Subject = "math" | "science" | "english" | "history" | "general";
type Msg = { id?: string; role: "user" | "assistant"; content: string };
type Convo = { id: string; title: string; subject: string | null; updated_at: string };

function stripForSpeech(s: string) {
  return s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\$\$([\s\S]+?)\$\$/g, " $1 ")
    .replace(/\$([^$\n]+?)\$/g, " $1 ")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 over $2")
    .replace(/\\sqrt\{([^}]+)\}/g, "square root of $1")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[`*_#>~{}\\^]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const SUBJECTS: { id: Subject; label: string; icon: typeof Calculator; color: string }[] = [
  { id: "math", label: "Math", icon: Calculator, color: "var(--math)" },
  { id: "science", label: "Science", icon: FlaskConical, color: "var(--science)" },
  { id: "english", label: "English", icon: BookOpen, color: "var(--english)" },
  { id: "history", label: "History", icon: Landmark, color: "var(--history)" },
];

export const Route = createFileRoute("/chat")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: ChatPage,
});

function ChatPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [subject, setSubject] = useState<Subject>("general");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [listening, setListening] = useState(false);
  const [convoMode, setConvoMode] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<(text?: string) => Promise<void>>(() => Promise.resolve());
  const convoModeRef = useRef(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setSpeechSupported(
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    );
    setTtsSupported("speechSynthesis" in window);
  }, []);

  useEffect(() => {
    convoModeRef.current = convoMode;
  }, [convoMode]);

  const startListening = useCallback((autoSend: boolean) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      try { recognitionRef.current.abort?.(); } catch {}
      recognitionRef.current = null;
    }
    const rec = new SR();
    rec.continuous = autoSend;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    let finalText = "";
    let sent = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => {
      setListening(false);
      if (autoSend && !sent && finalText.trim()) {
        sent = true;
        sendRef.current(finalText.trim());
      }
    };
    rec.onerror = (e: any) => {
      setListening(false);
      const err = e?.error || "unknown";
      if (err === "not-allowed" || err === "service-not-allowed") {
        toast.error("Microphone blocked. Allow mic access in your browser settings.");
      } else if (err === "no-speech") {
        // silent — let user retry
      } else if (err === "audio-capture") {
        toast.error("No microphone detected.");
      } else if (err !== "aborted") {
        toast.error(`Voice error: ${err}`);
      }
    };
    rec.onresult = (e: any) => {
      let interim = "";
      finalText = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setInput((finalText + interim).trim());
      // In conversation mode, auto-send shortly after a final result
      if (autoSend && finalText.trim() && !sent) {
        sent = true;
        try { rec.stop(); } catch {}
      }
    };
    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (err: any) {
      setListening(false);
      toast.error(`Couldn't start mic: ${err?.message || err}`);
    }
  }, []);

  async function ensureMicPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately stop tracks — we only needed the permission prompt
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch (err: any) {
      const name = err?.name || "Error";
      if (name === "NotAllowedError") {
        toast.error("Microphone permission denied. Enable it in your browser settings.");
      } else if (name === "NotFoundError") {
        toast.error("No microphone found on this device.");
      } else if (name === "NotReadableError") {
        toast.error("Microphone is in use by another app.");
      } else {
        toast.error(`Microphone error: ${err?.message || name}`);
      }
      return false;
    }
  }

  function toggleListening() {
    if (!speechSupported) {
      toast.error("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (listening) {
      try { recognitionRef.current?.stop(); } catch {}
      return;
    }
    // Start synchronously to preserve user-gesture context
    startListening(false);
  }

  async function toggleConvoMode() {
    if (!speechSupported || !ttsSupported) {
      toast.error("Voice conversation isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (convoMode) {
      setConvoMode(false);
      try { recognitionRef.current?.stop(); } catch {}
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    // Pre-prompt mic permission once before entering convo mode
    const ok = await ensureMicPermission();
    if (!ok) return;
    setConvoMode(true);
    toast.success("Conversation mode on — speak when ready.");
    startListening(true);
  }

  function speakAssistant(text: string, onDone?: () => void) {
    if (!ttsSupported) { onDone?.(); return; }
    const clean = stripForSpeech(text);
    const u = new SpeechSynthesisUtterance(clean);
    const id = Date.now();
    setSpeakingId(id);
    u.onend = () => { setSpeakingId(null); onDone?.(); };
    u.onerror = () => { setSpeakingId(null); onDone?.(); };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }


  // load profile + conversations
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", u.user.id)
          .maybeSingle();
        setDisplayName(p?.display_name ?? u.user.email?.split("@")[0] ?? "Student");
      }
      await loadConversations();
    })();
  }, []);

  // auto scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function loadConversations() {
    const { data, error } = await supabase
      .from("conversations")
      .select("id,title,subject,updated_at")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error("Couldn't load history");
      return;
    }
    setConversations(data ?? []);
  }

  async function selectConversation(id: string) {
    setActiveId(id);
    const c = conversations.find((x) => x.id === id);
    if (c?.subject) setSubject(c.subject as Subject);
    const { data, error } = await supabase
      .from("messages")
      .select("id, role, content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Couldn't load chat");
      return;
    }
    setMessages(
      (data ?? []).map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    );
  }

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setInput("");
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this chat?")) return;
    await supabase.from("conversations").delete().eq("id", id);
    if (activeId === id) newChat();
    await loadConversations();
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Please sign in again.");
      return;
    }

    setInput("");
    setLoading(true);

    let convoId = activeId;
    try {
      if (!convoId) {
        const title = text.slice(0, 60);
        const { data, error } = await supabase
          .from("conversations")
          .insert({ user_id: u.user.id, title, subject })
          .select("id")
          .single();
        if (error) throw error;
        convoId = data.id;
        setActiveId(convoId);
      }

      const userMsg: Msg = { role: "user", content: text };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);

      await supabase.from("messages").insert({
        conversation_id: convoId,
        user_id: u.user.id,
        role: "user",
        content: text,
      });

      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const result = await askHomework({
        data: {
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          subject,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (result.error || !result.content) {
        toast.error(result.error ?? "No response");
        return;
      }

      const assistantMsg: Msg = { role: "assistant", content: result.content };
      setMessages((prev) => [...prev, assistantMsg]);

      await supabase.from("messages").insert({
        conversation_id: convoId,
        user_id: u.user.id,
        role: "assistant",
        content: result.content,
      });

      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convoId);

      await loadConversations();

      // In conversation mode: auto-speak reply, then re-listen
      if (convoModeRef.current) {
        speakAssistant(result.content, () => {
          if (convoModeRef.current) startListening(true);
        });
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    sendRef.current = send;
  });

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur md:flex">
        <div className="flex items-center gap-2 px-5 py-5 font-display text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          ScholarX
        </div>
        <div className="px-3">
          <Button onClick={newChat} className="w-full justify-start gap-2" variant="secondary">
            <Plus className="h-4 w-4" /> New chat
          </Button>
        </div>
        <div className="mt-4 px-5 text-xs uppercase tracking-wider text-muted-foreground">
          History
        </div>
        <ScrollArea className="mt-2 flex-1 px-2">
          <ul className="space-y-1 pb-4">
            {conversations.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                No chats yet. Ask your first question!
              </li>
            )}
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => selectConversation(c.id)}
                  className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    activeId === c.id
                      ? "bg-primary/15 text-foreground"
                      : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">{c.title}</span>
                  <Trash2
                    onClick={(e) => deleteConversation(c.id, e)}
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
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
          >
            <ListTodo className="h-4 w-4" />
            Study planner
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
      <main className="flex flex-1 flex-col">
        {/* Top: subject buttons */}
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 md:px-6">
          <span className="mr-2 text-sm text-muted-foreground">Subject:</span>
          <button
            onClick={() => setSubject("general")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              subject === "general"
                ? "bg-primary text-primary-foreground glow"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
            }`}
          >
            General
          </button>
          {SUBJECTS.map((s) => {
            const active = subject === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSubject(s.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "text-background"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                }`}
                style={active ? { background: s.color, boxShadow: `0 0 24px ${s.color}55` } : {}}
              >
                <s.icon className="h-3.5 w-3.5" style={!active ? { color: s.color } : {}} />
                {s.label}
              </button>
            );
          })}
          <div className="md:hidden ml-auto">
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.length === 0 && <EmptyState subject={subject} onPick={setInput} />}
            {messages.map((m, i) => (
              <Bubble key={m.id ?? i} role={m.role} content={m.content} ttsSupported={ttsSupported} />
            ))}
            {loading && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary [animation-delay:120ms]" />
                <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary [animation-delay:240ms]" />
                Thinking…
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-background/60 px-4 py-4 backdrop-blur md:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="glass flex items-end gap-2 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-primary/50">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={`Ask a ${subject === "general" ? "homework" : subject} question…`}
                rows={1}
                maxLength={4000}
                className="min-h-[44px] max-h-40 resize-none border-0 bg-transparent focus-visible:ring-0"
              />
              {mounted && speechSupported && (
                <Button
                  onClick={toggleListening}
                  disabled={loading}
                  size="icon"
                  variant={listening ? "destructive" : "secondary"}
                  className="h-10 w-10 shrink-0 rounded-xl"
                  title={listening ? "Stop dictation" : "Voice input"}
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              {mounted && speechSupported && ttsSupported && (
                <Button
                  onClick={toggleConvoMode}
                  size="icon"
                  variant={convoMode ? "destructive" : "secondary"}
                  className="h-10 w-10 shrink-0 rounded-xl"
                  title={convoMode ? "End voice conversation" : "Start voice conversation"}
                >
                  {convoMode ? <PhoneOff className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
                </Button>
              )}
              <Button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl glow"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldAlert className="h-3 w-3" />
              ScholarX helps you <strong className="font-semibold">learn</strong> — don't submit AI
              answers as your own work.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Bubble({ role, content, ttsSupported }: { role: "user" | "assistant"; content: string; ttsSupported: boolean }) {
  const isUser = role === "user";
  const [speaking, setSpeaking] = useState(false);

  function toggleSpeak() {
    if (!ttsSupported) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const clean = stripForSpeech(content);
    const u = new SpeechSynthesisUtterance(clean);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`group max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-[var(--shadow-card)] ${
          isUser
            ? "bg-gradient-to-br from-primary/90 to-accent/80 text-primary-foreground"
            : "glass"
        }`}
      >
        <FormattedContent text={content} />
        {!isUser && ttsSupported && (
          <button
            onClick={toggleSpeak}
            className="mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            title={speaking ? "Stop" : "Read aloud"}
          >
            {speaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            {speaking ? "Stop" : "Listen"}
          </button>
        )}
      </div>
    </div>
  );
}

// Lightweight markdown-ish renderer (paragraphs, **bold**, lists, code)
function FormattedContent({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2 whitespace-pre-wrap break-words">
      {blocks.map((b, i) => {
        if (/^```/.test(b)) {
          const code = b.replace(/^```\w*\n?|```$/g, "");
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-lg bg-background/60 p-3 font-mono text-xs"
            >
              {code}
            </pre>
          );
        }
        if (/^(\s*[-*]\s)/m.test(b)) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {b.split("\n").map((line, j) => (
                <li key={j}>{renderInline(line.replace(/^\s*[-*]\s/, ""))}</li>
              ))}
            </ul>
          );
        }
        if (/^\s*\d+\.\s/.test(b)) {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5">
              {b.split("\n").map((line, j) => (
                <li key={j}>{renderInline(line.replace(/^\s*\d+\.\s/, ""))}</li>
              ))}
            </ol>
          );
        }
        return <p key={i}>{renderInline(b)}</p>;
      })}
    </div>
  );
}

function renderMath(src: string, displayMode: boolean, key: string | number) {
  try {
    const html = katex.renderToString(src, {
      displayMode,
      throwOnError: false,
      output: "html",
    });
    return (
      <span
        key={key}
        className={displayMode ? "block my-2 overflow-x-auto" : ""}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return <span key={key}>{src}</span>;
  }
}

function renderInline(s: string): React.ReactNode {
  // Split on $$...$$, \[...\], $...$, \(...\), **bold**, `code`
  const regex =
    /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$|\*\*[^*]+\*\*|`[^`]+`)/g;
  const parts = s.split(regex);
  return parts.map((p, i) => {
    if (!p) return null;
    if (/^\$\$[\s\S]+\$\$$/.test(p)) return renderMath(p.slice(2, -2), true, i);
    if (/^\\\[[\s\S]+\\\]$/.test(p)) return renderMath(p.slice(2, -2), true, i);
    if (/^\\\([\s\S]+\\\)$/.test(p)) return renderMath(p.slice(2, -2), false, i);
    if (/^\$[^$\n]+\$$/.test(p)) return renderMath(p.slice(1, -1), false, i);
    if (/^\*\*.+\*\*$/.test(p))
      return (
        <strong key={i} className="font-semibold">
          {p.slice(2, -2)}
        </strong>
      );
    if (/^`.+`$/.test(p))
      return (
        <code key={i} className="rounded bg-background/60 px-1 py-0.5 font-mono text-xs">
          {p.slice(1, -1)}
        </code>
      );
    return <span key={i}>{p}</span>;
  });
}

function EmptyState({ subject, onPick }: { subject: Subject; onPick: (s: string) => void }) {
  const prompts: Record<Subject, string[]> = {
    math: [
      "Walk me through solving 2x² + 5x − 3 = 0 step by step",
      "Explain the chain rule with a simple example",
    ],
    science: [
      "Why does ice float on water?",
      "Explain photosynthesis in 5 steps",
    ],
    english: [
      "Help me outline an essay about the theme of identity in 'The Outsiders'",
      "What's the difference between 'affect' and 'effect'?",
    ],
    history: [
      "What caused World War I? Give me the main factors.",
      "Compare the American and French Revolutions",
    ],
    general: [
      "Explain Newton's three laws of motion",
      "Help me understand fractions",
      "What is a metaphor? Give 3 examples",
    ],
  };
  return (
    <div className="mt-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent glow">
        <Sparkles className="h-6 w-6 text-primary-foreground" />
      </div>
      <h2 className="mt-5 text-2xl font-bold">What are you studying today?</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick a subject above and ask anything. I'll explain step by step.
      </p>
      <div className="mx-auto mt-8 grid max-w-2xl gap-2 sm:grid-cols-2">
        {prompts[subject].map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="glass rounded-xl px-4 py-3 text-left text-sm transition hover:-translate-y-0.5 hover:border-primary/50"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
