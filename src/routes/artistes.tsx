import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Search, MessageCircle } from "lucide-react";
import { SocialLinksBar, type SocialLinks } from "@/components/social/SocialLinksBar";
import { useT } from "@/lib/i18n";
import { TranslatedText } from "@/components/i18n/TranslatedText";

export const Route = createFileRoute("/artistes")({
  head: () => ({
    meta: [
      { title: "Galerie Artistes — InDi RaDio" },
      { name: "description", content: "Annuaire des artistes indépendants certifiés diffusés sur InDi RaDio. Découvre leurs profils, écoute leurs projets et échange avec eux." },
      { property: "og:title", content: "Galerie Artistes — InDi RaDio" },
      { property: "og:description", content: "Annuaire des artistes indépendants certifiés diffusés sur InDi RaDio." },
      { property: "og:url", content: "https://radio.indi-art-culture.com/artistes" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://radio.indi-art-culture.com/artistes" }],
  }),
  component: ArtistesPage,
  errorComponent: ({ error }) => <div className="p-4 text-sm text-destructive" role="alert">{error.message}</div>,
  notFoundComponent: () => <div className="p-4">Introuvable.</div>,
});

type ArtistRow = {
  id: string;
  pseudo: string;
  avatar_url: string | null;
  stage_name: string | null;
  gallery_cover_url: string | null;
  gallery_summary: string | null;
  social_links: SocialLinks | null;
};

async function fetchArtists(): Promise<ArtistRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, pseudo, avatar_url, stage_name, gallery_cover_url, gallery_summary, social_links")
    .eq("role", "artiste")
    .eq("is_certified", true)
    .eq("gallery_visible", true)
    .is("quarantined_at", null);
  if (error) throw error;
  const list = (data ?? []) as unknown as ArtistRow[];
  return list.sort((a, b) =>
    (a.stage_name || a.pseudo).localeCompare(b.stage_name || b.pseudo, undefined, { sensitivity: "base" }),
  );
}

function ArtistesPage() {
  const t = useT();
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({ queryKey: ["artistes-gallery"], queryFn: fetchArtists });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return data;
    return data.filter(
      (a) =>
        (a.stage_name ?? "").toLowerCase().includes(needle) ||
        a.pseudo.toLowerCase().includes(needle),
    );
  }, [data, q]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">{t("gallery.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("gallery.subtitle")}</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("gallery.search")}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="p-4 text-sm text-muted-foreground">{t("common.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="card-brut p-4 text-center text-sm text-muted-foreground">{t("gallery.empty")}</div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const cover = a.gallery_cover_url || a.avatar_url;
            const name = a.stage_name || a.pseudo;
            return (
              <li key={a.id} className="card-brut flex flex-col gap-3 p-3">
                <Link to="/u/$pseudo" params={{ pseudo: a.pseudo }} className="flex items-start gap-3">
                  {cover ? (
                    <img
                      src={cover}
                      alt={`Visuel de ${name}`}
                      loading="lazy"
                      className="size-20 shrink-0 rounded-md border-2 border-primary object-cover shadow-[2px_2px_0_0_hsl(var(--border))]"
                    />
                  ) : (
                    <div className="grid size-20 shrink-0 place-items-center rounded-md border-2 border-border bg-muted text-sm font-black uppercase text-muted-foreground">
                      {name.slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-base font-black">{name}</span>
                      <BadgeCheck className="size-4 shrink-0 text-primary" aria-label={t("gallery.certified")} />
                    </div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">@{a.pseudo}</div>
                    {a.gallery_summary && (
                      <TranslatedText
                        as="p"
                        entityType="artist_gallery"
                        entityKey={a.id}
                        field="gallery_summary"
                        text={a.gallery_summary}
                        className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-foreground/80"
                      />
                    )}
                  </div>
                </Link>
                {a.social_links && Object.keys(a.social_links).some((k) => k !== "__order" && k !== "__labels") && (
                  <div className="border-t border-dashed border-border/60 pt-2">
                    <SocialLinksBar links={a.social_links} />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link to="/u/$pseudo" params={{ pseudo: a.pseudo }}>{t("gallery.viewProfile")}</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1 gap-1.5">
                    <a href={`/?mention=${encodeURIComponent(a.pseudo)}`}>
                      <MessageCircle className="size-4" /> {t("gallery.writeTo")}
                    </a>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}