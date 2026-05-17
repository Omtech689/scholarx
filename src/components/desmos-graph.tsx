import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    __desmosLoading?: boolean;
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

    let attempts = 0;
    const MAX_ATTEMPTS = 150; // 15 s at 100 ms intervals

    function tryInit() {
      if (!active) return;

      if (window.Desmos && containerRef.current) {
        // Wrap in try/catch — Desmos throws if the container has no dimensions yet.
        try {
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
          requestAnimationFrame(() => {
            if (!active) return;
            calcRef.current?.resize();
            setReady(true);
          });
        } catch {
          setLoadError(true);
        }
        return;
      }

      attempts++;
      if (attempts >= MAX_ATTEMPTS) {
        setLoadError(true);
        return;
      }

      setTimeout(tryInit, 100);
    }

    // Defer first attempt to the next paint so the container is laid out
    // before Desmos measures its dimensions.
    const rafId = requestAnimationFrame(tryInit);

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      calcRef.current?.destroy();
      calcRef.current = null;
    };
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
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
