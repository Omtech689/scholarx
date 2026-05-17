import { useEffect, useRef } from "react";

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
}

const SCRIPT_URL =
  "https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";

function loadDesmosScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.Desmos) { resolve(); return; }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
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

  useEffect(() => {
    let active = true;
    loadDesmosScript().then(() => {
      if (!active || !containerRef.current || !window.Desmos) return;
      calcRef.current = window.Desmos.GraphingCalculator(containerRef.current, {
        keypad,
        settingsMenu: false,
        border: false,
        lockViewport: false,
      });
      if (expression) {
        calcRef.current.setExpression({ id: "e1", latex: expression });
      }
    });
    return () => {
      active = false;
      calcRef.current?.destroy();
      calcRef.current = null;
    };
  // expression intentionally excluded — updated separately below
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keypad]);

  useEffect(() => {
    if (calcRef.current && expression !== undefined) {
      calcRef.current.setExpression({ id: "e1", latex: expression });
    }
  }, [expression]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: typeof height === "number" ? `${height}px` : height }}
    />
  );
}
