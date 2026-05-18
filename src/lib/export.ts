// Shared export helpers. Consolidates the markdown / CSV / print-to-PDF logic
// that previously lived (duplicated) in chat.tsx, tests.tsx and flashcards.tsx.
//
// PDF export is intentionally client-side: we deploy to Cloudflare Workers,
// which has no headless browser, so server-side PDF is not an option. Opening
// a styled window and calling print() gives the best fidelity with zero deps.

export function safeFileName(name: string): string {
  return (name || "scholarx").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "scholarx";
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadMarkdown(title: string, markdown: string) {
  triggerDownload(new Blob([markdown], { type: "text/markdown" }), `${safeFileName(title)}.md`);
}

export function downloadCsv(title: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${safeFileName(title)}.csv`);
}

export function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Minimal, deterministic Markdown → HTML for printable documents. Input is
// escaped first, so AI/user content can never inject markup into the PDF.
export function markdownToHtml(md: string): string {
  const escaped = escapeHtml(md);
  const blocks = escaped.split(/\n{2,}/);
  const out: string[] = [];

  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;

    if (/^###\s+/.test(block)) { out.push(`<h3>${inline(block.replace(/^###\s+/, ""))}</h3>`); continue; }
    if (/^##\s+/.test(block)) { out.push(`<h2>${inline(block.replace(/^##\s+/, ""))}</h2>`); continue; }
    if (/^#\s+/.test(block)) { out.push(`<h1>${inline(block.replace(/^#\s+/, ""))}</h1>`); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(block)) { out.push("<hr/>"); continue; }

    if (/^\s*([-*])\s+/.test(block)) {
      const items = block.split("\n").map((l) => l.replace(/^\s*[-*]\s+/, "").trim()).filter(Boolean);
      out.push(`<ul>${items.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(block)) {
      const items = block.split("\n").map((l) => l.replace(/^\s*\d+\.\s+/, "").trim()).filter(Boolean);
      out.push(`<ol>${items.map((i) => `<li>${inline(i)}</li>`).join("")}</ol>`);
      continue;
    }
    if (/^&gt;\s?/.test(block)) {
      out.push(`<blockquote>${inline(block.replace(/^&gt;\s?/gm, ""))}</blockquote>`);
      continue;
    }
    out.push(`<p>${inline(block).replace(/\n/g, "<br/>")}</p>`);
  }
  return out.join("\n");

  function inline(s: string): string {
    return s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
  }
}

const PRINT_CSS = `
*, *::before, *::after { box-sizing: border-box; }
body { font-family: Georgia, 'Times New Roman', serif; font-size: 14px; line-height: 1.65; color: #111; margin: 0; padding: 0; }
.page { max-width: 760px; margin: 0 auto; padding: 48px 48px 64px; }
h1 { font-size: 24px; margin: 0 0 4px 0; }
h2 { font-size: 18px; margin: 28px 0 10px 0; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
h3 { font-size: 15px; margin: 20px 0 8px 0; }
p { margin: 0 0 12px 0; }
ul, ol { margin: 0 0 14px 0; padding-left: 24px; }
li { margin-bottom: 6px; }
code { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 12px; background: #f3f3f3; padding: 1px 5px; border-radius: 3px; }
blockquote { margin: 0 0 14px 0; padding: 6px 16px; border-left: 3px solid #bbb; color: #444; }
a { color: #1554b8; }
hr { border: none; border-top: 1px solid #ddd; margin: 28px 0; }
.meta { color: #666; font-size: 12px; margin-bottom: 28px; }
.section-title { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #333; margin: 0 0 18px 0; padding-bottom: 6px; border-bottom: 2px solid #111; }
.sources { margin-top: 36px; }
@media print {
  body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .page { padding: 32px 40px 48px; }
}`;

// Opens a print-ready window and triggers the browser print dialog.
// `bodyHtml` is inserted verbatim — callers must pass already-safe HTML
// (use markdownToHtml() / escapeHtml()).
export function printDocument(title: string, bodyHtml: string): boolean {
  const date = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head>
<body>
  <div class="page">
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">Generated by ScholarX &nbsp;·&nbsp; ${date}</div>
    ${bodyHtml}
  </div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=880,height=1100");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
  return true;
}

// Convenience: print a Markdown document straight to PDF.
export function printMarkdownAsPdf(title: string, markdown: string): boolean {
  return printDocument(title, markdownToHtml(markdown));
}
