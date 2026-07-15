import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ShareButton } from "@/components/share/ShareButton";
import { UrlEmbeds } from "@/components/media/UrlEmbeds";
import { stripMediaUrls } from "@/lib/media-embed";
import { ArrowLeft } from "lucide-react";
import ogActus from "@/assets/og-actus.jpg";

const BASE_URL = "https://radio.indi-art-culture.com";
const OG_FALLBACK = `${BASE_URL}${ogActus}`;

export const Route = createFileRoute("/actus/$postId")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("news_posts")
      .select("id,title,content,image_url,created_at")
      .eq("id", params.postId)
      .maybeSingle();
    if (error || !data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    const url = `${BASE_URL}/actus/${params.postId}`;
    if (!loaderData) {
      return {
        meta: [
          { title: "Actu introuvable — Indi Rézo" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${loaderData.title} — Indi Rézo`;
    const desc = (stripMediaUrls(loaderData.content ?? "").slice(0, 200) || loaderData.title).replace(/\s+/g, " ");
    const image = loaderData.image_url || OG_FALLBACK;
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
      <p className="text-sm text-muted-foreground">Cette actu n'existe pas ou a été supprimée.</p>
      <Link to="/actus" className="mt-3 inline-block text-sm text-primary underline">Retour à Indi Rézo</Link>
    </div>
  ),
  errorComponent: () => (
    <div className="card-brut p-6 text-center text-sm text-muted-foreground">Erreur de chargement.</div>
  ),
  component: NewsDetailPage,
});

function NewsDetailPage() {
  const post = Route.useLoaderData();
  const { postId } = Route.useParams();
  const url = `${BASE_URL}/actus/${postId}`;
  const body = stripMediaUrls(post.content ?? "");
  return (
    <div className="space-y-4">
      <Link to="/actus" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Indi Rézo
      </Link>
      <article className="card-brut overflow-hidden">
        {post.image_url && <img src={post.image_url} alt="" className="h-56 w-full object-cover" />}
        <div className="space-y-3 p-4">
          <h1 className="text-2xl font-bold">{post.title}</h1>
          {body && <p className="whitespace-pre-wrap text-sm">{body}</p>}
          <UrlEmbeds text={post.content ?? ""} />
          <div className="pt-2">
            <ShareButton
              variant="chip"
              target={{ url, title: `${post.title} — Indi Rézo`, text: body.slice(0, 200) || post.title }}
            />
          </div>
        </div>
      </article>
    </div>
  );
}