import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { AppSidebarLinks } from "@/components/app-sidebar-links";
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
    if (!data.session) throw redirect({ to: "/login", search: { mode: "signin" as const } });
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
          <AppSidebarLinks
            currentPage="graph"
            displayName={displayName}
            onLogout={logout}
            onClose={() => setMobileOpen(false)}
          />
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
        <AppSidebarLinks
          currentPage="graph"
          displayName={displayName}
          onLogout={logout}
        />
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
        <div className="relative flex-1 min-h-0">
          <div className="absolute inset-0">
            <DesmosGraph height="100%" keypad />
          </div>
        </div>
      </main>
    </div>
  );
}
