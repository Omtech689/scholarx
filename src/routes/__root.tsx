import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 30,
    },
  },
});

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ScholarX — AI Homework Helper" },
      {
        name: "description",
        content:
          "ScholarX is an AI homework helper that explains Math, Science, English and History concepts to help students learn — not cheat.",
      },
      // Global OG fallbacks (per-route head() overrides these)
      { property: "og:site_name", content: "ScholarX" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://scholarx.space/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "ScholarX — AI Homework Helper" },
      // Twitter card defaults
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@scholarxapp" },
      { name: "twitter:image", content: "https://scholarx.space/og-image.png" },
      // Baseline Content-Security-Policy (also set as HTTP header at the Cloudflare level)
      {
        httpEquiv: "Content-Security-Policy",
        content: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' data: https://fonts.gstatic.com",
          "img-src 'self' data: blob: https:",
          "connect-src 'self' https://nozxlljeuswjxqoffrti.supabase.co wss://nozxlljeuswjxqoffrti.supabase.co https://generativelanguage.googleapis.com",
          "frame-src https://challenges.cloudflare.com",
          "object-src 'none'",
          "base-uri 'self'",
        ].join("; "),
      },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/logo-favicon.png?v=2", sizes: "48x48" },
      { rel: "shortcut icon", href: "/logo-favicon.png?v=2" },
      { rel: "apple-touch-icon", href: "/logo-favicon-ios.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    ],
  }),
  shellComponent: RootShell,
  component: () => <Outlet />,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Load Google Fonts asynchronously — keeps them off the critical render path */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap';document.head.appendChild(l);})()`}} />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
