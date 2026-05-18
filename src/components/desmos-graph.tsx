import { useEffect, useMemo, useRef, useState } from "react";

const DESMOS_SRC =
  "https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";

// Approximate hex equivalents of the app's OKLCH theme palette.
const T = {
  bg:        "#1a1b2e", // oklch(0.16 0.02 265)
  panel:     "#1e1f34", // oklch(0.20 0.025 265)
  input:     "#13141f",
  fg:        "#f2f3f8", // oklch(0.97 0.01 250)
  muted:     "#9899b0", // oklch(0.68 0.02 260)
  border:    "#2e2f48", // oklch(0.30 0.03 265)
  primary:   "#41d4e4", // oklch(0.78 0.18 195)
};

function buildSrcdoc(expression: string | undefined, keypad: boolean): string {
  const opts = JSON.stringify({
    keypad,
    settingsMenu: false,
    border: false,
    lockViewport: false,
    expressions: true,
    backgroundColor: T.bg,
  });
  // JSON.stringify handles all escaping; null means "no initial expression"
  const initExpr = expression !== undefined ? JSON.stringify(expression) : "null";

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script src="${DESMOS_SRC}"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:${T.bg};color:${T.fg};font-family:system-ui,sans-serif}
#calc{width:100%;height:100%}
.dcg-calculator-api-container{background:${T.bg}!important}
.dcg-expressions-panel,.dcg-expression-list{background:${T.panel}!important;border-right:1px solid ${T.border}!important}
.dcg-expression-icon-container{border-bottom:1px solid ${T.border}!important;background:${T.panel}!important}
.dcg-mq-editable-field,.dcg-mq-root-block{background:${T.input}!important;color:${T.fg}!important}
.dcg-mq-cursor{border-color:${T.fg}!important}
.dcg-btn-flat,.dcg-action-btn-container{background:${T.panel}!important;color:${T.fg}!important}
.dcg-btn-flat:hover{background:${T.border}!important}
.dcg-keypad-container{background:${T.panel}!important;border-top:1px solid ${T.border}!important}
.dcg-keypad-key,.dcg-keypad-action-key{background:${T.panel}!important;color:${T.fg}!important;border:1px solid ${T.border}!important}
.dcg-keypad-key:active,.dcg-keypad-action-key:active{background:${T.border}!important}
.dcg-header,.dcg-add-expression-container{background:${T.panel}!important;border-bottom:1px solid ${T.border}!important}
.dcg-expression-text,.dcg-label{color:${T.fg}!important}
.dcg-icon-remove,.dcg-icon-error{color:${T.muted}!important}
.dcg-graphpaper-branding{opacity:0.4}
</style>
</head><body>
<div id="calc"></div>
<script>
(function(){
  var calc=null;
  function init(){
    if(!window.Desmos){setTimeout(init,50);return;}
    var el=document.getElementById('calc');
    if(!el){setTimeout(init,50);return;}
    calc=Desmos.GraphingCalculator(el,${opts});
    var expr=${initExpr};
    if(expr!==null) calc.setExpression({id:'e1',latex:expr});
    setTimeout(function(){calc.resize();},50);
    window.parent.postMessage({type:'desmos-ready'},'*');
  }
  // Script is at end of <body> so the DOM is already parsed; call init()
  // directly. The internal polling handles the async Desmos CDN load.
  init();
  window.addEventListener('message',function(ev){
    if(!calc) return;
    if(ev.data&&ev.data.type==='desmos-set-expr')
      calc.setExpression({id:'e1',latex:ev.data.latex});
    if(ev.data&&ev.data.type==='desmos-resize')
      calc.resize();
  });
})();
</script>
</body></html>`;
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  // Rebuild the srcdoc only when keypad changes; expression updates go via postMessage.
  const srcdoc = useMemo(
    () => buildSrcdoc(expression, keypad),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keypad],
  );

  // Listen for the calculator-ready signal from inside the srcdoc.
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
        srcDoc={srcdoc}
        title="Graphing Calculator"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
