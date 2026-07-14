import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Radio, Newspaper, Mic2, BarChart3, Headphones, Send, Info, Shield, User as UserIcon, LogOut, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { UserBadge } from "@/components/UserBadge";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/indi-radio-logo.png.asset.json";

const NAV = [
  { to: "/", label: "En direct", icon: Radio },
  { to: "/actus", label: "Actus · Indi Rézo", icon: Newspaper },
  { to: "/emissions", label: "Émissions & Animateurs", icon: Mic2 },
  { to: "/chart", label: "Chart des auditeurs", icon: BarChart3 },
  { to: "/podcasts", label: "Podcasts", icon: Headphones },
  { to: "/dedicaces", label: "Dédicaces", icon: Send },
  { to: "/about", label: "À propos", icon: Info },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, isAdmin, session, openAuth, signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-2.5">
          <button
            onClick={() => setOpen(true)}
            aria-label="Menu"
            className="grid size-9 place-items-center rounded-md border border-border hover:bg-muted"
          >
            <Menu className="size-5" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="Indi Radio" className="size-9 rounded-sm object-contain" />
            <span className="wordmark text-lg leading-none">{"\n"}</span>
          </Link>
          <div className="ml-auto">
            {session && profile ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link
                    to="/admin"
                    aria-label="Panneau admin"
                    className="inline-flex items-center gap-1 rounded-md border border-destructive/60 bg-destructive/10 px-2.5 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/20"
                  >
                    <Shield className="size-3.5" /> Admin
                  </Link>
                )}
                <Link to="/profile" className="flex items-center gap-2">
                  <UserBadge profile={profile} className="text-xs" />
                </Link>
              </div>
            ) : (
              <button onClick={openAuth} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">
                <LogIn className="size-3.5" /> Connexion
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-3 pb-28 pt-4">{children}</main>

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
            <div className="flex items-center gap-2">
              <img src={logoAsset.url} alt="" className="size-7 rounded-sm object-contain" />
              <span className="wordmark text-lg">INDI RADIO</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fermer" className="grid size-8 place-items-center rounded-md hover:bg-muted">
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
                  {item.label}
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
                <Shield className="size-4" /> Panneau admin
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
                  aria-label="Déconnexion"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { openAuth(); setOpen(false); }}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                <LogIn className="size-4" /> Se connecter
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}