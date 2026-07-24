import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Radio, Newspaper, Mic2, BarChart3, Headphones, Send, Info, Shield, User as UserIcon, UserCog, LogOut, LogIn, Disc3, Film, BookOpen, Star, Mic, Mail, FileText, Trophy, MessageCircle, Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { UserBadge } from "@/components/UserBadge";
import { NotificationsBell } from "@/components/NotificationsBell";
import { ShareButton } from "@/components/share/ShareButton";
import { GlobalSearchButton } from "@/components/search/GlobalSearch";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { MiniPlayer } from "@/components/radio/MiniPlayer";
import { AdminChatWidget, openAdminChat } from "@/components/chat/AdminChatWidget";
import { AdminChatAdminPanel } from "@/components/chat/AdminChatAdminPanel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RequirePseudoDialog } from "@/components/RequirePseudoDialog";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/indi-radio-logo.png.asset.json";
import wordmarkAsset from "@/assets/indi-radio-wordmark-v2.png.asset.json";
import wordmarkHeaderAsset from "@/assets/indi-radio-wordmark-header.jpeg.asset.json";
import { useT } from "@/lib/i18n";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import type { DictKey } from "@/lib/i18n/dict";
import { useTourDemoActive, DEMO_PSEUDO } from "@/lib/tour-demo";

// `seo` renders as the anchor `title` attribute: crawlers use it as anchor
// context for internal maillage while users get an accessible tooltip.
const NAV: { to: string; key: DictKey; icon: any; seo: string }[] = [
  { to: "/", key: "nav.live", icon: Radio, seo: "Radio musique indé en direct — Radio sans pub" },
  { to: "/actus", key: "nav.news", icon: Newspaper, seo: "Actus de la Radio musique indépendante & du Réseau social musique" },
  { to: "/emissions", key: "nav.shows", icon: Mic2, seo: "Émissions de la Radio sans pub InDi RaDio" },
  { to: "/chart", key: "nav.chart", icon: BarChart3, seo: "Top 25 titres — Radio musique indé" },
  { to: "/top", key: "nav.top", icon: Star, seo: "Top podcasts & chroniques — Radio musique indépendante" },
  { to: "/top-users", key: "nav.topUsers", icon: Trophy, seo: "Réseau social musique — Top membres" },
  { to: "/podcasts", key: "nav.podcasts", icon: Headphones, seo: "Podcasts Radio musique indépendante sans pub" },
  { to: "/chroniques", key: "nav.reviews", icon: Disc3, seo: "Chroniques Radio musique indé — Albums indépendants" },
  { to: "/coups-de-coeur", key: "nav.favorites", icon: Heart, seo: "Coups de cœur Radio musique indépendante" },
  { to: "/clips", key: "nav.clips", icon: Film, seo: "Clips Radio musique indé — Vidéos indépendantes" },
  { to: "/magazines", key: "nav.magazines", icon: BookOpen, seo: "Magazine interactif — Réseau social musique indépendante" },
  { to: "/dedicaces", key: "nav.dedications", icon: Send, seo: "Dédicaces sur la Radio sans pub InDi RaDio" },
  { to: "/soumission-artistes", key: "nav.submissions", icon: Mic, seo: "Soumission artistes — Radio gratuite musique indépendante" },
  { to: "/contact", key: "nav.contact", icon: Mail, seo: "Contacter InDi RaDio — Radio musique indépendante" },
  { to: "/about", key: "nav.about", icon: Info, seo: "À propos — Radio musique indé sans pub, Réseau social musique" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, isAdmin, session, openAuth, signOut } = useAuth();
  const t = useT();
  const tourDemo = useTourDemoActive();
  const showDemoUser = tourDemo && !session;

  return (
    <TooltipProvider delayDuration={200}>
    <div className="flex min-h-screen flex-col">
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 px-2 py-2.5 sm:gap-2 sm:px-3">
          <button
            onClick={() => setOpen(true)}
            aria-label={t("action.menu")}
            data-tour="menu-button"
            className="grid size-9 shrink-0 place-items-center rounded-md border border-border hover:bg-muted"
          >
            <Menu className="size-5" />
          </button>
          <Link
            to="/"
            aria-label="InDi RaDio — Radio musique indé sans pub"
            title="InDi RaDio — Radio musique indé, Radio sans pub & Réseau social musique"
            className="flex min-w-0 items-center justify-center gap-2 overflow-hidden"
          >
            <img
              src={logoAsset.url}
              alt=""
              aria-hidden="true"
              width={72}
              height={72}
              decoding="async"
              fetchPriority="high"
              className="size-8 shrink-0 rounded-sm object-contain sm:size-9"
            />
            <img
              src={wordmarkHeaderAsset.url}
              alt="Indi Radio"
              width={480}
              height={120}
              decoding="async"
              fetchPriority="high"
              className="h-7 w-auto max-w-full shrink object-contain sm:h-9 md:h-10"
            />
          </Link>
          <div className="flex min-w-0 shrink-0 items-center justify-end gap-1">
            <GlobalSearchButton />
            <ShareButton target={{}} />
            <LanguageToggle />
            <div data-tour="notifications-bell">
              <NotificationsBell />
            </div>
            {showDemoUser ? (
              <div className="flex min-w-0 items-center gap-1" aria-label="Tour demo user">
                <div className="hidden sm:flex min-w-0 max-w-[10rem] items-center gap-2 overflow-hidden rounded-md border-2 border-dashed border-primary/70 bg-primary/10 px-2 py-1">
                  <UserIcon className="size-3.5 text-primary" />
                  <span className="truncate text-xs font-bold text-primary">@{DEMO_PSEUDO}</span>
                </div>
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-md border-2 border-dashed border-primary/70 bg-primary/10 sm:hidden"
                  data-tour="login-button"
                  aria-label={`Tour demo ${DEMO_PSEUDO}`}
                >
                  <UserIcon className="size-4 text-primary" />
                </span>
                <span className="hidden lg:inline rounded-full border border-dashed border-primary/70 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                  Demo
                </span>
              </div>
            ) : session && profile ? (
              <div className="flex min-w-0 items-center gap-1">
                {isAdmin && (
                  <Link
                    to="/admin"
                    aria-label={t("nav.admin")}
                    className="hidden lg:inline-flex items-center gap-1 rounded-md border border-destructive/60 bg-destructive/10 px-2.5 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/20"
                  >
                    <Shield className="size-3.5" /> Admin
                  </Link>
                )}
                <div className="flex min-w-0 items-center gap-1">
                  {profile?.pseudo ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          to="/u/$pseudo"
                          params={{ pseudo: profile.pseudo }}
                          aria-label={t("profile.viewPublic")}
                          data-tour="login-button"
                          className="hidden min-w-0 max-w-[6rem] items-center gap-2 overflow-hidden rounded-md px-1.5 py-1 hover:bg-muted sm:flex lg:max-w-[10rem]"
                        >
                          <UserBadge profile={profile} compact className="text-xs" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={6} className="border-2 border-black font-semibold shadow-[2px_2px_0_0_#000]">
                        {t("profile.viewPublic")}
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={t("profile.mySpace")}
                      data-tour="login-button"
                      className="grid size-8 shrink-0 place-items-center rounded-md border border-border hover:bg-muted"
                    >
                      <UserCog className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={6} className="w-56 border-2 border-black shadow-[2px_2px_0_0_#000]">
                      {profile?.pseudo && (
                        <DropdownMenuLabel className="truncate">@{profile.pseudo}</DropdownMenuLabel>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/profile/edit" className="flex items-center gap-2">
                          <UserCog className="size-4" /> {t("profile.mySpace")}
                        </Link>
                      </DropdownMenuItem>
                      {profile?.pseudo && (
                        <DropdownMenuItem asChild>
                          <Link to="/u/$pseudo" params={{ pseudo: profile.pseudo }} className="flex items-center gap-2">
                            <UserIcon className="size-4" /> {t("profile.viewPublic")}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={(e) => { e.preventDefault(); void signOut(); }}
                        className="flex items-center gap-2 text-destructive focus:text-destructive"
                      >
                        <LogOut className="size-4" /> {t("action.logout")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ) : (
              <button
                onClick={openAuth}
                aria-label={t("action.login")}
                data-tour="login-button"
                className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground sm:text-xs"
              >
                {t("action.connect")}
              </button>
            )}
          </div>
        </div>
      </header>

      <EmailVerificationBanner />
      <RequirePseudoDialog />
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 pb-56 pt-4">{children}</main>

      <div
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 will-change-auto"
        style={{ transform: "translateZ(0)", contain: "layout paint" }}
      >
        <MiniPlayer />
        <footer className="border-t border-black/60 bg-black py-2 text-neutral-300">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-1 px-3 text-center text-[11px] sm:flex-row sm:justify-between sm:text-left">
            <span>© {new Date().getFullYear()} Indi Radio</span>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
              <Link to="/about" title="À propos — Radio musique indé sans pub" className="hover:text-primary">{t("footer.about")}</Link>
              <Link to="/contact" title="Contact — Radio musique indépendante InDi RaDio" className="hover:text-primary">{t("footer.contact")}</Link>
              <Link to="/terms" title="CGU — Réseau social musique InDi RaDio" className="hover:text-primary">{t("footer.terms")}</Link>
              <Link to="/privacy" title="Confidentialité — Radio gratuite sans pub" className="inline-flex items-center gap-1 hover:text-primary">
                <FileText className="size-3" />
                {t("footer.privacy")}
              </Link>
            </div>
          </div>
        </footer>
      </div>

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-border bg-sidebar transition-transform",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <img src={logoAsset.url} alt="" width={88} height={88} decoding="async" loading="lazy" className="size-9 sm:size-10 md:size-11 shrink-0 rounded-sm object-contain" />
              <img src={wordmarkAsset.url} alt="Indi Radio" width={480} height={120} decoding="async" loading="lazy" className="h-7 sm:h-8 md:h-9 w-auto shrink-0 object-contain" />
            </div>
            <button onClick={() => setOpen(false)} aria-label={t("action.close")} className="grid size-8 place-items-center rounded-md hover:bg-muted">
              <X className="size-4" />
            </button>
          </div>
          <nav className="flex-1 overflow-auto p-2">
            <div data-tour="language-toggle" className="mb-2 flex justify-end px-1">
              <LanguageToggle />
            </div>
            {NAV.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  title={item.seo}
                  aria-label={item.seo}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm",
                    active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" />
                  {t(item.key)}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className={cn(
                  "mt-2 flex items-center gap-3 rounded-md border border-destructive/40 px-3 py-2.5 text-sm text-destructive",
                  pathname === "/admin" && "bg-destructive text-destructive-foreground",
                )}
              >
                <Shield className="size-4" /> {t("nav.admin")}
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin/messages"
                onClick={() => setOpen(false)}
                className={cn(
                  "mt-1 flex items-center gap-3 rounded-md border border-destructive/40 px-3 py-2.5 text-sm text-destructive",
                  pathname === "/admin/messages" && "bg-destructive text-destructive-foreground",
                )}
              >
                <MessageCircle className="size-4" /> Messages auditeurs
              </Link>
            )}
            {session && !isAdmin && (
              <button
                onClick={() => { setOpen(false); openAdminChat(); }}
                className="mt-2 flex w-full items-center gap-3 rounded-md border border-border px-3 py-2.5 text-sm hover:bg-muted"
              >
                <MessageCircle className="size-4" /> {t("chat.menuItem")}
              </button>
            )}
          </nav>
          <div className="border-t border-border p-3">
            {session ? (
              <div className="flex items-center gap-2">
                <Link to="/profile" onClick={() => setOpen(false)} className="flex flex-1 items-center gap-2 rounded-md px-2 py-2 hover:bg-muted">
                  <UserIcon className="size-4" />
                  <UserBadge profile={profile} className="text-xs" />
                </Link>
                <button
                  onClick={async () => { await signOut(); setOpen(false); }}
                  className="grid size-9 place-items-center rounded-md border border-border hover:bg-muted"
                  aria-label={t("action.logout")}
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { openAuth(); setOpen(false); }}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                <LogIn className="size-4" /> {t("action.signin")}
              </button>
            )}
          </div>
        </aside>
      </div>
      <AdminChatWidget />
      <AdminChatAdminPanel />
    </div>
    </TooltipProvider>
  );
}