import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import logoAsset from "@/assets/indi-radio-logo.png.asset.json";
import { appleTouchStartupImages } from "@/lib/apple-touch-startup-images";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/use-auth";
import { RadioPlayerProvider } from "@/components/radio/RadioPlayerProvider";
import { MiniPlayer } from "@/components/radio/MiniPlayer";
import { AppShell } from "@/components/AppShell";
import { AuthDialog } from "@/components/AuthDialog";
import { Toaster } from "@/components/ui/sonner";
import { IosInstallHint } from "@/components/IosInstallHint";
import { LanguageProvider } from "@/lib/i18n";
import { SeoLocalizer } from "@/components/i18n/SeoLocalizer";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { redirect } from "@tanstack/react-router";
import { resolveLegacyRedirect } from "@/lib/legacy-redirects";

function NotFoundComponent() {
  const attempted =
    typeof window !== "undefined" ? window.location.pathname : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Historical alias — hard-refresh at root.
    if (window.location.pathname === "/index") {
      window.history.replaceState(null, "", "/");
      window.location.reload();
      return;
    }
    // SEO: mark this rendered 404 as noindex + set a descriptive title so
    // legacy links that reach us don't get indexed as duplicates of "/".
    document.title = "Page introuvable (404) — InDi RaDio";
    const prev = document.querySelector<HTMLMetaElement>(
      'meta[name="robots"]',
    );
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, follow";
    meta.setAttribute("data-notfound", "1");
    document.head.appendChild(meta);
    return () => {
      meta.remove();
      if (prev) document.head.appendChild(prev.cloneNode(true));
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page introuvable · Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Le lien que vous avez suivi est cassé ou la page a été déplacée.
          Voici des raccourcis utiles pour continuer votre visite sur la
          radio 100% musique indé.
        </p>
        {attempted ? (
          <p className="mt-1 text-xs text-muted-foreground/70 break-all">
            URL demandée : <code>{attempted}</code>
          </p>
        ) : null}
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retour à l'accueil
          </Link>
        </div>
        <nav
          aria-label="Liens utiles"
          className="mt-8 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3"
        >
          <Link to="/actus" className="rounded-md border border-input px-3 py-2 hover:bg-accent">Indi Rézo</Link>
          <Link to="/podcasts" className="rounded-md border border-input px-3 py-2 hover:bg-accent">Podcasts</Link>
          <Link to="/emissions" className="rounded-md border border-input px-3 py-2 hover:bg-accent">Émissions</Link>
          <Link to="/chroniques" className="rounded-md border border-input px-3 py-2 hover:bg-accent">Chroniques</Link>
          <Link to="/chart" className="rounded-md border border-input px-3 py-2 hover:bg-accent">Top 25</Link>
          <Link to="/coups-de-coeur" className="rounded-md border border-input px-3 py-2 hover:bg-accent">Coups de Cœur</Link>
        </nav>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: ({ location }) => {
    const target = resolveLegacyRedirect(location.pathname);
    if (target && target !== location.pathname) {
      throw redirect({
        href: target + (location.searchStr || ""),
        statusCode: 301,
      });
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Radio gratuite 24/7 musique indépendante — InDi RaDio" },
      { name: "description", content: "Radio gratuite 24/7 sans pub, sans info. Écoute la radio musique indé et le réseau social musique de la scène indépendante sur InDi RaDio." },
      { name: "keywords", content: "radio gratuite, radio musique indé, radio musique indépendante, radio gratuite musique indépendante, radio sans pub, réseau social musique, radio indépendante, InDi RaDio" },
      { name: "author", content: "InDi ArT CulTuRe" },
      { name: "theme-color", content: "#0a0a0a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "InDi RaDio" },
      { property: "og:title", content: "Radio gratuite 24/7 musique indépendante — InDi RaDio" },
      { property: "og:description", content: "Radio gratuite 24/7 sans pub, sans info. Écoute la radio musique indé et le réseau social musique de la scène indépendante sur InDi RaDio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "google-site-verification", content: "c0A7GBSm4kA-HXUpLR9BPCC3qCdW7GZ-otAj-YtFVN8" },
      { property: "og:site_name", content: "InDi RaDio" },
      { name: "twitter:title", content: "Radio gratuite 24/7 musique indépendante — InDi RaDio" },
      { name: "twitter:description", content: "Radio gratuite 24/7 sans pub, sans info. Écoute la radio musique indé et le réseau social musique de la scène indépendante sur InDi RaDio." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f0e5e996-5ddd-44f1-9f1c-200000559685/id-preview-41820746--d580aa7f-5dc8-42f8-b519-9acbc3ba6330.lovable.app-1784573012609.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f0e5e996-5ddd-44f1-9f1c-200000559685/id-preview-41820746--d580aa7f-5dc8-42f8-b519-9acbc3ba6330.lovable.app-1784573012609.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      ...appleTouchStartupImages,
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bungee&family=Bungee+Shade&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://radio.indi-art-culture.com/#org",
              name: "InDi ArT CulTuRe",
              url: "https://radio.indi-art-culture.com/",
              logo: "https://radio.indi-art-culture.com/icons/apple-touch-icon.png",
              sameAs: [],
            },
            {
              "@type": "WebSite",
              "@id": "https://radio.indi-art-culture.com/#website",
              url: "https://radio.indi-art-culture.com/",
              name: "InDi RaDio",
              publisher: { "@id": "https://radio.indi-art-culture.com/#org" },
              inLanguage: "fr-FR",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
        <RadioPlayerProvider>
          <AppShell>
            <Outlet />
          </AppShell>
          <AuthDialog />
          <IosInstallHint />
          <Toaster />
          <SeoLocalizer />
          <OnboardingTour />
        </RadioPlayerProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
