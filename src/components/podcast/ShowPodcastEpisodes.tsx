import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Headphones, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { inAppEpisodesForShow, showKey } from "@/lib/jovanna-podcast";

/** Épisodes podcast issus d'une émission radio, avec lien vers leur fiche. */
export function ShowPodcastEpisodes({ showTitle }: { showTitle: string }) {
  const t = useT();
  const eps = inAppEpisodesForShow(showTitle);
  if (eps.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground">{t("page.shows.podcastEpisodes")}</div>
      {eps.map((ep) => (
        <Link
          key={ep.slug}
          to="/podcasts/episode/$slug"
          params={{ slug: ep.slug }}
          className="card-brut flex items-center gap-3 p-3 hover:ring-2 hover:ring-primary"
        >
          <Headphones className="size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{ep.title} — {t("page.shows.episodeN")} {String(ep.episode).padStart(2, "0")}</div>
            <div className="text-xs text-muted-foreground">{ep.host} · {Math.round(ep.durationSeconds / 60)} min</div>
          </div>
          <span className="text-xs font-semibold text-primary">{t("page.shows.listen")} →</span>
        </Link>
      ))}
    </div>
  );
}

/** Lien de la fiche podcast vers l'émission radio d'origine. */
export function LinkedShowLink({ episodeTitle }: { episodeTitle: string }) {
  const t = useT();
  const { data: show } = useQuery({
    queryKey: ["linked-show", showKey(episodeTitle)],
    queryFn: async () => {
      const { data } = await supabase.from("shows").select("id,title").eq("type", "emission");
      return (data ?? []).find((s) => showKey(s.title) === showKey(episodeTitle)) ?? null;
    },
  });
  if (!show) return null;
  return (
    <Link to="/emissions/$showId" params={{ showId: show.id }} className="card-brut flex items-center gap-2 p-3 text-sm hover:ring-2 hover:ring-primary">
      <Radio className="size-4 text-primary" />
      <span className="text-muted-foreground">{t("page.shows.fromShow")}</span>
      <span className="font-bold">{show.title.trim()}</span>
      <span className="ml-auto text-xs font-semibold text-primary">→</span>
    </Link>
  );
}
