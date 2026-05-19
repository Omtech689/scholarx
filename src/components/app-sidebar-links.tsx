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
const ACTIVE = "text-primary font-medium hover:bg-accent hover:text-accent-foreground";
const MUTED = "text-muted-foreground hover:bg-accent hover:text-accent-foreground";

const EXTRAS: AppPage[] = ["flashcards", "tests", "study", "research", "graph"];

export function AppSidebarLinks({
  currentPage,
  displayName,
  onLogout,
  onClose,
}: AppSidebarLinksProps) {
  const [extrasOpen, setExtrasOpen] = useState(EXTRAS.includes(currentPage));

  const navCls = (page: AppPage) => `${BASE} ${currentPage === page ? ACTIVE : MUTED}`;
  const subCls = (page: AppPage) => `${BASE_SUB} ${currentPage === page ? ACTIVE : MUTED}`;

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
          <Link to="/flashcards" onClick={onClose} className={subCls("flashcards")}>
            <Layers className="h-3.5 w-3.5" /> Flashcards
          </Link>
          <Link to="/tests" onClick={onClose} className={subCls("tests")}>
            <BookOpen className="h-3.5 w-3.5" /> Test creator
          </Link>
          <Link to="/study" onClick={onClose} className={subCls("study")}>
            <GraduationCap className="h-3.5 w-3.5" /> Study guides
          </Link>
          <Link to="/research" onClick={onClose} className={subCls("research")}>
            <Microscope className="h-3.5 w-3.5" /> Research mode
          </Link>
          <Link to="/graph" onClick={onClose} className={subCls("graph")}>
            <LineChart className="h-3.5 w-3.5" /> Graphing
          </Link>
        </div>
      )}

      <Link
        to="/support"
        onClick={onClose}
        className={`${BASE} ${MUTED}`}
      >
        <LifeBuoy className="h-4 w-4" /> Help &amp; Support
      </Link>

      <div className="flex items-center justify-between gap-2 px-2 pt-1 text-sm">
        <Link
          to="/profile"
          onClick={onClose}
          className="min-w-0 truncate text-muted-foreground hover:text-foreground transition"
        >
          {displayName}
        </Link>
        <Button variant="ghost" size="icon" onClick={onLogout} title="Sign out" className="shrink-0">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
