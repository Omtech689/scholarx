import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  CalendarDays,
  Flame,
  Clock,
  ArrowLeft,
  ListTodo,
  Flag,
} from "lucide-react";

type Priority = "low" | "medium" | "high";
type Task = {
  id: string;
  title: string;
  notes: string | null;
  subject: string | null;
  due_date: string | null;
  priority: Priority;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

const SUBJECTS = ["Math", "Science", "English", "History", "Other"];
const PRIORITIES: { id: Priority; label: string; color: string }[] = [
  { id: "low", label: "Low", color: "var(--science)" },
  { id: "medium", label: "Medium", color: "var(--english)" },
  { id: "high", label: "High", color: "var(--history)" },
];

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Study Planner — Synaptic" },
      { name: "description", content: "Track assignments, deadlines and priorities. Your personal study planner." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: PlannerPage,
});

function PlannerPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<"all" | "today" | "upcoming" | "overdue" | "done">("all");

  // form state
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [subject, setSubject] = useState<string>("Math");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("study_tasks")
      .select("*")
      .order("completed", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Couldn't load tasks");
    } else {
      setTasks((data ?? []) as Task[]);
    }
    setLoading(false);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Sign in required");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("study_tasks").insert({
      user_id: u.user.id,
      title: title.trim(),
      notes: notes.trim() || null,
      subject,
      due_date: dueDate || null,
      priority,
    });
    setSaving(false);
    if (error) {
      toast.error("Couldn't save task");
      return;
    }
    setTitle("");
    setNotes("");
    setDueDate("");
    setPriority("medium");
    setShowNew(false);
    toast.success("Task added");
    void load();
  }

  async function toggleDone(t: Task) {
    const next = !t.completed;
    setTasks((cur) =>
      cur.map((x) =>
        x.id === t.id ? { ...x, completed: next, completed_at: next ? new Date().toISOString() : null } : x,
      ),
    );
    const { error } = await supabase
      .from("study_tasks")
      .update({ completed: next, completed_at: next ? new Date().toISOString() : null })
      .eq("id", t.id);
    if (error) {
      toast.error("Update failed");
      void load();
    }
  }

  async function removeTask(t: Task) {
    setTasks((cur) => cur.filter((x) => x.id !== t.id));
    const { error } = await supabase.from("study_tasks").delete().eq("id", t.id);
    if (error) {
      toast.error("Delete failed");
      void load();
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const counts = useMemo(() => {
    const out = { all: 0, today: 0, upcoming: 0, overdue: 0, done: 0 };
    for (const t of tasks) {
      out.all++;
      if (t.completed) {
        out.done++;
        continue;
      }
      if (t.due_date) {
        const d = new Date(t.due_date);
        d.setHours(0, 0, 0, 0);
        if (d.getTime() === today.getTime()) out.today++;
        else if (d.getTime() < today.getTime()) out.overdue++;
        else out.upcoming++;
      } else {
        out.upcoming++;
      }
    }
    return out;
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === "done") return t.completed;
      if (t.completed) return false;
      if (filter === "all") return true;
      if (!t.due_date) return filter === "upcoming";
      const d = new Date(t.due_date);
      d.setHours(0, 0, 0, 0);
      if (filter === "today") return d.getTime() === today.getTime();
      if (filter === "overdue") return d.getTime() < today.getTime();
      if (filter === "upcoming") return d.getTime() > today.getTime();
      return true;
    });
  }, [tasks, filter]);

  return (
    <div className="min-h-screen relative">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ backgroundImage: "var(--gradient-aurora)" }}
      />

      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md border-b border-border bg-background/60">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/chat"
              className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition"
              aria-label="Back to chat"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground"
                    style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
                <ListTodo className="h-4 w-4" />
              </span>
              <div>
                <h1 className="text-base font-semibold leading-none" style={{ fontFamily: "var(--font-display)" }}>
                  Study Planner
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">Plan it. Crush it.</p>
              </div>
            </div>
          </div>

          <Button onClick={() => setShowNew((v) => !v)} className="gap-2">
            <Plus className="h-4 w-4" />
            New task
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Today" value={counts.today} tint="var(--primary)" />
          <StatCard icon={<Clock className="h-4 w-4" />} label="Upcoming" value={counts.upcoming} tint="var(--math)" />
          <StatCard icon={<Flame className="h-4 w-4" />} label="Overdue" value={counts.overdue} tint="var(--history)" />
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Done" value={counts.done} tint="var(--science)" />
        </div>

        {/* New task form */}
        {showNew && (
          <form
            onSubmit={addTask}
            className="rounded-xl border border-border bg-card/70 backdrop-blur-md p-4 sm:p-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>Add a task</h2>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Finish chapter 4 problem set"
              required
              autoFocus
            />
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes…"
              rows={2}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Due date</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                <div className="flex gap-1">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id)}
                      className={`flex-1 h-9 rounded-md text-sm border transition ${
                        priority === p.id
                          ? "border-transparent text-primary-foreground"
                          : "border-border bg-transparent hover:bg-accent"
                      }`}
                      style={priority === p.id ? { background: p.color, color: "var(--background)" } : undefined}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !title.trim()}>
                {saving ? "Saving…" : "Add task"}
              </Button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {[
            { id: "all", label: `All · ${counts.all - counts.done}` },
            { id: "today", label: `Today · ${counts.today}` },
            { id: "upcoming", label: `Upcoming · ${counts.upcoming}` },
            { id: "overdue", label: `Overdue · ${counts.overdue}` },
            { id: "done", label: `Done · ${counts.done}` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as typeof filter)}
              className={`px-3 h-8 rounded-full text-xs font-medium whitespace-nowrap border transition ${
                filter === f.id
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Task list */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={() => setShowNew(true)} />
        ) : (
          <ul className="space-y-2">
            {filtered.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={() => toggleDone(t)} onDelete={() => removeTask(t)} today={today} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: number; tint: string }) {
  return (
    <div
      className="rounded-xl border border-border bg-card/65 backdrop-blur-md p-4 transition hover:-translate-y-0.5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span style={{ color: tint }}>{icon}</span>
        {label}
      </div>
      <div
        className="mt-1 text-2xl font-bold"
        style={{ fontFamily: "var(--font-display)", color: tint }}
      >
        {value}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  today,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  today: Date;
}) {
  const due = task.due_date ? new Date(task.due_date) : null;
  if (due) due.setHours(0, 0, 0, 0);
  const isOverdue = !task.completed && due && due.getTime() < today.getTime();
  const isToday = !task.completed && due && due.getTime() === today.getTime();
  const priorityColor =
    task.priority === "high" ? "var(--history)" :
    task.priority === "low" ? "var(--science)" : "var(--english)";

  return (
    <li
      className={`group rounded-xl border bg-card/65 backdrop-blur-md p-3 sm:p-4 flex items-start gap-3 transition hover:border-primary/50 ${
        task.completed ? "opacity-60" : ""
      }`}
      style={{ borderColor: "var(--border)" }}
    >
      <button
        onClick={onToggle}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition"
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
      >
        {task.completed ? (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`font-medium text-sm sm:text-base ${task.completed ? "line-through" : ""}`}
          >
            {task.title}
          </span>
          {task.subject && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-border text-muted-foreground">
              {task.subject}
            </span>
          )}
          <span
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: `color-mix(in oklab, ${priorityColor} 18%, transparent)`, color: priorityColor }}
          >
            <Flag className="h-3 w-3" />
            {task.priority}
          </span>
        </div>
        {task.notes && <p className="text-sm text-muted-foreground mt-1">{task.notes}</p>}
        {task.due_date && (
          <div
            className={`text-xs mt-1.5 inline-flex items-center gap-1 ${
              isOverdue ? "text-destructive" : isToday ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {isOverdue ? "Overdue · " : isToday ? "Today · " : ""}
            {new Date(task.due_date).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </div>
        )}
      </div>

      <button
        onClick={onDelete}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive p-1"
        aria-label="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16 px-4 rounded-xl border border-dashed border-border">
      <div
        className="mx-auto h-12 w-12 rounded-xl inline-flex items-center justify-center mb-3"
        style={{ background: "color-mix(in oklab, var(--primary) 15%, transparent)", color: "var(--primary)" }}
      >
        <ListTodo className="h-6 w-6" />
      </div>
      <h3 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
        Nothing here yet
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        Add your first assignment, project or study session — Synaptic will keep you on track.
      </p>
      <Button onClick={onAdd} className="mt-4 gap-2">
        <Plus className="h-4 w-4" />
        Add a task
      </Button>
    </div>
  );
}
