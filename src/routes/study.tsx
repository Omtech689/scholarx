import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateStudyGuide } from "@/api/study.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteError } from "@/components/ui/route-error";
import { useConfirm } from "@/components/ui/confirm";
import { downloadMarkdown, printMarkdownAsPdf, markdownToHtml } from "@/lib/export";
import { toast } from "sonner";
import {
  ArrowLeft,
  GraduationCap,
  Loader2,
  Sparkles,
  Trash2,
  Save,
  Download,
  FileDown,
} from "lucide-react";

type ChatMsg = { role: "user" | "assistant"; content: string };
type DocRow = { id: string; title: string; topic: string | null; content: string; created_at: string };

export const Route = createFileRoute("/study")({
  head: () => ({
    meta: [
      { title: "Study Guides — ScholarX" },
      { name: "description", content: "Generate AI study guides from any topic or chat and save them." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { mode: "signin" as const } });
  },
  errorComponent: RouteError,
  component: StudyPage,
});

function StudyPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState("");
  const [detail, setDetail] = useState<"concise" | "standard" | "in_depth">("standard");
  const [seedMessages, setSeedMessages] = useState<ChatMsg[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ranFromChat = useRef(false);

  const docsQuery = useQuery<DocRow[]>({
    queryKey: ["documents", "study_guide"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, topic, content, created_at")
        .eq("kind", "study_guide")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocRow[];
    },
    staleTime: 1000 * 60 * 2,
  });

  async function run(seed?: ChatMsg[]) {
    if (!topic.trim() && !seed?.length) {
      toast.error("Enter a topic first.");
      return;
    }
    setLoading(true);
    setSelectedId(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const result = await generateStudyGuide({
        data: {
          topic: topic.trim() || "Study guide",
          detail,
          messages: seed && seed.length ? seed.slice(-16) : undefined,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (result.error || !result.content) {
        toast.error(result.error ?? "Could not generate a study guide.");
        return;
      }
      setContent(result.content);
    } catch (err) {
      console.error(err);
      toast.error("Request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Hand-off from the chat "Make a study guide" action.
  useEffect(() => {
    if (ranFromChat.current) return;
    const raw = sessionStorage.getItem("scholarx:fromChat");
    if (!raw) return;
    sessionStorage.removeItem("scholarx:fromChat");
    ranFromChat.current = true;
    try {
      const parsed = JSON.parse(raw) as { topic?: string; messages?: ChatMsg[] };
      if (parsed.topic) setTopic(parsed.topic);
      if (parsed.messages?.length) {
        setSeedMessages(parsed.messages);
        setTimeout(() => run(parsed.messages), 50);
      }
    } catch {
      /* ignore malformed hand-off */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveGuide() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.error("Sign in required");
        return;
      }
      const title = (topic.trim() || content.split("\n")[0].replace(/^#\s*/, "")).slice(0, 120) || "Study guide";
      const { data, error } = await supabase
        .from("documents")
        .insert({ user_id: u.user.id, kind: "study_guide", title, topic: topic.trim() || null, content })
        .select("id")
        .single();
      if (error || !data) {
        toast.error("Could not save");
        return;
      }
      setSelectedId(data.id);
      toast.success("Saved to your library");
      queryClient.invalidateQueries({ queryKey: ["documents", "study_guide"] });
    } finally {
      setSaving(false);
    }
  }

  async function deleteGuide(id: string) {
    if (!(await confirm({ title: "Delete this study guide?", confirmText: "Delete", destructive: true }))) return;
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed");
      return;
    }
    if (selectedId === id) {
      setSelectedId(null);
      setContent("");
    }
    toast.success("Deleted");
    queryClient.invalidateQueries({ queryKey: ["documents", "study_guide"] });
  }

  function openSaved(d: DocRow) {
    setSelectedId(d.id);
    setContent(d.content);
    setTopic(d.topic ?? d.title);
  }

  const title = topic.trim() || "Study guide";

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur md:flex">
        <div className="flex items-center gap-2 px-5 py-5 font-display text-lg font-semibold">
          <GraduationCap className="h-5 w-5 text-primary" /> Study guides
        </div>
        <div className="px-3">
          <Button asChild variant="secondary" className="w-full justify-start gap-2">
            <Link to="/chat">
              <ArrowLeft className="h-4 w-4" /> Back to chat
            </Link>
          </Button>
        </div>
        <div className="mt-4 px-5 text-xs uppercase tracking-wider text-muted-foreground">Saved</div>
        <ScrollArea className="mt-2 flex-1 px-2">
          <ul className="space-y-1 pb-4">
            {docsQuery.isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <li key={i}><Skeleton className="h-10 rounded-lg" /></li>
              ))}
            {!docsQuery.isLoading && (docsQuery.data ?? []).length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">No saved guides yet.</li>
            )}
            {(docsQuery.data ?? []).map((d) => (
              <li key={d.id}>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openSaved(d)}
                    className={`flex-1 truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedId === d.id ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {d.title}
                  </button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => void deleteGuide(d.id)} aria-label="Delete study guide">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border px-4 py-3 md:px-6">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 md:hidden" aria-label="Back to chat">
            <Link to="/chat"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>Study guide generator</h1>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-6">
            <div className="rounded-xl border border-border bg-card/70 p-4 space-y-3 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>Generate a study guide</h2>
              </div>
              {seedMessages && (
                <p className="rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
                  Using your chat conversation as the source material.
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <label htmlFor="study-topic" className="mb-1 block text-xs text-muted-foreground">Topic</label>
                  <Input
                    id="study-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Photosynthesis, French Revolution causes, derivatives"
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <label htmlFor="study-detail" className="mb-1 block text-xs text-muted-foreground">Depth</label>
                  <select
                    id="study-detail"
                    value={detail}
                    onChange={(e) => setDetail(e.target.value as typeof detail)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="concise">Concise</option>
                    <option value="standard">Standard</option>
                    <option value="in_depth">In depth</option>
                  </select>
                </div>
              </div>
              <Button onClick={() => run(seedMessages ?? undefined)} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "Generating…" : "Generate"}
              </Button>
            </div>

            {content && (
              <div className="rounded-xl border border-border bg-card/70 p-5 backdrop-blur-md">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>Preview</h3>
                  <div className="flex flex-wrap gap-2">
                    {!selectedId && (
                      <Button size="sm" variant="secondary" onClick={saveGuide} disabled={saving} className="gap-1">
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" className="gap-1" onClick={() => downloadMarkdown(title, content)}>
                      <Download className="h-3.5 w-3.5" /> .md
                    </Button>
                    <Button size="sm" variant="secondary" className="gap-1" onClick={() => { if (!printMarkdownAsPdf(title, content)) toast.error("Allow pop-ups to export PDF."); }}>
                      <FileDown className="h-3.5 w-3.5" /> PDF
                    </Button>
                  </div>
                </div>
                <div
                  className="prose-scholarx max-w-none text-sm leading-relaxed [&_h1]:mb-3 [&_h1]:mt-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_code]:rounded [&_code]:bg-background/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
