import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ShareButton } from "@/components/share/ShareButton";
import { UrlEmbeds } from "@/components/media/UrlEmbeds";
import { stripMediaUrls } from "@/lib/media-embed";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { UserBadge } from "@/components/UserBadge";
import ogHome from "@/assets/og-home.jpg";

const BASE_URL = "https://radio.indi-art-culture.com";
const OG_FALLBACK = `${BASE_URL}${ogHome}`;

function snippet(text: string, max = 200) {
  return stripMediaUrls(text ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export const Route = createFileRoute("/p/$postId")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, content, image_url, image_urls, created_at, author:profiles!posts_author_id_fkey(id, pseudo)"
      )
      .eq("id", params.postId)
      .maybeSingle();
    if (error || !data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    const url = `${BASE_URL}/p/${params.postId}`;
    if (!loaderData) {
      return {
        meta: [
          { title: "Publication introuvable — Indi Radio" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const author = loaderData.author?.pseudo ?? "Un auditeur";
    const body = snippet(loaderData.content ?? "");
    const title = body ? `${author} — ${body.slice(0, 60)}` : `${author} sur Indi Radio`;
    const desc = body || `Publication de ${author} sur le mur Indi Radio.`;
    const firstImage =
      (loaderData.image_urls && loaderData.image_urls.length > 0
        ? loaderData.image_urls[0]
        : loaderData.image_url) || OG_FALLBACK;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { property: "og:image", content: firstImage },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: firstImage },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: () => (
    <div className="card-brut p-6 text-center">
      <p className="text-sm text-muted-foreground">Cette publication n'existe pas ou a été supprimée.</p>
      <Link to="/" className="mt-3 inline-block text-sm text-primary underline">Retour au mur</Link>
    </div>
  ),
  errorComponent: () => (
    <div className="card-brut p-6 text-center text-sm text-muted-foreground">Erreur de chargement.</div>
  ),
  component: PostDetailPage,
});

function PostDetailPage() {
  const post = Route.useLoaderData();
  const { postId } = Route.useParams();
  const url = `${BASE_URL}/p/${postId}`;
  const body = stripMediaUrls(post.content ?? "");
  const images =
    post.image_urls && post.image_urls.length > 0
      ? post.image_urls
      : post.image_url
        ? [post.image_url]
        : [];
  const author = post.author?.pseudo ?? "Un auditeur";
  const title = body ? body.slice(0, 60) : `${author} sur Indi Radio`;
  return (
    <div className="space-y-4">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Mur social
      </Link>
      <article className="card-brut overflow-hidden">
        {images.length > 0 && (
          <div className={`grid gap-1 ${images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {images.map((src: string, i: number) => (
              <div key={i} className="overflow-hidden bg-muted" style={{ aspectRatio: images.length === 1 ? "16/9" : "1/1" }}>
                <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        )}
        <div className="space-y-3 p-4">
          <p className="text-xs uppercase text-muted-foreground">Publié par {author}</p>
          {body && <p className="whitespace-pre-wrap text-sm">{body}</p>}
          <UrlEmbeds text={post.content ?? ""} />
          <div className="pt-2">
            <ShareButton
              variant="chip"
              target={{ url, title: `${author} — ${title}`, text: body.slice(0, 200) || title }}
            />
          </div>
        </div>
      </article>
    </div>
  );
}