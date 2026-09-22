import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Menu, X, Radio, Newspaper, Mic2, BarChart3, Headphones, Send, Info, Shield, User as UserIcon, UserCog, LogOut, LogIn, Disc3, Film, BookOpen, Star, Mic, Mail, FileText, Trophy, MessageCircle, Heart, Rss, ListMusic, ShoppingBag, ShoppingCart, Feather, Award, Target, Tv, BadgeCheck, Ban } from "lucide-react";
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
import { SafeAreaDebug } from "@/components/debug/SafeAreaDebug";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/lib/toast";
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
type NavItem = { to: string; key: DictKey; icon: any; seo: string };

const NAV_TOP: NavItem[] = [
  { to: "/profile/edit", key: "profile.mySpace", icon: UserCog, seo: "Ma page perso — Espace membre InDi RaDio" },
  { to: "/", key: "nav.live", icon: Radio, seo: "Radio musique indé en direct — Radio sans pub" },
];

// Rubriques éditoriales mises en avant, dans l'ordre prioritaire demandé.
const NAV_EDITORIAL: NavItem[] = [
  { to: "/actus", key: "nav.news", icon: Newspaper, seo: "Blog InDi ArT CulTuRe — Radio musique indépendante & Réseau social musique" },
  { to: "/redak-village", key: "nav.village", icon: Feather, seo: "RéDaK'Village — Les articles de la communauté InDi RaDio" },
  { to: "/indi-teevi", key: "nav.teevi", icon: Tv, seo: "InDi TeeVi — Chaîne vidéo gratuite de la musique indépendante" },
  { to: "/magazines", key: "nav.magazines", icon: BookOpen, seo: "Magazine interactif — Réseau social musique indépendante" },
];

const NAV: NavItem[] = [
  ...NAV_TOP,
  ...NAV_EDITORIAL,
  { to: "/emissions", key: "nav.shows", icon: Mic2, seo: "Émissions de la Radio sans pub InDi RaDio" },
  { to: "/podcasts", key: "nav.podcasts", icon: Headphones, seo: "Podcasts Radio musique indépendante sans pub" },
  { to: "/coups-de-coeur", key: "nav.favorites", icon: Heart, seo: "Coups de cœur Radio musique indépendante" },
  { to: "/chroniques", key: "nav.reviews", icon: Disc3, seo: "Chroniques Radio musique indé — Albums indépendants" },
  { to: "/clips", key: "nav.clips", icon: Film, seo: "Clips Radio musique indé — Vidéos indépendantes" },
  { to: "/artistes", key: "nav.gallery", icon: Mic, seo: "Galerie Artistes certifiés — Radio musique indé" },
  { to: "/boutique", key: "nav.shop", icon: ShoppingBag, seo: "Boutique Artistes InDi — Vinyles, CD, merch et billets des artistes indépendants" },
  { to: "/playlists", key: "nav.playlists", icon: ListMusic, seo: "Playlists InDi RaDio — Spotify & Apple Music, musique indépendante" },
  { to: "/chart", key: "nav.chart", icon: BarChart3, seo: "Top 25 titres — Radio musique indé" },
  { to: "/top-users", key: "nav.topUsers", icon: Trophy, seo: "Réseau social musique — Top membres" },
  { to: "/top", key: "nav.top", icon: Star, seo: "Top podcasts & chroniques — Radio musique indépendante" },
  { to: "/dedicaces", key: "nav.dedications", icon: Send, seo: "Dédicaces sur la Radio sans pub InDi RaDio" },
  { to: "/soumission-artistes", key: "nav.submissions", icon: Mic, seo: "Soumission artistes — Radio gratuite musique indépendante" },
  { to: "/about", key: "nav.about", icon: Info, seo: "À propos — Radio musique indé sans pub, Réseau social musique" },
  { to: "/contact", key: "nav.contact", icon: Mail, seo: "Contacter InDi RaDio — Radio musique indépendante" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, isAdmin, session, openAuth, signOut } = useAuth();
  const t = useT();
  const tourDemo = useTourDemoActive();
  const showDemoUser = tourDemo && !session;

  // Publish the real height of the fixed bottom bar (MiniPlayer + footer +
  // safe-area) as a CSS variable so any floating UI can align above it.
  const bottomBarRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = bottomBarRef.current;
    if (!el) return;
    const apply = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      const next = `${h}px`;
      const root = document.documentElement;
      // N'écrire la variable que si la hauteur a réellement changé : sinon
      // l'écriture modifie la mise en page, l'observateur redéclenche une
      // mesure, et la boucle ne se stabilise jamais.
      if (root.style.getPropertyValue("--app-bottom-bar-h") !== next) {
        root.style.setProperty("--app-bottom-bar-h", next);
      }
    };
    apply();
    // Mesurer au frame suivant : écrire de la mise en page pendant la
    // notification de l'observateur est ce qui provoque l'avertissement
    // « ResizeObserver loop completed with undelivered notifications ».
    let queued = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(queued);
      queued = requestAnimationFrame(apply);
    });
    ro.observe(el);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      cancelAnimationFrame(queued);
      ro.disconnect();
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);

  const requestLogout = () => {
    setOpen(false); // close mobile menu if open
    setConfirmLogout(true);
  };

  const performLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      // Close any transient UI that could survive the auth change.
      setOpen(false);
      try { window.dispatchEvent(new Event("indi:close-admin-chat")); } catch {}
      setConfirmLogout(false);
      toast.success(t("logout.success"));
      // Redirect to the public home screen.
      await navigate({ to: "/" });
    } catch (e) {
      console.error("[logout]", e);
      toast.error(t("logout.error"));
    } finally {
      setSigningOut(false);
    }
  };

  // Radio Mode : écran verrouillé plein écran, sans chrome applicatif.
  if (pathname === "/radio-mode") {
    return <>{children}</>;
  }

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
                    search={{ tab: "users" }}
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
                        onSelect={(e) => { e.preventDefault(); requestLogout(); }}
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
        ref={bottomBarRef}
        data-app-bottom-bar
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
              <a
                href="/rss.xml"
                title="Flux RSS — S'abonner aux nouveautés d'InDi RaDio"
                className="inline-flex items-center gap-1 hover:text-primary"
              >
                <Rss className="size-3" />
                RSS
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 transition-opacity duration-300 ease-out motion-reduce:transition-none",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="absolute inset-0 bg-black/60 transition-opacity duration-300 ease-out motion-reduce:transition-none" onClick={() => setOpen(false)} />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-border bg-sidebar transition-transform duration-300 ease-out motion-reduce:transition-none",
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
            {(() => {
              const renderNavItem = (item: NavItem) => {
                const active = item.to === "/"
                  ? pathname === "/"
                  : pathname === item.to || pathname.startsWith(`${item.to}/`);
                const Icon = item.icon;
                const needsAuth = item.to === "/profile/edit" && !session;
                const shared = cn(
                  "flex items-center gap-3 rounded-md border-l-4 border-transparent px-3 py-2.5 text-sm transition-[background-color,border-color,color,box-shadow] duration-300 ease-out motion-reduce:transition-none",
                  active
                    ? "border-primary bg-primary/15 font-semibold text-foreground shadow-sm"
                    : "hover:bg-muted",
                );
                const label = (
                  <>
                    <Icon className={cn("size-4 shrink-0", active && "text-primary")} />
                    <span className="min-w-0 truncate">{t(item.key)}</span>
                  </>
                );
                if (needsAuth) {
                  // Non connecté : ouvrir la modale de connexion plutôt que
                  // d'arriver sur une route protégée (404/redirect).
                  return (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => { setOpen(false); openAuth(); }}
                      title={item.seo}
                      aria-label={item.seo}
                      className={shared}
                    >
                      {label}
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    title={item.seo}
                    aria-label={item.seo}
                    aria-current={active ? "page" : undefined}
                    className={shared}
                  >
                    {label}
                  </Link>
                );
              };
              return (
                <>
                  {NAV_TOP.map(renderNavItem)}
                  <p className="mt-3 mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {t("nav.editorialGroup")}
                  </p>
                  <div className="rounded-lg border border-primary/25 bg-primary/5 p-1">
                    {NAV_EDITORIAL.map(renderNavItem)}
                  </div>
                  <div className="mt-2">
                    {NAV.slice(NAV_TOP.length + NAV_EDITORIAL.length).map(renderNavItem)}
                  </div>
                </>
              );
            })()}
            {isAdmin && (
              <Link
                to="/admin"
                search={{ tab: "users" }}
                onClick={() => setOpen(false)}
                aria-current={pathname === "/admin" ? "page" : undefined}
                className={cn(
                  "mt-2 flex items-center gap-3 rounded-md border-l-4 border-destructive/40 px-3 py-2.5 text-sm text-destructive transition-colors",
                  pathname === "/admin"
                    ? "border-destructive bg-destructive/15 font-semibold shadow-sm"
                    : "hover:bg-destructive/10",
                )}
              >
                <Shield className="size-4" /> {t("nav.admin")}
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin/messages"
                search={{ tab: "users" }}
                onClick={() => setOpen(false)}
                aria-current={pathname === "/admin/messages" ? "page" : undefined}
                className={cn(
                  "mt-1 flex items-center gap-3 rounded-md border-l-4 border-destructive/40 px-3 py-2.5 text-sm text-destructive transition-colors",
                  pathname === "/admin/messages"
                    ? "border-destructive bg-destructive/15 font-semibold shadow-sm"
                    : "hover:bg-destructive/10",
                )}
              >
                <MessageCircle className="size-4" /> Messages auditeurs
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin/candidatures"
                search={{ tab: "users" }}
                onClick={() => setOpen(false)}
                aria-current={pathname === "/admin/candidatures" ? "page" : undefined}
                className={cn(
                  "mt-1 flex items-center gap-3 rounded-md border-l-4 border-destructive/40 px-3 py-2.5 text-sm text-destructive transition-colors",
                  pathname === "/admin/candidatures"
                    ? "border-destructive bg-destructive/15 font-semibold shadow-sm"
                    : "hover:bg-destructive/10",
                )}
              >
                <Shield className="size-4" /> Candidatures
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin/artistes"
                search={{ tab: "users" }}
                onClick={() => setOpen(false)}
                aria-current={pathname === "/admin/artistes" ? "page" : undefined}
                className={cn(
                  "mt-1 flex items-center gap-3 rounded-md border-l-4 border-destructive/40 px-3 py-2.5 text-sm text-destructive transition-colors",
                  pathname === "/admin/artistes"
                    ? "border-destructive bg-destructive/15 font-semibold shadow-sm"
                    : "hover:bg-destructive/10",
                )}
              >
                <BadgeCheck className="size-4" /> {t("nav.artistsAdmin")}
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin/blocages"
                search={{ tab: "users" }}
                onClick={() => setOpen(false)}
                aria-current={pathname === "/admin/blocages" ? "page" : undefined}
                className={cn(
                  "mt-1 flex items-center gap-3 rounded-md border-l-4 border-destructive/40 px-3 py-2.5 text-sm text-destructive transition-colors",
                  pathname === "/admin/blocages"
                    ? "border-destructive bg-destructive/15 font-semibold shadow-sm"
                    : "hover:bg-destructive/10",
                )}
              >
                <Ban className="size-4" /> Blocages
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin/signalements"
                search={{ tab: "users" }}
                onClick={() => setOpen(false)}
                aria-current={pathname === "/admin/signalements" ? "page" : undefined}
                className={cn(
                  "mt-1 flex items-center gap-3 rounded-md border-l-4 border-destructive/40 px-3 py-2.5 text-sm text-destructive transition-colors",
                  pathname === "/admin/signalements"
                    ? "border-destructive bg-destructive/15 font-semibold shadow-sm"
                    : "hover:bg-destructive/10",
                )}
              >
                <Flag className="size-4" /> Signalements
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin/boutique"
                search={{ tab: "users" }}
                onClick={() => setOpen(false)}
                aria-current={pathname === "/admin/boutique" ? "page" : undefined}
                className={cn(
                  "mt-1 flex items-center gap-3 rounded-md border-l-4 border-destructive/40 px-3 py-2.5 text-sm text-destructive transition-colors",
                  pathname === "/admin/boutique"
                    ? "border-destructive bg-destructive/15 font-semibold shadow-sm"
                    : "hover:bg-destructive/10",
                )}
              >
                <ShoppingBag className="size-4" /> Objets boutique
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin/redak-village"
                search={{ tab: "users" }}
                onClick={() => setOpen(false)}
                aria-current={pathname === "/admin/redak-village" ? "page" : undefined}
                className={cn(
                  "mt-1 flex items-center gap-3 rounded-md border-l-4 border-destructive/40 px-3 py-2.5 text-sm text-destructive transition-colors",
                  pathname === "/admin/redak-village"
                    ? "border-destructive bg-destructive/15 font-semibold shadow-sm"
                    : "hover:bg-destructive/10",
                )}
              >
                <Feather className="size-4" /> {t("nav.villageAdmin")}
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin/coups-de-coeur"
                search={{ tab: "users" }}
                onClick={() => setOpen(false)}
                aria-current={pathname === "/admin/coups-de-coeur" ? "page" : undefined}
                className={cn(
                  "mt-1 flex items-center gap-3 rounded-md border-l-4 border-destructive/40 px-3 py-2.5 text-sm text-destructive transition-colors",
                  pathname === "/admin/coups-de-coeur"
                    ? "border-destructive bg-destructive/15 font-semibold shadow-sm"
                    : "hover:bg-destructive/10",
                )}
              >
                <Heart className="size-4" /> {t("nav.coupsAdmin")}
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin/teevi"
                search={{ tab: "users" }}
                onClick={() => setOpen(false)}
                aria-current={pathname === "/admin/teevi" ? "page" : undefined}
                className={cn(
                  "mt-1 flex items-center gap-3 rounded-md border-l-4 border-destructive/40 px-3 py-2.5 text-sm text-destructive transition-colors",
                  pathname === "/admin/teevi"
                    ? "border-destructive bg-destructive/15 font-semibold shadow-sm"
                    : "hover:bg-destructive/10",
                )}
              >
                <Tv className="size-4" /> {t("nav.teeviAdmin")}
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin/magazines"
                search={{ tab: "users" }}
                onClick={() => setOpen(false)}
                aria-current={pathname === "/admin/magazines" ? "page" : undefined}
                className={cn(
                  "mt-1 flex items-center gap-3 rounded-md border-l-4 border-destructive/40 px-3 py-2.5 text-sm text-destructive transition-colors",
                  pathname === "/admin/magazines"
                    ? "border-destructive bg-destructive/15 font-semibold shadow-sm"
                    : "hover:bg-destructive/10",
                )}
              >
                <BookOpen className="size-4" /> {t("nav.magazinesAdmin")}
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin/achats"
                search={{ tab: "users" }}
                onClick={() => setOpen(false)}
                aria-current={pathname === "/admin/achats" ? "page" : undefined}
                className={cn(
                  "mt-1 flex items-center gap-3 rounded-md border-l-4 border-destructive/40 px-3 py-2.5 text-sm text-destructive transition-colors",
                  pathname === "/admin/achats"
                    ? "border-destructive bg-destructive/15 font-semibold shadow-sm"
                    : "hover:bg-destructive/10",
                )}
              >
                <ShoppingCart className="size-4" /> {t("nav.purchasesAdmin")}
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin/badges"
                search={{ tab: "users" }}
                onClick={() => setOpen(false)}
                aria-current={pathname === "/admin/badges" ? "page" : undefined}
                className={cn(
                  "mt-1 flex items-center gap-3 rounded-md border-l-4 border-destructive/40 px-3 py-2.5 text-sm text-destructive transition-colors",
                  pathname === "/admin/badges"
                    ? "border-destructive bg-destructive/15 font-semibold shadow-sm"
                    : "hover:bg-destructive/10",
                )}
              >
                <Award className="size-4" /> {t("nav.badgesAdmin")}
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin/challenges"
                search={{ tab: "users" }}
                onClick={() => setOpen(false)}
                aria-current={pathname === "/admin/challenges" ? "page" : undefined}
                className={cn(
                  "mt-1 flex items-center gap-3 rounded-md border-l-4 border-destructive/40 px-3 py-2.5 text-sm text-destructive transition-colors",
                  pathname === "/admin/challenges"
                    ? "border-destructive bg-destructive/15 font-semibold shadow-sm"
                    : "hover:bg-destructive/10",
                )}
              >
                <Target className="size-4" /> {t("nav.challengesAdmin")}
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
                  onClick={requestLogout}
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
      <SafeAreaDebug />
      <AlertDialog open={confirmLogout} onOpenChange={(o) => { if (!signingOut) setConfirmLogout(o); }}>
        <AlertDialogContent className="border-2 border-black shadow-[4px_4px_0_0_#000]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("logout.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("logout.confirmMessage")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>{t("logout.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void performLogout(); }}
              disabled={signingOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {signingOut ? "…" : t("logout.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
}