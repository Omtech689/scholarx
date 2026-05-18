import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { RouteError } from "@/components/ui/route-error";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { askHomework, getGeminiKey } from "@/api/chat.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "sonner";
import katex from "katex";
import {
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
  Layers,
  Menu,
  GripVertical,
  Search,
  Download,
  TrendingUp,
  ChevronDown,
  LineChart,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DesmosGraph } from "@/components/desmos-graph";

type Subject = "math" | "science" | "english" | "history" | "general";
type Msg = { id?: string; role: "user" | "assistant"; content: string; image?: string };
type Convo = { id: string; title: string; subject: string | null; updated_at: string };

async function compressImage(file: File, maxDim = 1024, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) { height = Math.round((height * maxDim) / width); width = maxDim; }
        else { width = Math.round((width * maxDim) / height); height = maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      const base64 = canvas.toDataURL("image/jpeg", quality).split(",")[1];
      resolve(base64);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const priority = [
    (v: SpeechSynthesisVoice) => /natural/i.test(v.name),
    (v: SpeechSynthesisVoice) => /aria/i.test(v.name),
    (v: SpeechSynthesisVoice) => /jenny/i.test(v.name),
    (v: SpeechSynthesisVoice) => /google us english/i.test(v.name),
    (v: SpeechSynthesisVoice) => v.lang.startsWith("en") && /google/i.test(v.name),
    (v: SpeechSynthesisVoice) => v.lang === "en-US",
    (v: SpeechSynthesisVoice) => v.lang.startsWith("en"),
  ];
  for (const test of priority) {
    const match = voices.find(test);
    if (match) return match;
  }
  return voices[0] ?? null;
}

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

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
  head: () => ({
    meta: [
      { title: "AI Tutor — ScholarX" },
      { name: "description", content: "Ask your AI tutor anything — Math, Science, English, or History. Instant explanations with full math rendering." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { mode: "signin" as const } });
  },
  errorComponent: RouteError,
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
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<(text?: string) => Promise<void>>(() => Promise.resolve());
  const convoModeRef = useRef(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const geminiWsRef = useRef<WebSocket | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const pendingAsstTextRef = useRef("");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [mobileExtrasOpen, setMobileExtrasOpen] = useState(false);

  useEffect(() => {
    import("katex/dist/katex.min.css");
  }, []);
  const [convoSearch, setConvoSearch] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const sidebarDraggingRef = useRef(false);
  const sidebarStartXRef = useRef(0);
  const sidebarStartWidthRef = useRef(320);
  const [mounted, setMounted] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const filteredConversations = useMemo(
    () =>
      convoSearch.trim()
        ? conversations.filter((c) => c.title.toLowerCase().includes(convoSearch.toLowerCase()))
        : conversations,
    [conversations, convoSearch],
  );
  useEffect(() => {
    setMounted(true);
    setSpeechSupported(
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    );
    setTtsSupported("speechSynthesis" in window);
    return () => { stopGeminiLive(); };
  }, []);

  useEffect(() => { convoModeRef.current = convoMode; }, [convoMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = Number(localStorage.getItem("chatSidebarWidth"));
    if (!Number.isNaN(saved) && saved >= 240 && saved <= 520) {
      setSidebarWidth(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("chatSidebarWidth", String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!sidebarDraggingRef.current) return;
      const nextWidth = Math.min(
        520,
        Math.max(240, sidebarStartWidthRef.current + (event.clientX - sidebarStartXRef.current)),
      );
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      if (!sidebarDraggingRef.current) return;
      sidebarDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
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

  function playLivePcm(base64: string) {
    const ctx = playbackCtxRef.current;
    if (!ctx) return;
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
    const buf = ctx.createBuffer(1, float32.length, 24000);
    buf.getChannelData(0).set(float32);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const now = ctx.currentTime;
    const start = Math.max(nextPlayTimeRef.current, now);
    src.start(start);
    nextPlayTimeRef.current = start + buf.duration;
  }

  function handleLiveMessage(raw: string) {
    let data: any;
    try { data = JSON.parse(raw); } catch { return; }
    const sc = data.serverContent;
    if (!sc) return;
    const parts: any[] = sc.modelTurn?.parts ?? [];
    for (const p of parts) {
      if (p.inlineData?.data) playLivePcm(p.inlineData.data);
      if (p.text) pendingAsstTextRef.current += p.text;
    }
    if (sc.turnComplete && pendingAsstTextRef.current.trim()) {
      const text = pendingAsstTextRef.current.trim();
      pendingAsstTextRef.current = "";
      setMessages((prev) => [...prev, { role: "assistant" as const, content: text }]);
    }
  }

  function stopGeminiLive() {
    processorRef.current?.disconnect();
    processorRef.current = null;
    micCtxRef.current?.close();
    micCtxRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    playbackCtxRef.current?.close();
    playbackCtxRef.current = null;
    geminiWsRef.current?.close();
    geminiWsRef.current = null;
    nextPlayTimeRef.current = 0;
    pendingAsstTextRef.current = "";
  }

  async function startGeminiLive() {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    const { key } = await getGeminiKey({ headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    if (!key) { toast.error("Voice conversation not configured."); return; }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch((err: any) => {
      const name = err?.name ?? "";
      if (name === "NotAllowedError") toast.error("Microphone permission denied.");
      else if (name === "NotFoundError") toast.error("No microphone found.");
      else toast.error("Couldn't access microphone.");
      return null;
    });
    if (!stream) return;

    micStreamRef.current = stream;
    const playCtx = new AudioContext();
    await playCtx.resume();
    playbackCtxRef.current = playCtx;
    nextPlayTimeRef.current = 0;

    const ws = new WebSocket(
      `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${key}`,
    );
    geminiWsRef.current = ws;

    ws.onopen = () => {
      console.log("[GeminiLive] WebSocket open, sending setup");
      ws.send(JSON.stringify({
        config: {
          model: "models/gemini-3.1-flash-live-preview",
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } },
          systemInstruction: {
            parts: [{ text: "You are a friendly AI homework tutor. Help students learn by walking through problems step by step. Keep answers clear and concise." }],
          },
        },
      }));
    };

    ws.onmessage = async (e) => {
      let msg: any;
      try { msg = JSON.parse(e.data); } catch { return; }

      // Gemini sends either camelCase or snake_case depending on API version
      if (msg.setupComplete || msg.setup_complete) {
        console.log("[GeminiLive] Setup complete, starting mic");
        const micCtx = new AudioContext();
        await micCtx.resume();
        micCtxRef.current = micCtx;
        const source = micCtx.createMediaStreamSource(stream);
        const bufSize = 4096;
        const proc = micCtx.createScriptProcessor(bufSize, 1, 1);
        processorRef.current = proc;
        proc.onaudioprocess = (ev) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const input = ev.inputBuffer.getChannelData(0);
          const ratio = micCtx.sampleRate / 16000;
          const outLen = Math.floor(input.length / ratio);
          const int16 = new Int16Array(outLen);
          for (let i = 0; i < outLen; i++) {
            const s = input[Math.floor(i * ratio)];
            int16[i] = Math.max(-32768, Math.min(32767, s * 32768));
          }
          ws.send(JSON.stringify({
            realtimeInput: { audio: { data: bufToBase64(int16.buffer), mimeType: "audio/pcm;rate=16000" } },
          }));
        };
        source.connect(proc);
        proc.connect(micCtx.destination);
        return;
      }

      console.log("[GeminiLive] Message:", JSON.stringify(msg).slice(0, 200));
      handleLiveMessage(e.data);
    };

    ws.onerror = (ev) => {
      console.error("[GeminiLive] WebSocket error", ev);
      toast.error("Voice connection error — ending conversation.");
      setConvoMode(false);
      setListening(false);
      stopGeminiLive();
    };

    ws.onclose = (ev) => {
      console.log("[GeminiLive] WebSocket closed", ev.code, ev.reason);
      if (convoModeRef.current) {
        setConvoMode(false);
        setListening(false);
        stopGeminiLive();
      }
    };

    setListening(true);
  }

  async function toggleConvoMode() {
    if (convoMode) {
      setConvoMode(false);
      setListening(false);
      stopGeminiLive();
      return;
    }
    setConvoMode(true);
    toast.success("Connecting to voice conversation…");
    await startGeminiLive();
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
      .select("id, role, content, image")
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
        image: m.image ?? undefined,
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
    
    // Find conversation title for better confirmation message
    const convo = conversations.find(c => c.id === id);
    const title = convo?.title || "this chat";
    
    if (!confirm(`Delete "${title}"? This will permanently remove all messages in this conversation.`)) return;
    
    try {
      const { error } = await supabase.from("conversations").delete().eq("id", id);
      if (error) {
        toast.error("Failed to delete conversation");
        console.error("Delete error:", error);
        return;
      }
      
      toast.success("Conversation deleted");
      if (activeId === id) newChat();
      await loadConversations();
    } catch (err) {
      toast.error("Something went wrong");
      console.error("Delete error:", err);
    }
  }

  async function deleteAllConversations() {
    if (conversations.length === 0) {
      toast.error("No conversations to delete");
      return;
    }
    
    if (!confirm(`Delete all ${conversations.length} conversations? This will permanently remove all your chat history and cannot be undone.`)) return;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Please sign in again");
        return;
      }
      
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("user_id", userData.user.id);
        
      if (error) {
        toast.error("Failed to delete conversations");
        console.error("Delete all error:", error);
        return;
      }
      
      toast.success(`Deleted ${conversations.length} conversations`);
      newChat();
      await loadConversations();
    } catch (err) {
      toast.error("Something went wrong");
      console.error("Delete all error:", err);
    }
  }

  function exportConversation() {
    if (messages.length === 0) return;
    const convo = conversations.find((c) => c.id === activeId);
    const title = convo?.title ?? "conversation";
    const lines = messages.map((m) =>
      `## ${m.role === "user" ? "You" : "ScholarX"}\n\n${m.content}`,
    );
    const md = `# ${title}\n\n${lines.join("\n\n---\n\n")}`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text && !imageFile) return;

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
        const title = text || "Image analysis";
        const { data, error } = await supabase
          .from("conversations")
          .insert({ user_id: u.user.id, title, subject })
          .select("id")
          .single();
        if (error) throw error;
        convoId = data.id;
        setActiveId(convoId);
      }

      let userMsg: Msg;
      let imageBase64: string | undefined;

      if (imageFile) {
        imageBase64 = await compressImage(imageFile);
        userMsg = { role: "user", content: text, image: imageBase64 };
      } else {
        userMsg = { role: "user", content: text };
      }

      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);

      await supabase.from("messages").insert({
        conversation_id: convoId,
        user_id: u.user.id,
        role: "user",
        content: text,
        image: imageBase64,
      });

      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const result = await askHomework({
        data: {
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          subject,
          image: imageBase64,
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
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setLoading(false);
      setImageFile(null);
    }
  }

  useEffect(() => {
    sendRef.current = send;
  });

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Mobile drawer — same content as desktop sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-80 p-0 flex flex-col">
          <div className="flex items-center gap-2 px-5 py-5 font-display text-lg font-semibold">
            <img src="/logo-removebg-preview.png" className="h-8 w-8 object-contain" alt="ScholarX" />
            ScholarX
          </div>
          <div className="px-3">
            <Button
              onClick={() => { newChat(); setMobileMenuOpen(false); }}
              className="w-full justify-start gap-2"
              variant="secondary"
            >
              <Plus className="h-4 w-4" /> New chat
            </Button>
          </div>
          <div className="mt-4 px-5 text-xs uppercase tracking-wider text-muted-foreground">
            History
          </div>
          <div className="px-3 pt-2 pb-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="mobile-convo-search"
                name="mobile-convo-search"
                value={convoSearch}
                onChange={(e) => setConvoSearch(e.target.value)}
                placeholder="Search chats…"
                className="w-full rounded-md border border-border bg-secondary/50 py-1.5 pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-primary"
              />
            </div>
          </div>
          <ScrollArea className="mt-2 flex-1 px-2">
            <ul className="space-y-1 pb-4">
              {conversations.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No chats yet. Ask your first question!
                </li>
              )}
              {filteredConversations.length === 0 && conversations.length > 0 && (
                <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No chats match "{convoSearch}"
                </li>
              )}
              {filteredConversations.map((c) => (
                <li key={c.id}>
                  <div className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { selectConversation(c.id); setMobileMenuOpen(false); }}
                      className={`flex-1 flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        activeId === c.id
                          ? "bg-primary/15 text-foreground"
                          : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate">{c.title}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => deleteConversation(c.id, e)}
                      className="h-8 w-8 flex items-center justify-center shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                      title="Delete conversation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
          <div className="border-t border-border px-3 py-3 space-y-1">
            <Link
              to="/planner"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
            >
              <ListTodo className="h-4 w-4" /> Study planner
            </Link>
            <Link
              to="/progress"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
            >
              <TrendingUp className="h-4 w-4" /> Progress
            </Link>
            <button
              onClick={() => setMobileExtrasOpen(!mobileExtrasOpen)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
            >
              <Sparkles className="h-4 w-4" />
              Extra functions
              <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform duration-200 ${mobileExtrasOpen ? "rotate-180" : ""}`} />
            </button>
            {mobileExtrasOpen && (
              <div className="ml-4 space-y-0.5 border-l border-border pl-2">
                <Link to="/flashcards" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition">
                  <Layers className="h-3.5 w-3.5" /> Flashcards
                </Link>
                <Link to="/tests" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition">
                  <BookOpen className="h-3.5 w-3.5" /> Test creator
                </Link>
                <Link to="/graph" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition">
                  <LineChart className="h-3.5 w-3.5" /> Graphing
                </Link>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 px-2 pt-1 text-sm">
              <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="min-w-0 truncate text-muted-foreground hover:text-foreground transition">
                {displayName}
              </Link>
              <Button variant="ghost" size="icon" onClick={logout} title="Sign out" className="shrink-0">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sidebar — desktop only */}
      <aside
        className="hidden shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur md:flex min-w-[240px] max-w-[520px] relative"
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="absolute inset-y-0 right-0 flex w-8 cursor-col-resize hover:bg-border/20">
          <div className="pt-4 flex items-start justify-center w-full">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <button
            type="button"
            className="absolute inset-0"
            onMouseDown={(e) => {
              e.preventDefault();
              sidebarDraggingRef.current = true;
              sidebarStartXRef.current = e.clientX;
              sidebarStartWidthRef.current = sidebarWidth;
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
            }}
            aria-label="Resize sidebar"
          />
        </div>
        <div className="flex items-center gap-2 px-5 py-5 font-display text-lg font-semibold">
          <img src="/logo-removebg-preview.png" className="h-8 w-8 object-contain" alt="ScholarX" />
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
        <div className="px-3 pt-2 pb-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              id="convo-search"
              name="convo-search"
              value={convoSearch}
              onChange={(e) => setConvoSearch(e.target.value)}
              placeholder="Search chats…"
              className="w-full rounded-md border border-border bg-secondary/50 py-1.5 pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
        </div>
        {conversations.length > 0 && (
          <div className="px-3 pb-2">
            <Button
              onClick={deleteAllConversations}
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete all conversations
            </Button>
          </div>
        )}
        <ScrollArea className="mt-2 flex-1 px-2">
          <ul className="space-y-1 pb-4">
            {conversations.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                No chats yet. Ask your first question!
              </li>
            )}
            {filteredConversations.length === 0 && conversations.length > 0 && (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                No chats match "{convoSearch}"
              </li>
            )}
            {filteredConversations.map((c) => (
              <li key={c.id}>
                <div className="flex items-center gap-1 group">
                  <button
                    onClick={() => selectConversation(c.id)}
                    className={`flex-1 flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      activeId === c.id
                        ? "bg-primary/15 text-foreground"
                        : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">{c.title}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => deleteConversation(c.id, e)}
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
        <div className="border-t border-border px-3 py-3 space-y-1">
          <Link
            to="/planner"
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
          >
            <ListTodo className="h-4 w-4" /> Study planner
          </Link>
          <Link
            to="/progress"
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
          >
            <TrendingUp className="h-4 w-4" /> Progress
          </Link>
          <button
            onClick={() => setExtrasOpen(!extrasOpen)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition"
          >
            <Sparkles className="h-4 w-4" />
            Extra functions
            <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform duration-200 ${extrasOpen ? "rotate-180" : ""}`} />
          </button>
          {extrasOpen && (
            <div className="ml-4 space-y-0.5 border-l border-border pl-2">
              <Link to="/flashcards" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition">
                <Layers className="h-3.5 w-3.5" /> Flashcards
              </Link>
              <Link to="/tests" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition">
                <BookOpen className="h-3.5 w-3.5" /> Test creator
              </Link>
              <Link to="/graph" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition">
                <LineChart className="h-3.5 w-3.5" /> Graphing
              </Link>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 px-2 pt-1 text-sm">
            <Link to="/profile" className="min-w-0 truncate text-muted-foreground hover:text-foreground transition">
              {displayName}
            </Link>
            <Button variant="ghost" size="icon" onClick={logout} title="Sign out" className="shrink-0">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Top: subject buttons */}
        <header className="flex items-center gap-2 border-b border-border px-4 py-3 md:px-6">
          <button
            className="md:hidden shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          {messages.length > 0 && (
            <Button
              onClick={exportConversation}
              size="icon"
              variant="ghost"
              className="shrink-0 h-8 w-8"
              title="Export conversation as Markdown"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          <div className="flex flex-1 items-center gap-2 overflow-x-auto min-w-0">
            <span className="shrink-0 text-sm text-muted-foreground">Subject:</span>
            <button
              onClick={() => setSubject("general")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
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
                  className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
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
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.length === 0 && <EmptyState subject={subject} onPick={setInput} />}
            {messages.map((m, i) => (
              <Bubble key={m.id ?? i} role={m.role} content={m.content} image={m.image} ttsSupported={ttsSupported} />
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
                id="chat-input"
                name="chat-input"
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
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"
                title="Upload image"
              >
                <Layers className="h-4 w-4" />
              </label>
              {imageFile && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{imageFile.name}</span>
                  <Button
                    onClick={() => setImageFile(null)}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
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
              {mounted && (
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
                disabled={loading || (!input.trim() && !imageFile)}
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

function Bubble({ role, content, image, ttsSupported }: { role: "user" | "assistant"; content: string; image?: string; ttsSupported: boolean }) {
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
    const voice = pickVoice();
    if (voice) u.voice = voice;
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
        {image && <img src={`data:image/jpeg;base64,${image}`} alt="Uploaded" className="mb-2 max-w-full rounded-lg" />}
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

// Markdown + KaTeX renderer. Display math blocks are pre-tokenized so the
// paragraph splitter never fragments a $$...$$ or \[...\] spanning blank lines.
function FormattedContent({ text }: { text: string }) {
  type Seg = { kind: 'math'; src: string } | { kind: 'text'; src: string };

  // Step 1: extract all display-math blocks before splitting on blank lines.
  const segs: Seg[] = [];
  const displayRe = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\])/g;
  let cur = 0;
  let dm: RegExpExecArray | null;
  while ((dm = displayRe.exec(text)) !== null) {
    if (dm.index > cur) segs.push({ kind: 'text', src: text.slice(cur, dm.index) });
    const raw = dm[0];
    // Both $$ and \[ delimiters are 2 chars; slice off the delimiters on both sides.
    segs.push({ kind: 'math', src: raw.slice(2, -2) });
    cur = dm.index + raw.length;
  }
  if (cur < text.length) segs.push({ kind: 'text', src: text.slice(cur) });

  // Step 2: render each segment.
  let keyIdx = 0;
  const nodes: React.ReactNode[] = [];

  for (const seg of segs) {
    if (seg.kind === 'math') {
      nodes.push(renderMath(seg.src, true, keyIdx++));
      continue;
    }

    // Split text segment into paragraph blocks.
    const blocks = seg.src.split(/\n{2,}/);
    for (const b of blocks) {
      const blk = b.trim();
      if (!blk) continue;
      const k = keyIdx++;

      if (blk.startsWith('### ')) {
        nodes.push(<h3 key={k} className="text-lg font-semibold mt-4 mb-2">{renderInline(blk.slice(4))}</h3>);
        continue;
      }
      if (blk.startsWith('## ')) {
        nodes.push(<h2 key={k} className="text-xl font-semibold mt-5 mb-3">{renderInline(blk.slice(3))}</h2>);
        continue;
      }
      if (blk.startsWith('# ')) {
        nodes.push(<h1 key={k} className="text-2xl font-bold mt-6 mb-4">{renderInline(blk.slice(2))}</h1>);
        continue;
      }
      if (/^```/.test(blk)) {
        const code = blk.replace(/^```\w*\n?|```$/g, '');
        nodes.push(
          <pre key={k} className="overflow-x-auto rounded-lg bg-background/60 p-3 font-mono text-xs">
            {code}
          </pre>
        );
        continue;
      }
      if (/^\|.*\|$/.test(blk) && blk.includes('|')) {
        const rows = blk.split('\n').filter(r => r.trim());
        if (rows.length >= 2) {
          nodes.push(
            <table key={k} className="border-collapse border border-border rounded-lg overflow-hidden my-2">
              <tbody>
                {rows.map((row, ri) => {
                  const cells = row.split('|').filter(c => c !== '').map(c => c.trim());
                  return (
                    <tr key={ri}>
                      {cells.map((cell, ci) => (
                        <td key={ci} className="border border-border px-3 py-2 text-sm">{renderInline(cell)}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
          continue;
        }
      }
      if (/^(\s*[-*]\s)/m.test(blk)) {
        nodes.push(
          <ul key={k} className="list-disc space-y-1 pl-5">
            {blk.split('\n').map((line, j) => (
              <li key={j}>{renderInline(line.replace(/^\s*[-*]\s/, ''))}</li>
            ))}
          </ul>
        );
        continue;
      }
      if (/^\s*\d+\.\s/.test(blk)) {
        nodes.push(
          <ol key={k} className="list-decimal space-y-1 pl-5">
            {blk.split('\n').map((line, j) => (
              <li key={j}>{renderInline(line.replace(/^\s*\d+\.\s/, ''))}</li>
            ))}
          </ol>
        );
        continue;
      }
      nodes.push(<p key={k}>{renderInline(blk)}</p>);
    }
  }

  return <div className="space-y-2 whitespace-pre-wrap break-words">{nodes}</div>;
}

function GraphableMath({ src, display }: { src: string; display: boolean }) {
  const [open, setOpen] = useState(false);
  let html = "";
  try {
    html = katex.renderToString(src, { displayMode: display, throwOnError: false, output: "html" });
  } catch {
    return <span>{src}</span>;
  }

  if (display) {
    return (
      <>
        <div className="my-3 flex items-center gap-3">
          <span
            className="flex-1 overflow-x-auto text-center"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            title="Open in Desmos"
          >
            <LineChart className="h-3 w-3" />
            Graph
          </button>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl overflow-hidden p-0">
            <div className="px-5 pt-5 pb-3">
              <DialogTitle className="font-mono text-sm font-medium">{src}</DialogTitle>
            </div>
            <DesmosGraph expression={src} height={460} keypad={false} />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <span dangerouslySetInnerHTML={{ __html: html }} />
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-primary/60 hover:text-primary hover:bg-primary/10 transition ml-0.5 align-middle"
        title="Graph this"
      >
        <LineChart className="h-2.5 w-2.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl overflow-hidden p-0">
          <div className="px-5 pt-5 pb-3">
            <DialogTitle className="font-mono text-sm font-medium">{src}</DialogTitle>
          </div>
          <DesmosGraph expression={src} height={460} keypad={false} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function renderMath(src: string, displayMode: boolean, key: string | number) {
  return <GraphableMath key={key} src={src} display={displayMode} />;
}

function renderInline(s: string): React.ReactNode {
  // Split on $$...$$, \[...\], $...$, \(...\), **bold**, *italics*, `code`
  const regex =
    /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
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
          {renderInline(p.slice(2, -2))}
        </strong>
      );
    if (/^\*.+\*$/.test(p))
      return (
        <em key={i} className="italic">
          {renderInline(p.slice(1, -1))}
        </em>
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

const ALL_PROMPTS: Record<Subject, string[]> = {
  math: [
    "Walk me through solving 2x² + 5x − 3 = 0 step by step",
    "Explain the chain rule with a simple example",
    "How do I find the area under a curve using integration?",
    "What's the difference between permutations and combinations?",
    "Help me understand the Pythagorean theorem",
    "How do I solve a system of two equations?",
    "Explain what a derivative means in plain English",
    "What are the rules for working with exponents?",
  ],
  science: [
    "Why does ice float on water?",
    "Explain photosynthesis in 5 steps",
    "What is Newton's second law and how do I use it?",
    "How does DNA replication work?",
    "What's the difference between an atom and a molecule?",
    "Explain the water cycle step by step",
    "Why do objects fall at the same speed regardless of mass?",
    "What causes seasons on Earth?",
  ],
  english: [
    "Help me outline an essay about the theme of identity in 'The Outsiders'",
    "What's the difference between 'affect' and 'effect'?",
    "How do I write a strong thesis statement?",
    "Explain the difference between a simile and a metaphor",
    "Help me improve this sentence: 'The thing was very big and it was scary'",
    "What are the main elements of a short story?",
    "How do I cite sources in MLA format?",
    "What is foreshadowing? Give me an example",
  ],
  history: [
    "What caused World War I? Give me the main factors.",
    "Compare the American and French Revolutions",
    "Why did the Roman Empire fall?",
    "What was the significance of the Magna Carta?",
    "Explain the causes and effects of the Great Depression",
    "Who were the key figures of the Civil Rights Movement?",
    "What led to World War II in Europe?",
    "How did the Cold War shape the modern world?",
  ],
  general: [
    "Explain Newton's three laws of motion",
    "Help me understand fractions",
    "What is a metaphor? Give 3 examples",
    "How do I manage my time better for studying?",
    "What's the best way to take notes in class?",
    "Help me make a study plan for my exams",
    "Explain the scientific method step by step",
    "What is critical thinking and how do I practise it?",
  ],
};

function shuffle(arr: string[]): string[] {
  const pool = [...arr];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

function EmptyState({ subject, onPick }: { subject: Subject; onPick: (s: string) => void }) {
  // Start deterministic (SSR-safe) and shuffle after hydration in useEffect
  const [displayed, setDisplayed] = useState<string[]>(ALL_PROMPTS[subject].slice(0, 3));

  useEffect(() => {
    setDisplayed(shuffle(ALL_PROMPTS[subject]));
  }, [subject]);

  return (
    <div className="mt-12 text-center">
      <img src="/logo-removebg-preview.png" className="mx-auto h-14 w-14 object-contain" alt="ScholarX" />
      <h2 className="mt-5 text-2xl font-bold">What are you studying today?</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick a subject above and ask anything. I'll explain step by step.
      </p>
      <div className="mx-auto mt-8 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
        {displayed.map((p) => (
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

