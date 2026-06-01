import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const distClient = "dist/client";
const manifestDir = "dist/server/assets";

// Find the manifest file
const files = readdirSync(manifestDir);
const manifestFile = files.find((f) => f.startsWith("_tanstack-start-manifest"));

if (!manifestFile) {
  console.error("Could not find TanStack manifest file");
  process.exit(1);
}

const manifestContent = readFileSync(join(manifestDir, manifestFile), "utf-8");

// Extract clientEntry path
const clientEntryMatch = manifestContent.match(/clientEntry:\s*["']([^"']+)["']/);
const clientEntry = clientEntryMatch?.[1];

if (!clientEntry) {
  console.error("Could not find clientEntry in manifest");
  process.exit(1);
}

// Extract root route CSS assets
const rootAssetMatches = [...manifestContent.matchAll(/href:\s*["']([^"']+\.css)["']/g)];
const rootCss = rootAssetMatches.slice(0, 2).map((m) => m[1]);

const cssLinks = rootCss.map((href) => `    <link rel="stylesheet" href="${href}" />`).join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>ScholarX</title>
${cssLinks}
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="${clientEntry}"></script>
  </body>
</html>
`;

writeFileSync(join(distClient, "index.html"), html);
console.log(`Generated index.html with entry: ${clientEntry}`);
