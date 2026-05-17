import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Desmos?: {
      GraphingCalculator: (el: HTMLElement, opts?: Record<string, unknown>) => DesmosCalc;
    };
  }
}

interface DesmosCalc {
  setExpression: (expr: { id: string; latex: string }) => void;
  destroy: () => void;
  resize: () => void;
}

const SCRIPT_URL =
  "https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";

// Module-level singleton so the script is only ever injected once.
let scriptPromise: Promise<void> | null = null;

function loadDesmos(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Desmos) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null; // allow retry
      reject(new Error("Desmos script failed to load"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function DesmosGraph({
  expression,
  height = 400,
  keypad = true,
}: {
  expression?: string;
  height?: number | string;
  keypad?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const calcRef = useRef<DesmosCalc | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    setLoadError(false);

    loadDesmos()
      .then(() => {
        if (!active || !containerRef.current || !window.Desmos) return;
        calcRef.current = window.Desmos.GraphingCalculator(containerRef.current, {
          keypad,
          settingsMenu: false,
          border: false,
          lockViewport: false,
          expressions: true,
        });
        if (expression) {
          calcRef.current.setExpression({ id: "e1", latex: expression });
        }
        // Give the browser a frame to lay out the container before Desmos measures it.
        requestAnimationFrame(() => {
          if (!active) return;
          calcRef.current?.resize();
          setReady(true);
        });
      })
      .catch(() => {
        if (active) setLoadError(true);
      });

    return () => {
      active = false;
      calcRef.current?.destroy();
      calcRef.current = null;
    };
  // Re-initialize only if keypad option changes (not on every expression change).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keypad]);

  // Update expression without re-initializing the calculator.
  useEffect(() => {
    if (calcRef.current && expression !== undefined) {
      calcRef.current.setExpression({ id: "e1", latex: expression });
    }
  }, [expression]);

  const outerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: typeof height === "number" ? `${height}px` : height,
  };

  if (loadError) {
    return (
      <div
        style={outerStyle}
        className="flex items-center justify-center bg-muted/20 text-sm text-muted-foreground"
      >
        Could not load Desmos. Check your connection and try again.
      </div>
    );
  }

  return (
    <div style={outerStyle}>
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <span className="animate-pulse text-sm text-muted-foreground">
            Loading calculator…
          </span>
        </div>
      )}
      {/* Desmos attaches to this inner div; width/height 100% fills the outer container. */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
