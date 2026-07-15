import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShareButton } from "@/components/share/ShareButton";
import { EpisodeRow } from "@/components/EpisodeRow";
import { ArrowLeft, Mic2 } from "lucide-react";
import ogEmissions from "@/assets/og-emissions.jpg";

const BASE_URL = "https://radio.indi-art-culture.com";
const OG_FALLBACK = `${BASE_URL}${ogEmissions}`;

export const Route = createFileRoute("/emissions/$showId")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("shows")
      .select("id,title,description,cover_url,type,schedule")
      .eq("id", params.showId)
      .maybeSingle();
    if (error || !data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    const url = `${BASE_URL}/emissions/${params.showId}`;
    if (!loaderData) {
      return { meta: [{ title: "Émission introuvable — Indi Radio" }, { name: "robots", content: "noindex" }] };
    }
    const label = loaderData.type === "chronique" ? "Chronique" : loaderData.type === "animateur" ? "Animateur" : "Émission";
    const title = `${loaderData.title} — ${label} · Indi Radio`;
    const desc = (loaderData.description ?? loaderData.title).slice(0, 200);
    const image = loaderData.cover_url || OG_FALLBACK;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: () => (
    <div className="card-brut p-6 text-center">
      <p className="text-sm text-muted-foreground">Cette émission n'existe pas ou a été supprimée.</p>
      <Link to="/emissions" className="mt-3 inline-block text-sm text-primary underline">Voir toutes les émissions</Link>
    </div>
  ),
  errorComponent: () => (
    <div className="card-brut p-6 text-center text-sm text-muted-foreground">Erreur de chargement.</div>
  ),
  component: ShowDetailPage,
});

function ShowDetailPage() {
  const show = Route.useLoaderData();
  const { showId } = Route.useParams();
  const url = `${BASE_URL}/emissions/${showId}`;
  const label = show.type === "chronique" ? "Chronique" : show.type === "animateur" ? "Animateur" : "Émission";

  const { data: episodes = [] } = useQuery({
    queryKey: ["show-episodes", showId],
    queryFn: async () => {
      const { data } = await supabase.from("episodes").select("*").eq("show_id", showId).order("published_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <Link to="/emissions" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Émissions
      </Link>
      <div className="card-brut overflow-hidden">
        {show.cover_url ? (
          <img src={show.cover_url} alt={show.title} className="h-64 w-full object-cover" />
        ) : (
          <div className="grid h-48 w-full place-items-center bg-muted"><Mic2 className="size-10 text-muted-foreground" /></div>
        )}
        <div className="space-y-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-widest text-primary">{label}</div>
            <ShareButton
              variant="chip"
              target={{ url, title: `${show.title} — ${label} · Indi Radio`, text: show.description ?? show.title }}
            />
          </div>
          <h1 className="text-2xl font-bold">{show.title}</h1>
          {show.schedule && <div className="text-sm text-muted-foreground">{show.schedule}</div>}
          {show.description && <p className="text-sm">{show.description}</p>}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Anciens épisodes</h2>
        {episodes.length === 0 && (
          <div className="card-brut p-3 text-sm text-muted-foreground">Aucun replay pour l'instant.</div>
        )}
        {episodes.map((ep) => <EpisodeRow key={ep.id} ep={ep} />)}
      </section>
    </div>
  );
}