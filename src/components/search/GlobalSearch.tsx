import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Newspaper, Headphones, Mic2, Disc3, BookOpen, Heart, User as UserIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Hit = {
  key: string;
  kind: "news" | "podcast" | "show" | "review" | "magazine" | "favorite" | "profile";
  label: string;
  sub?: string | null;
  cover?: string | null;
  to: string;
  params?: Record<string, string>;
};

const KIND_META: Record<Hit["kind"], { icon: any; labelFr: string; labelEn: string }> = {
  news: { icon: Newspaper, labelFr: "Actus", labelEn: "News" },
  podcast: { icon: Headphones, labelFr: "Podcasts", labelEn: "Podcasts" },
  show: { icon: Mic2, labelFr: "Émissions", labelEn: "Shows" },
  review: { icon: Disc3, labelFr: "Chroniques", labelEn: "Reviews" },
  magazine: { icon: BookOpen, labelFr: "Magazines", labelEn: "Magazines" },
  favorite: { icon: Heart, labelFr: "Coups de cœur", labelEn: "Favorites" },
  profile: { icon: UserIcon, labelFr: "Artistes & utilisateurs", labelEn: "Artists & users" },
};

function useDebounced<T>(value: T, delay = 220) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setD(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return d;
}

function esc(q: string) {
  return q.replace(/[%_\\]/g, (m) => `\\${m}`);
}

async function runSearch(raw: string): Promise<Hit[]> {
  const q = raw.trim();
  if (q.length < 2) return [];
  const like = `%${esc(q)}%`;
  const [news, pods, shows, reviews, mags, favs, users] = await Promise.all([
    supabase.from("news_posts").select("id,title,content,image_url").or(`title.ilike.${like},content.ilike.${like}`).limit(6),
    supabase.from("podcasts").select("id,title,description,cover_url").or(`title.ilike.${like},description.ilike.${like}`).limit(6),
    supabase.from("shows").select("id,title,description,cover_url,host").or(`title.ilike.${like},description.ilike.${like},host.ilike.${like}`).limit(6),
    supabase.from("album_reviews").select("id,slug,title,artist,cover_url").eq("published", true).or(`title.ilike.${like},artist.ilike.${like}`).limit(6),
    supabase.from("magazine_entries").select("id,title,cover_url").ilike("title", like).limit(6),
    supabase.from("coups_de_coeur" as any).select("id,artist,title,cover_url").eq("published", true).or(`artist.ilike.${like},title.ilike.${like}`).limit(6),
    supabase.from("profiles").select("id,pseudo,display_name,avatar_url,bio").or(`pseudo.ilike.${like},display_name.ilike.${like},bio.ilike.${like}`).not("pseudo", "is", null).limit(8),
  ]);

  const hits: Hit[] = [];
  (news.data ?? []).forEach((r: any) =>
    hits.push({ key: `news-${r.id}`, kind: "news", label: r.title ?? "(sans titre)", sub: (r.content ?? "").slice(0, 120), cover: r.image_url, to: "/actus/$postId", params: { postId: r.id } }),
  );
  (pods.data ?? []).forEach((r: any) =>
    hits.push({ key: `pod-${r.id}`, kind: "podcast", label: r.title, sub: r.description, cover: r.cover_url, to: "/podcasts" }),
  );
  (shows.data ?? []).forEach((r: any) =>
    hits.push({ key: `show-${r.id}`, kind: "show", label: r.title, sub: r.host ?? r.description, cover: r.cover_url, to: "/emissions/$showId", params: { showId: r.id } }),
  );
  (reviews.data ?? []).forEach((r: any) =>
    hits.push({ key: `rev-${r.id}`, kind: "review", label: r.title, sub: r.artist, cover: r.cover_url, to: "/chroniques/$slug", params: { slug: r.slug } }),
  );
  (mags.data ?? []).forEach((r: any) =>
    hits.push({ key: `mag-${r.id}`, kind: "magazine", label: r.title, cover: r.cover_url, to: "/magazines/$magazineId", params: { magazineId: r.id } }),
  );
  (favs.data ?? []).forEach((r: any) =>
    hits.push({ key: `fav-${r.id}`, kind: "favorite", label: `${r.title} — ${r.artist}`, cover: r.cover_url, to: "/coups-de-coeur" }),
  );
  (users.data ?? []).forEach((r: any) =>
    hits.push({ key: `user-${r.id}`, kind: "profile", label: r.display_name || `@${r.pseudo}`, sub: r.display_name ? `@${r.pseudo}` : r.bio, cover: r.avatar_url, to: "/u/$pseudo", params: { pseudo: r.pseudo } }),
  );
  return hits;
}

export function GlobalSearchButton() {
  const [open, setOpen] = useState(false);
  const t = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("search.open")}
        title={t("search.open")}
        className="grid size-8 shrink-0 place-items-center rounded-md border border-border hover:bg-muted"
      >
        <Search className="size-4" />
      </button>
      <GlobalSearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function GlobalSearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useT();
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 220);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const { data: hits = [], isFetching } = useQuery({
    queryKey: ["global-search", dq],
    queryFn: () => runSearch(dq),
    enabled: dq.trim().length >= 2,
    staleTime: 30_000,
  });

  const groups = useMemo(() => {
    const g = new Map<Hit["kind"], Hit[]>();
    for (const h of hits) {
      if (!g.has(h.kind)) g.set(h.kind, []);
      g.get(h.kind)!.push(h);
    }
    return [...g.entries()];
  }, [hits]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-0 overflow-hidden">
        <DialogTitle className="sr-only">{t("search.open")}</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder")}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label={t("action.close")}
              className="grid size-6 place-items-center rounded hover:bg-muted"
            >
              <X className="size-3.5" />
            </button>
          )}
          {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {dq.trim().length < 2 ? (
            <p className="p-6 text-center text-xs text-muted-foreground">{t("search.hint")}</p>
          ) : hits.length === 0 && !isFetching ? (
            <p className="p-6 text-center text-xs text-muted-foreground">{t("search.empty")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {groups.map(([kind, items]) => {
                const meta = KIND_META[kind];
                const Icon = meta.icon;
                return (
                  <li key={kind}>
                    <div className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <Icon className="size-3" /> {meta.labelFr} · {meta.labelEn}
                    </div>
                    <ul>
                      {items.map((h) => (
                        <li key={h.key}>
                          <Link
                            to={h.to as any}
                            params={h.params as any}
                            onClick={() => onOpenChange(false)}
                            className={cn("flex items-center gap-3 px-3 py-2 hover:bg-muted")}
                          >
                            <div className="size-10 shrink-0 overflow-hidden rounded bg-muted">
                              {h.cover ? (
                                <img src={h.cover} alt="" className="size-full object-cover" />
                              ) : (
                                <div className="grid size-full place-items-center text-muted-foreground">
                                  <Icon className="size-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{h.label}</div>
                              {h.sub && (
                                <div className="truncate text-xs text-muted-foreground">{h.sub}</div>
                              )}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}