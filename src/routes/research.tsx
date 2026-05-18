import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateResearchReport } from "@/api/study.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteError } from "@/components/ui/route-error";
import { useConfirm } from "@/components/ui/confirm";
import { downloadMarkdown, printMarkdownAsPdf, markdownToHtml } from "@/lib/export";
import { toast } from "sonner";
import {
  ArrowLeft,
  Microscope,
  Loader2,
  Sparkles,
  Trash2,
  Save,
  Download,
  FileDown,
  Plus,
} from "lucide-react";

type Source = { label: string; text: string };
type ChatMsg = { role: "user" | "assistant"; content: string };
type DocRow = {
  id: string;
  title: string;
  topic: string | null;
  content: string;
  sources: unknown;
  created_at: string;
};

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Research Mode — ScholarX" },
      {
        name: "description",
        content: "Synthesize a cited research report from sources you provide.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { mode: "signin" as const } });
  },
  errorComponent: RouteError,
  component: ResearchPage,
});

function ResearchPage() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [brief, setBrief] = useState("");
  const [style, setStyle] = useState<"report" | "literature_review" | "summary">("report");
  const [sources, setSources] = useState<Source[]>([{ label: "", text: "" }]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ranFromChat = useRef(false);

  const docsQuery = useQuery<DocRow[]>({
    queryKey: ["documents", "research"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, topic, content, sources, created_at")
        .eq("kind", "research")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocRow[];
    },
    staleTime: 1000 * 60 * 2,
  });

  // Hand-off from chat: use the transcript as one source.
  useEffect(() => {
    if (ranFromChat.current) return;
    const raw = sessionStorage.getItem("scholarx:fromChat");
    if (!raw) return;
    sessionStorage.removeItem("scholarx:fromChat");
    ranFromChat.current = true;
    try {
      const parsed = JSON.parse(raw) as { topic?: string; messages?: ChatMsg[] };
      if (parsed.topic)
        setBrief(
          `Summarize and analyze the following tutoring conversation about "${parsed.topic}".`,
        );
      if (parsed.messages?.length) {
        setSources([
          {
            label: parsed.topic ? `Chat: ${parsed.topic}` : "Chat transcript",
            text: parsed.messages.map((m) => `${m.role}: ${m.content}`).join("\n\n"),
          },
        ]);
      }
    } catch {
      /* ignore malformed hand-off */
    }
  }, []);

  function updateSource(i: number, patch: Partial<Source>) {
    setSources((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addSource() {
    if (sources.length >= 8) {
      toast.error("Up to 8 sources.");
      return;
    }
    setSources((prev) => [...prev, { label: "", text: "" }]);
  }
  function removeSource(i: number) {
    setSources((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function run() {
    const cleaned = sources
      .map((s) => ({ label: s.label.trim() || "Untitled source", text: s.text.trim() }))
      .filter((s) => s.text.length > 0);
    if (!brief.trim()) {
      toast.error("Add a research brief.");
      return;
    }
    if (cleaned.length === 0) {
      toast.error("Add at least one source with text.");
      return;
    }
    setLoading(true);
    setSelectedId(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const result = await generateResearchReport({
        data: { brief: brief.trim(), sources: cleaned, style },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (result.error || !result.content) {
        toast.error(result.error ?? "Could not generate the report.");
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

  async function saveReport() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.error("Sign in required");
        return;
      }
      const title =
        (content.split("\n")[0].replace(/^#\s*/, "") || brief).slice(0, 120) || "Research report";
      const { data, error } = await supabase
        .from("documents")
        .insert({
          user_id: u.user.id,
          kind: "research",
          title,
          topic: brief.slice(0, 200),
          content,
          sources: sources
            .filter((s) => s.text.trim())
            .map((s) => ({ label: s.label, text: s.text.slice(0, 4000) })),
        })
        .select("id")
        .single();
      if (error || !data) {
        toast.error("Could not save");
        return;
      }
      setSelectedId(data.id);
      toast.success("Saved to your library");
      queryClient.invalidateQueries({ queryKey: ["documents", "research"] });
    } finally {
      setSaving(false);
    }
  }

  async function deleteReport(id: string) {
    if (
      !(await confirm({ title: "Delete this report?", confirmText: "Delete", destructive: true }))
    )
      return;
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
    queryClient.invalidateQueries({ queryKey: ["documents", "research"] });
  }

  function openSaved(d: DocRow) {
    setSelectedId(d.id);
    setContent(d.content);
    setBrief(d.topic ?? "");
    const restored = Array.isArray(d.sources) ? (d.sources as Source[]) : [];
    setSources(restored.length ? restored : [{ label: "", text: "" }]);
  }

  const title = (content.split("\n")[0]?.replace(/^#\s*/, "") || "Research report").slice(0, 120);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur md:flex">
        <div className="flex items-center gap-2 px-5 py-5 font-display text-lg font-semibold">
          <Microscope className="h-5 w-5 text-primary" /> Research
        </div>
        <div className="px-3">
          <Button asChild variant="secondary" className="w-full justify-start gap-2">
            <Link to="/chat">
              <ArrowLeft className="h-4 w-4" /> Back to chat
            </Link>
          </Button>
        </div>
        <div className="mt-4 px-5 text-xs uppercase tracking-wider text-muted-foreground">
          Saved reports
        </div>
        <ScrollArea className="mt-2 flex-1 px-2">
          <ul className="space-y-1 pb-4">
            {docsQuery.isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="h-10 rounded-lg" />
                </li>
              ))}
            {!docsQuery.isLoading && (docsQuery.data ?? []).length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                No saved reports yet.
              </li>
            )}
            {(docsQuery.data ?? []).map((d) => (
              <li key={d.id}>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openSaved(d)}
                    className={`flex-1 truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedId === d.id
                        ? "bg-primary/15 text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {d.title}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => void deleteReport(d.id)}
                    aria-label="Delete report"
                  >
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
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            aria-label="Back to chat"
          >
            <Link to="/chat">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1
              className="text-base font-semibold leading-none"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Research mode
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Synthesizes a cited report from sources you provide — grounded, no outside facts.
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-6">
            <div className="rounded-xl border border-border bg-card/70 p-4 space-y-4 backdrop-blur-md">
              <div>
                <label htmlFor="brief" className="mb-1 block text-xs text-muted-foreground">
                  Research brief / question
                </label>
                <Textarea
                  id="brief"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="e.g. Compare what these sources say about the causes of the 1929 crash and assess which is best supported."
                  className="min-h-[72px] bg-background/50"
                  maxLength={2000}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Sources ({sources.length}/8)
                  </span>
                  <Button size="sm" variant="outline" className="gap-1" onClick={addSource}>
                    <Plus className="h-3.5 w-3.5" /> Add source
                  </Button>
                </div>
                {sources.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border/80 bg-background/40 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        [{i + 1}]
                      </span>
                      <Input
                        value={s.label}
                        onChange={(e) => updateSource(i, { label: e.target.value })}
                        placeholder="Source label (title, author, URL…)"
                        className="bg-background/50"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeSource(i)}
                        disabled={sources.length === 1}
                        aria-label="Remove source"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Textarea
                      value={s.text}
                      onChange={(e) => updateSource(i, { text: e.target.value })}
                      placeholder="Paste the source text here…"
                      className="min-h-[120px] bg-background/50 font-mono text-xs"
                      maxLength={40000}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="style" className="mb-1 block text-xs text-muted-foreground">
                    Output style
                  </label>
                  <select
                    id="style"
                    value={style}
                    onChange={(e) => setStyle(e.target.value as typeof style)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="report">Research report</option>
                    <option value="literature_review">Literature review</option>
                    <option value="summary">Executive summary</option>
                  </select>
                </div>
                <Button onClick={run} disabled={loading} className="gap-2">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {loading ? "Synthesizing…" : "Generate report"}
                </Button>
              </div>
            </div>

            {content && (
              <div className="rounded-xl border border-border bg-card/70 p-5 backdrop-blur-md">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                    Report
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {!selectedId && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={saveReport}
                        disabled={saving}
                        className="gap-1"
                      >
                        {saving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Save
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1"
                      onClick={() => downloadMarkdown(title, content)}
                    >
                      <Download className="h-3.5 w-3.5" /> .md
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1"
                      onClick={() => {
                        if (!printMarkdownAsPdf(title, content))
                          toast.error("Allow pop-ups to export PDF.");
                      }}
                    >
                      <FileDown className="h-3.5 w-3.5" /> PDF
                    </Button>
                  </div>
                </div>
                <div
                  className="max-w-none text-sm leading-relaxed [&_h1]:mb-3 [&_h1]:mt-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_code]:rounded [&_code]:bg-background/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline"
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
