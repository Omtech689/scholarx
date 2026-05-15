import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RouteError } from "@/components/ui/route-error";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  ListTodo,
  Layers,
  BookOpen,
  MessageSquare,
  User,
  LogOut,
  TrendingUp,
  CheckCircle2,
  FlaskConical,
  BarChart2,
} from "lucide-react";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress — ScholarX" },
      { name: "description", content: "Track your study progress across tasks, flashcards, and tests." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  errorComponent: RouteError,
  component: ProgressPage,
});

type Task = { completed: boolean; subject: string | null; completed_at: string | null; created_at: string };
type TestRow = { topic: string; mode: string; questions: unknown; answers: unknown; created_at: string };
type DeckRow = { id: string; topic: string; created_at: string };
type ConvoRow = { subject: string | null; created_at: string };

function countMcqScore(questions: unknown, answers: unknown): { correct: number; total: number } {
  if (!Array.isArray(questions) || typeof answers !== "object" || !answers) return { correct: 0, total: 0 };
  const ans = answers as Record<string, string>;
  let correct = 0;
  let total = 0;
  for (const q of questions as Array<{ type: string; id: string; answer: string }>) {
    if (q.type === "mcq") {
      total++;
      if (ans[q.id] === q.answer) correct++;
    }
  }
  return { correct, total };
}

function ProgressPage() {
  const navigate = useNavigate();

  const profileQuery = useQuery<string>({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sign in required");
      const { data: p } = await supabase.from("profiles").select("display_name").eq("id", u.user.id).maybeSingle();
      return p?.display_name ?? u.user.email?.split("@")[0] ?? "Student";
    },
    staleTime: 1000 * 60 * 30,
  });

  const tasksQuery = useQuery<Task[]>({
    queryKey: ["study_tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("study_tasks").select("completed,subject,completed_at,created_at");
      if (error) throw error;
      return (data ?? []) as Task[];
    },
    staleTime: 1000 * 60 * 2,
  });

  const testsQuery = useQuery<TestRow[]>({
    queryKey: ["tests_progress"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from("tests")
        .select("topic,mode,questions,answers,created_at")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TestRow[];
    },
    staleTime: 1000 * 60 * 2,
  });

  const decksQuery = useQuery<DeckRow[]>({
    queryKey: ["flashcard_sets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("flashcard_sets").select("id,topic,created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DeckRow[];
    },
    staleTime: 1000 * 60 * 3,
  });

  const convosQuery = useQuery<ConvoRow[]>({
    queryKey: ["conversations_progress"],
    queryFn: async () => {
      const { data, error } = await supabase.from("conversations").select("subject,created_at");
      if (error) throw error;
      return (data ?? []) as ConvoRow[];
    },
    staleTime: 1000 * 60 * 2,
  });

  const displayName = profileQuery.data ?? "Student";
  const tasks = tasksQuery.data ?? [];
  const tests = testsQuery.data ?? [];
  const decks = decksQuery.data ?? [];
  const convos = convosQuery.data ?? [];

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.completed).length;
  const completionRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Tasks by subject bar chart
  const subjectCounts: Record<string, { done: number; total: number }> = {};
  for (const t of tasks) {
    const s = t.subject ?? "Other";
    if (!subjectCounts[s]) subjectCounts[s] = { done: 0, total: 0 };
    subjectCounts[s].total++;
    if (t.completed) subjectCounts[s].done++;
  }
  const subjectData = Object.entries(subjectCounts).map(([name, v]) => ({ name, Done: v.done, Total: v.total }));

  // Test scores over time line chart
  const testScoreData = tests
    .filter((t) => {
      const { total } = countMcqScore(t.questions, t.answers);
      return total > 0;
    })
    .map((t, i) => {
      const { correct, total } = countMcqScore(t.questions, t.answers);
      return {
        name: `#${i + 1}`,
        topic: t.topic,
        score: Math.round((correct / total) * 100),
      };
    });

  // Chats by subject
  const chatSubjectCounts: Record<string, number> = {};
  for (const c of convos) {
    const s = c.subject ?? "general";
    chatSubjectCounts[s] = (chatSubjectCounts[s] ?? 0) + 1;
  }
  const chatSubjectData = Object.entries(chatSubjectCounts).map(([name, value]) => ({ name, Chats: value }));

  const isLoading = tasksQuery.isLoading || testsQuery.isLoading || decksQuery.isLoading || convosQuery.isLoading;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur md:flex">
        <div className="flex items-center gap-2 px-5 py-5 font-display text-lg font-semibold">
          <img src="/logo-removebg-preview.png" className="h-8 w-8 object-contain" alt="ScholarX" />
          ScholarX
        </div>
        <div className="mt-auto border-t border-border px-3 py-3 space-y-2">
          <Link to="/chat" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition">
            <MessageSquare className="h-4 w-4" />Chat
          </Link>
          <Link to="/planner" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition">
            <ListTodo className="h-4 w-4" />Study planner
          </Link>
          <Link to="/tests" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition">
            <BookOpen className="h-4 w-4" />Test creator
          </Link>
          <Link to="/flashcards" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition">
            <Layers className="h-4 w-4" />Flashcards
          </Link>
          <Link to="/profile" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition">
            <User className="h-4 w-4" />Profile
          </Link>
          <div className="flex items-center justify-between gap-2 px-2 text-sm">
            <span className="truncate text-muted-foreground">{displayName}</span>
            <Button variant="ghost" size="icon" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-6">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground shrink-0" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
            <TrendingUp className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-base font-semibold leading-none" style={{ fontFamily: "var(--font-display)" }}>Progress</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Your study stats at a glance</p>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="max-w-5xl mx-auto px-4 py-6 md:px-6 space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Tasks done" value={`${doneTasks}/${totalTasks}`} sub={`${completionRate}% complete`} tint="var(--primary)" icon={<CheckCircle2 className="h-4 w-4" />} />
                  <StatCard label="Flashcard decks" value={decks.length} sub={`${decks.length} saved`} tint="var(--math)" icon={<Layers className="h-4 w-4" />} />
                  <StatCard label="Tests taken" value={tests.length} sub={`${testScoreData.length} with MCQ scores`} tint="var(--science)" icon={<BookOpen className="h-4 w-4" />} />
                  <StatCard label="AI chats" value={convos.length} sub="total conversations" tint="var(--english)" icon={<MessageSquare className="h-4 w-4" />} />
                </div>

                {/* Tasks by subject */}
                {subjectData.length > 0 && (
                  <ChartCard title="Tasks by subject" icon={<ListTodo className="h-4 w-4 text-primary" />}>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={subjectData} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                        <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                        />
                        <Bar dataKey="Done" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Total" fill="var(--muted)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                {/* Test scores over time */}
                {testScoreData.length > 1 && (
                  <ChartCard title="MCQ test scores over time (%)" icon={<BarChart2 className="h-4 w-4 text-primary" />}>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={testScoreData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} unit="%" />
                        <Tooltip
                          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                          formatter={(v: unknown) => [`${v}%`, "Score"]}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.topic ?? ""}
                        />
                        <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2} dot={{ fill: "var(--primary)", r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                {/* Chats by subject */}
                {chatSubjectData.length > 0 && (
                  <ChartCard title="Chats by subject" icon={<FlaskConical className="h-4 w-4 text-primary" />}>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chatSubjectData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                        <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                        />
                        <Bar dataKey="Chats" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                {totalTasks === 0 && tests.length === 0 && decks.length === 0 && convos.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
                    No activity yet. Start by chatting with the AI tutor, adding tasks, or creating flashcards!
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}

function StatCard({ label, value, sub, tint, icon }: { label: string; value: string | number; sub: string; tint: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/65 backdrop-blur-md p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <span style={{ color: tint }}>{icon}</span>
        {label}
      </div>
      <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: tint }}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/70 backdrop-blur-md p-4 sm:p-5">
      <h2 className="font-semibold flex items-center gap-2 mb-4" style={{ fontFamily: "var(--font-display)" }}>
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}
