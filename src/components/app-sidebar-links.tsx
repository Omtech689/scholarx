import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  ListTodo,
  TrendingUp,
  Layers,
  BookOpen,
  LineChart,
  Sparkles,
  GraduationCap,
  Microscope,
  LogOut,
  ChevronDown,
  LifeBuoy,
} from "lucide-react";

export type AppPage =
  | "chat"
  | "planner"
  | "progress"
  | "flashcards"
  | "tests"
  | "study"
  | "research"
  | "graph";

interface AppSidebarLinksProps {
  currentPage: AppPage;
  displayName: string;
  onLogout: () => void;
  onClose?: () => void;
}

const BASE = "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition";
const BASE_SUB = "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition";
const ACTIVE = "text-primary font-medium bg-primary/10 hover:bg-primary/15 hover:text-primary-foreground";
const MUTED = "text-muted-foreground hover:bg-accent hover:text-accent-foreground";

const EXTRAS: AppPage[] = ["flashcards", "tests", "study", "research", "graph", "progress"];

export function AppSidebarLinks({
  currentPage,
  displayName,
  onLogout,
  onClose,
}: AppSidebarLinksProps) {
  const [extrasOpen, setExtrasOpen] = useState(EXTRAS.includes(currentPage));
  const [supportOpen, setSupportOpen] = useState(false);

  const navCls = (page: AppPage) => `${BASE} ${currentPage === page ? ACTIVE : MUTED}`;
  const subCls = (page: AppPage) => `${BASE_SUB} ${currentPage === page ? ACTIVE : MUTED}`;

  const closeMenu = () => {
    setSupportOpen(false);
    onClose?.();
  };

  return (
    <div className="border-t border-border px-3 py-3 space-y-1">
      <Link to="/chat" onClick={onClose} className={navCls("chat")}>
        <MessageSquare className="h-4 w-4" /> Chat
      </Link>
      <Link to="/planner" onClick={onClose} className={navCls("planner")}>
        <ListTodo className="h-4 w-4" /> Study planner
      </Link>
      <Link to="/progress" onClick={onClose} className={navCls("progress")}>
        <TrendingUp className="h-4 w-4" /> Progress
      </Link>

      <button
        onClick={() => setExtrasOpen((v) => !v)}
        className={`${BASE} w-full ${MUTED}`}
      >
        <Sparkles className="h-4 w-4" />
        Extra functions
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 transition-transform duration-200 ${extrasOpen ? "rotate-180" : ""}`}
        />
      </button>

      {extrasOpen && (
        <div className="ml-4 space-y-0.5 border-l border-border pl-2">
          <Link to="/flashcards" onClick={closeMenu} className={subCls("flashcards")}>
            <Layers className="h-3.5 w-3.5" /> Flashcards
          </Link>
          <Link to="/tests" onClick={closeMenu} className={subCls("tests")}>
            <BookOpen className="h-3.5 w-3.5" /> Test creator
          </Link>
          <Link to="/study" onClick={closeMenu} className={subCls("study")}>
            <GraduationCap className="h-3.5 w-3.5" /> Study guides
          </Link>
          <Link to="/research" onClick={closeMenu} className={subCls("research")}>
            <Microscope className="h-3.5 w-3.5" /> Research mode
          </Link>
          <Link to="/graph" onClick={closeMenu} className={subCls("graph")}>
            <LineChart className="h-3.5 w-3.5" /> Graphing
          </Link>
          <Link to="/progress" onClick={closeMenu} className={subCls("progress")}>
            <TrendingUp className="h-3.5 w-3.5" /> Progress
          </Link>
        </div>
      )}

      <div className="relative mt-3 px-2">
        <button
          type="button"
          onClick={() => setSupportOpen((v) => !v)}
          className="w-full text-left text-sm text-muted-foreground transition hover:text-foreground"
          aria-expanded={supportOpen}
          aria-haspopup="true"
        >
          {displayName}
        </button>
        {supportOpen && (
          <div className="mt-2 rounded-xl border border-border bg-card/95 p-2 shadow-lg">
            <Link
              to="/support"
              onClick={closeMenu}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <LifeBuoy className="h-4 w-4" /> Help &amp; Support
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 px-2 pt-1 text-sm">
        <Button variant="ghost" size="icon" onClick={onLogout} title="Sign out" className="shrink-0">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
