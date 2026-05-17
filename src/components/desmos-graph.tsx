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

const DESMOS_SRC =
  "https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";

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
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    setUseFallback(false);

    let attempts = 0;
    const MAX_ATTEMPTS = 50; // 5 s

    function schedule() {
      attempts++;
      if (attempts >= MAX_ATTEMPTS) {
        if (active) setUseFallback(true);
        return;
      }
      setTimeout(tryInit, 100);
    }

    function tryInit() {
      if (!active) return;
      if (!window.Desmos) { schedule(); return; }

      const container = containerRef.current;
      if (!container) { schedule(); return; }

      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        schedule();
        return;
      }

      try {
        calcRef.current = window.Desmos.GraphingCalculator(container, {
          keypad,
          settingsMenu: false,
          border: false,
          lockViewport: false,
          expressions: true,
        });
        if (expression) {
          calcRef.current.setExpression({ id: "e1", latex: expression });
        }
        requestAnimationFrame(() => {
          if (!active) return;
          calcRef.current?.resize();
          setReady(true);
        });
      } catch {
        schedule();
      }
    }

    const rafId = requestAnimationFrame(tryInit);

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      calcRef.current?.destroy();
      calcRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keypad]);

  useEffect(() => {
    if (calcRef.current && expression !== undefined) {
      calcRef.current.setExpression({ id: "e1", latex: expression });
    }
  }, [expression]);

  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: typeof height === "number" ? `${height}px` : height,
  };

  // If the JS API couldn't load after 15 s, fall back to the iframe embed.
  // frame-src already allows https://*.desmos.com so this always works.
  if (useFallback) {
    return (
      <iframe
        src="https://www.desmos.com/calculator"
        title="Graphing Calculator"
        style={{ ...containerStyle, border: "none", display: "block" }}
        allow="fullscreen"
      />
    );
  }

  return (
    <>
      {/* React 19 hoists this to <head> and deduplicates it automatically. */}
      <script async src={DESMOS_SRC} />
      <div style={{ position: "relative", ...containerStyle }}>
        {!ready && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
            <span className="animate-pulse text-sm text-muted-foreground">
              Loading calculator…
            </span>
          </div>
        )}
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </>
  );
}
