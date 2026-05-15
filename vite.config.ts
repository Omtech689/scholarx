// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    build: {
      // Raise the warning threshold — the worker-entry SSR bundle will always
      // be somewhat large; the vendor splits below handle the real offenders.
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // katex ships ~600 kB; only needed in the chat route
            if (id.includes("node_modules/katex")) return "vendor-katex";
            // recharts pulls in a large slice of d3 — only used on progress
            if (
              id.includes("node_modules/recharts") ||
              id.includes("node_modules/d3-") ||
              id.includes("node_modules/d3/") ||
              id.includes("node_modules/victory-vendor")
            )
              return "vendor-charts";
            // Supabase client — shared but large enough to isolate
            if (id.includes("node_modules/@supabase")) return "vendor-supabase";
            // TanStack Query — large shared dependency
            if (id.includes("node_modules/@tanstack/react-query"))
              return "vendor-query";
          },
        },
      },
    },
  },
});
