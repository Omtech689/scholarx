import { useEffect, useRef, useState } from "react";

export function DesmosGraph({
  expression,
  height = 400,
  keypad = true,
}: {
  expression?: string;
  height?: number | string;
  keypad?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  const src = `/desmos-frame.html?keypad=${keypad ? "1" : "0"}`;

  // postMessage from the frame: expression updates + precise ready signal.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "desmos-ready") setReady(true);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Push expression changes into the running calculator.
  useEffect(() => {
    if (!ready || expression === undefined) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: "desmos-set-expr", latex: expression },
      "*",
    );
  }, [ready, expression]);

  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: typeof height === "number" ? `${height}px` : height,
  };

  return (
    <div style={{ position: "relative", ...containerStyle }}>
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <span className="animate-pulse text-sm text-muted-foreground">
            Loading calculator…
          </span>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={src}
        title="Graphing Calculator"
        onLoad={() => setReady(true)}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
