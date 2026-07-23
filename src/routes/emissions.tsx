import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useState } from "react";
import { Mic2 } from "lucide-react";
import { EpisodeRow } from "@/components/EpisodeRow";
import { ShareButton } from "@/components/share/ShareButton";
import ogEmissions from "@/assets/og-emissions.jpg";
import { useT } from "@/lib/i18n";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { breadcrumbLd, HOME_CRUMB, SITE_ORIGIN } from "@/lib/seo-breadcrumb";
import { SmartImg } from "@/components/media/SmartImg";

function ArchiveHeading() {
  const t = useT();
  return <h2 className="text-sm font-bold uppercase tracking-widest text-primary">{t("page.shows.old")}</h2>;
}

const OG_EMISSIONS = `https://radio.indi-art-culture.com${ogEmissions}`;

export const Route = createFileRoute("/emissions")({
  head: () => ({
    meta: [
      { title: "Émissions & Animateurs — Radio gratuite sans pub InDi RaDio" },
      { name: "description", content: "Retrouve toutes les émissions d'InDi RaDio, radio gratuite sans pub, et leurs épisodes en replay." },
      { name: "keywords", content: "radio gratuite, radio sans pub, émissions radio indépendante, animateurs indépendants, replay InDi RaDio" },
      { property: "og:title", content: "Émissions & Animateurs — Radio gratuite sans pub InDi RaDio" },
      { property: "og:description", content: "Retrouve toutes les émissions d'InDi RaDio, radio gratuite sans pub, et leurs épisodes en replay." },
      { property: "og:url", content: "https://radio.indi-art-culture.com/emissions" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_EMISSIONS },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_EMISSIONS },
    ],
    links: [{ rel: "canonical", href: "https://radio.indi-art-culture.com/emissions" }],
    scripts: [
      breadcrumbLd([
        HOME_CRUMB,
        { name: "Émissions", url: `${SITE_ORIGIN}/emissions` },
      ]),
    ],
  }),
  component: EmissionsPage,
});

type ShowType = "emission" | "chronique" | "animateur";

function ShowsSection({ type, label }: { type: ShowType; label: string }) {
  const t = useT();
  const { data = [] } = useQuery({
    queryKey: ["shows", type],
    queryFn: async () => {
      const { data } = await supabase.from("shows").select("*").eq("type", type).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const [idx, setIdx] = useState(0);
  const selected = data[idx];

  if (data.length === 0) {
    return <div className="card-brut p-4 text-center text-sm text-muted-foreground">{t("page.shows.empty")}</div>;
  }

  return (
    <div className="space-y-4">
      <Carousel opts={{ align: "start" }}>
        <CarouselContent>
          {data.map((s, i) => (
            <CarouselItem key={s.id} className="basis-1/2 md:basis-1/3">
              <button
                onClick={() => setIdx(i)}
                className={`card-brut relative block aspect-square w-full overflow-hidden ${i === idx ? "ring-2 ring-primary" : ""}`}
              >
                {s.cover_url ? (
                  <SmartImg src={s.cover_url} width={400} height={400} responsive={[200, 400, 600]} alt={s.title} className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center bg-muted">
                    <Mic2 className="size-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/70 p-2 text-left text-xs font-semibold">{s.title}</div>
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>

      {selected && (
        <div className="card-brut p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-widest text-primary">{label}</div>
            <ShareButton
              target={{
                url: `/emissions/${selected.id}`,
                title: `${selected.title} — ${label} · Indi Radio`,
                text: selected.description ?? selected.title,
              }}
              variant="chip"
            />
          </div>
          <TranslatedText as="h3" className="mt-1 text-lg font-bold" entityType="show" entityKey={selected.id} field="title" text={selected.title} />
          {selected.schedule && <div className="text-sm text-muted-foreground">{selected.schedule}</div>}
          {(selected as any).host && <div className="text-sm text-muted-foreground">{t("page.shows.with")} {(selected as any).host}</div>}
          {(selected as any).duration_seconds ? (
            <div className="text-sm text-muted-foreground">{t("page.shows.duration")} : {Math.round((selected as any).duration_seconds / 60)} min</div>
          ) : null}
          {selected.description && (
            <TranslatedText as="p" className="mt-2 text-sm" entityType="show" entityKey={selected.id} field="description" text={selected.description} />
          )}
        </div>
      )}

      {selected && <ShowArchive showId={selected.id} />}
    </div>
  );
}

function ShowArchive({ showId }: { showId: string }) {
  const t = useT();
  const { data: episodes = [] } = useQuery({
    queryKey: ["show-episodes", showId],
    queryFn: async () => {
      const { data } = await supabase
        .from("episodes")
        .select("*")
        .eq("show_id", showId)
        .order("published_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <section className="space-y-2">
      <ArchiveHeading />
      {episodes.length === 0 && (
        <div className="card-brut p-3 text-sm text-muted-foreground">{t("page.shows.noReplay")}</div>
      )}
      {episodes.map((ep) => <EpisodeRow key={ep.id} ep={ep} />)}
    </section>
  );
}

function EmissionsPage() {
  const t = useT();
  return (
    <div className="space-y-4">
      <h1 className="section-title">{t("page.shows.title")}</h1>
      <Tabs defaultValue="emission">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="emission">{t("page.shows.tabs.emission")}</TabsTrigger>
          <TabsTrigger value="chronique">{t("page.shows.tabs.chronique")}</TabsTrigger>
          <TabsTrigger value="animateur">{t("page.shows.tabs.animateur")}</TabsTrigger>
        </TabsList>
        <TabsContent value="emission" className="mt-4"><ShowsSection type="emission" label={t("page.shows.label.emission")} /></TabsContent>
        <TabsContent value="chronique" className="mt-4"><ShowsSection type="chronique" label={t("page.shows.label.chronique")} /></TabsContent>
        <TabsContent value="animateur" className="mt-4"><ShowsSection type="animateur" label={t("page.shows.label.animateur")} /></TabsContent>
      </Tabs>
    </div>
  );
}