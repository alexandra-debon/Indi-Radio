import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Disc3, Calendar, ArrowLeft } from "lucide-react";
import { ShareButton } from "@/components/share/ShareButton";
import { SocialLinksBar, type SocialLinks } from "@/components/social/SocialLinksBar";
import { StarRating } from "@/components/rating/StarRating";
import { CoupComments } from "@/components/coups/CoupComments";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { renderRich } from "@/lib/rich-text";

const SITE = "https://www.radio.indi-art-culture.com";

type CoupDetail = {
  id: string;
  featured_date: string;
  cover_url: string | null;
  artist: string;
  title: string;
  kind: string;
  comment: string;
  discovery_story: string | null;
  social_links: SocialLinks | null;
  editorial_rating: number | null;
  published: boolean;
};

export const Route = createFileRoute("/coups-de-coeur/$coupId")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("coups_de_coeur" as any)
      .select(
        "id, featured_date, cover_url, artist, title, kind, comment, discovery_story, social_links, editorial_rating, published",
      )
      .eq("id", params.coupId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return data as unknown as CoupDetail;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Coup de cœur indisponible" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.title} — ${loaderData.artist} · Coup de cœur InDi RaDiO`;
    const description = loaderData.comment.replace(/\s+/g, " ").slice(0, 180);
    const url = `${SITE}/coups-de-coeur/${params.coupId}`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: loaderData.cover_url ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ];
    if (loaderData.cover_url) {
      meta.push({ property: "og:image", content: loaderData.cover_url });
      meta.push({ name: "twitter:image", content: loaderData.cover_url });
    }
    if (!loaderData.published) meta.push({ name: "robots", content: "noindex" });
    return { meta, links: [{ rel: "canonical", href: url }] };
  },
  component: CoupDetailPage,
});

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return d;
  }
}

function CoupDetailPage() {
  const c = Route.useLoaderData();
  const kindLabel = c.kind === "single" ? "Chanson" : c.kind === "ep" ? "EP" : "Album";

  return (
    <article className="space-y-4">
      <Link to="/coups-de-coeur" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Tous les coups de cœur
      </Link>

      <div className="card-brut p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="w-full shrink-0 sm:w-56">
            <div className="aspect-square overflow-hidden rounded-md bg-muted">
              {c.cover_url ? (
                <img src={c.cover_url} alt={`${c.title} — ${c.artist}`} className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center">
                  <Disc3 className="size-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="size-3.5" />
              <time dateTime={c.featured_date}>{formatDate(c.featured_date)}</time>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary">
                  <Heart className="size-3.5 fill-primary" />
                  {kindLabel}
                </div>
                <h1 className="break-words text-2xl font-bold leading-tight">{c.title}</h1>
                <div className="text-sm text-muted-foreground">
                  par <span className="font-medium text-foreground">{c.artist}</span>
                </div>
              </div>
              <ShareButton
                target={{
                  url: `/coups-de-coeur/${c.id}`,
                  title: `Coup de cœur InDi RaDiO : ${c.title} — ${c.artist}`,
                  text: c.comment.slice(0, 180),
                }}
              />
            </div>

            {c.editorial_rating != null && c.editorial_rating > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Note rédaction
                </span>
                <StarRating value={c.editorial_rating} size={16} />
              </div>
            )}

            <TranslatedText entityType="coup_de_coeur" entityKey={c.id} field="comment" text={c.comment}>
              {(rendered) => (
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {renderRich(rendered)}
                </div>
              )}
            </TranslatedText>

            {c.discovery_story && (
              <div className="rounded-md border-l-4 border-primary bg-muted/40 p-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                  Comment on l'a découvert·e
                </div>
                <TranslatedText
                  entityType="coup_de_coeur"
                  entityKey={c.id}
                  field="discovery_story"
                  text={c.discovery_story}
                >
                  {(rendered) => (
                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                      {renderRich(rendered)}
                    </div>
                  )}
                </TranslatedText>
              </div>
            )}

            {c.social_links && <SocialLinksBar links={c.social_links} className="pt-1" />}

            <CoupComments coupId={c.id} />
          </div>
        </div>
      </div>
    </article>
  );
}
