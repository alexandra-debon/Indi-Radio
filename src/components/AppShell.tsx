import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Radio, Newspaper, Mic2, BarChart3, Headphones, Send, Info, Shield, User as UserIcon, LogOut, LogIn, Disc3, Film, BookOpen, Star, Mic, Mail, FileText, Trophy, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { UserBadge } from "@/components/UserBadge";
import { NotificationsBell } from "@/components/NotificationsBell";
import { ShareButton } from "@/components/share/ShareButton";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { MiniPlayer } from "@/components/radio/MiniPlayer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/indi-radio-logo.png.asset.json";
import wordmarkAsset from "@/assets/indi-radio-wordmark-v2.png.asset.json";
import { useT } from "@/lib/i18n";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import type { DictKey } from "@/lib/i18n/dict";

const NAV: { to: string; key: DictKey; icon: any }[] = [
  { to: "/", key: "nav.live", icon: Radio },
  { to: "/actus", key: "nav.news", icon: Newspaper },
  { to: "/emissions", key: "nav.shows", icon: Mic2 },
  { to: "/chart", key: "nav.chart", icon: BarChart3 },
  { to: "/top", key: "nav.top", icon: Star },
  { to: "/top-users", key: "nav.topUsers", icon: Trophy },
  { to: "/podcasts", key: "nav.podcasts", icon: Headphones },
  { to: "/chroniques", key: "nav.reviews", icon: Disc3 },
  { to: "/clips", key: "nav.clips", icon: Film },
  { to: "/magazines", key: "nav.magazines", icon: BookOpen },
  { to: "/dedicaces", key: "nav.dedications", icon: Send },
  { to: "/soumission-artistes", key: "nav.submissions", icon: Mic },
  { to: "/contact", key: "nav.contact", icon: Mail },
  { to: "/about", key: "nav.about", icon: Info },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, isAdmin, session, openAuth, signOut } = useAuth();
  const t = useT();

  return (
    <TooltipProvider delayDuration={200}>
    <div className="flex min-h-screen flex-col">
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 sm:gap-3">
          <button
            onClick={() => setOpen(true)}
            aria-label={t("action.menu")}
            className="grid size-9 shrink-0 place-items-center rounded-md border border-border hover:bg-muted"
          >
            <Menu className="size-5" />
          </button>
          <Link to="/" className="flex min-w-0 items-center gap-2 overflow-hidden">
            <img src={logoAsset.url} alt="Indi Radio" className="size-9 sm:size-10 md:size-11 lg:size-12 shrink-0 rounded-sm object-contain" />
            <img src={wordmarkAsset.url} alt="Indi Radio" className="h-9 sm:h-10 md:h-11 lg:h-12 w-auto max-w-[160px] sm:max-w-[200px] md:max-w-[240px] lg:max-w-[280px] min-w-0 shrink object-contain" />
          </Link>
          <div className="flex items-center justify-end gap-1">
            <LanguageToggle className="mr-1" />
            <NotificationsBell />
            <ShareButton target={{}} label={t("action.share")} className="mr-1" />
            {session && profile ? (
              <div className="flex items-center gap-1">
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
                  <Link
                    to="/profile"
                    aria-label={t("profile.mySpace")}
                    className="flex min-w-0 max-w-[7rem] items-center gap-2 overflow-hidden lg:max-w-[10rem]"
                  >
                    <UserBadge profile={profile} compact className="text-xs" />
                  </Link>
                  {profile?.pseudo && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          to="/u/$pseudo"
                          params={{ pseudo: profile.pseudo }}
                          aria-label={t("profile.viewPublic")}
                          className="group inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-black bg-primary text-black shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                        >
                          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={3} />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={6} className="border-2 border-black font-semibold shadow-[2px_2px_0_0_#000]">
                        {t("profile.viewPublic")}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            ) : (
              <button onClick={openAuth} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">
                <LogIn className="size-3.5" /> {t("action.login")}
              </button>
            )}
          </div>
        </div>
      </header>

      <EmailVerificationBanner />
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
              <Link to="/about" className="hover:text-primary">{t("footer.about")}</Link>
              <Link to="/contact" className="hover:text-primary">{t("footer.contact")}</Link>
              <Link to="/terms" className="hover:text-primary">{t("footer.terms")}</Link>
              <Link to="/privacy" className="inline-flex items-center gap-1 hover:text-primary">
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
              <img src={logoAsset.url} alt="" className="size-9 sm:size-10 md:size-11 shrink-0 rounded-sm object-contain" />
              <img src={wordmarkAsset.url} alt="Indi Radio" className="h-7 sm:h-8 md:h-9 w-auto shrink-0 object-contain" />
            </div>
            <button onClick={() => setOpen(false)} aria-label={t("action.close")} className="grid size-8 place-items-center rounded-md hover:bg-muted">
              <X className="size-4" />
            </button>
          </div>
          <nav className="flex-1 overflow-auto p-2">
            {NAV.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
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
    </div>
    </TooltipProvider>
  );
}