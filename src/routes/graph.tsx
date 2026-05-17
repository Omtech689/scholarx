import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { RouteError } from "@/components/ui/route-error";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DesmosGraph } from "@/components/desmos-graph";
import {
  LogOut,
  Menu,
  ListTodo,
  TrendingUp,
  MessageSquare,
  Layers,
  BookOpen,
  LineChart,
  ChevronDown,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/graph")({
  head: () => ({
    meta: [
      { title: "Graphing Calculator — ScholarX" },
      {
        name: "description",
        content: "Interactive Desmos graphing calculator for visualising mathematical functions.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  errorComponent: RouteError,
  component: GraphPage,
});

const NAV_LINK =
  "flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition";
const SUB_LINK =
  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition";

function GraphPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [mobileExtrasOpen, setMobileExtrasOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", u.user.id)
        .maybeSingle();
      setDisplayName(p?.display_name ?? u.user.email?.split("@")[0] ?? "Student");
    })();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  function SidebarFooter({ mobile = false }: { mobile?: boolean }) {
    const open = mobile ? mobileExtrasOpen : extrasOpen;
    const toggle = mobile
      ? () => setMobileExtrasOpen((v) => !v)
      : () => setExtrasOpen((v) => !v);
    const close = () => setMobileOpen(false);

    return (
      <div className="border-t border-border px-3 py-3 space-y-1">
        <Link to="/planner" onClick={mobile ? close : undefined} className={NAV_LINK}>
          <ListTodo className="h-4 w-4" /> Study planner
        </Link>
        <Link to="/progress" onClick={mobile ? close : undefined} className={NAV_LINK}>
          <TrendingUp className="h-4 w-4" /> Progress
        </Link>
        <button onClick={toggle} className={`${NAV_LINK} w-full`}>
          <Sparkles className="h-4 w-4" />
          Extra functions
          <ChevronDown
            className={`ml-auto h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <div className="ml-4 space-y-0.5 border-l border-border pl-2">
            <Link to="/flashcards" onClick={mobile ? close : undefined} className={SUB_LINK}>
              <Layers className="h-3.5 w-3.5" /> Flashcards
            </Link>
            <Link to="/tests" onClick={mobile ? close : undefined} className={SUB_LINK}>
              <BookOpen className="h-3.5 w-3.5" /> Test creator
            </Link>
            <Link
              to="/graph"
              onClick={mobile ? close : undefined}
              className={`${SUB_LINK} text-primary font-medium`}
            >
              <LineChart className="h-3.5 w-3.5" /> Graphing
            </Link>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 px-2 pt-1 text-sm">
          <Link
            to="/profile"
            onClick={mobile ? close : undefined}
            className="min-w-0 truncate text-muted-foreground hover:text-foreground transition"
          >
            {displayName}
          </Link>
          <Button variant="ghost" size="icon" onClick={logout} title="Sign out" className="shrink-0">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-80 flex-col p-0">
          <div className="flex items-center gap-2 px-5 py-5 font-display text-lg font-semibold">
            <img src="/logo-removebg-preview.png" className="h-8 w-8 object-contain" alt="ScholarX" />
            ScholarX
          </div>
          <div className="flex-1" />
          <SidebarFooter mobile />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur md:flex">
        <div className="flex items-center gap-2 px-5 py-5 font-display text-lg font-semibold">
          <img src="/logo-removebg-preview.png" className="h-8 w-8 object-contain" alt="ScholarX" />
          ScholarX
        </div>
        <div className="px-3">
          <Link to="/chat">
            <Button className="w-full justify-start gap-2" variant="secondary">
              <MessageSquare className="h-4 w-4" /> Back to chat
            </Button>
          </Link>
        </div>
        <div className="mt-5 px-5 text-xs uppercase tracking-wider text-muted-foreground">
          Tips
        </div>
        <div className="mt-2 space-y-1 px-5 text-xs text-muted-foreground">
          <p>Use <code className="font-mono">y = x^2</code> to graph a function.</p>
          <p>Use <code className="font-mono">x^2 + y^2 = 25</code> for implicit curves.</p>
          <p>Supports trig, log, exponents, and more.</p>
        </div>
        <div className="flex-1" />
        <SidebarFooter />
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-6">
          <button
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-secondary md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <LineChart className="h-5 w-5 shrink-0 text-primary" />
          <h1 className="text-base font-semibold">Graphing Calculator</h1>
        </header>
        <div className="flex-1 min-h-0">
          <DesmosGraph height="100%" keypad />
        </div>
      </main>
    </div>
  );
}
