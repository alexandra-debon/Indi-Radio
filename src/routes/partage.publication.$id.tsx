import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";
import { ShareButton } from "@/components/share/ShareButton";
import { clampDescription } from "@/lib/i18n/seo-meta";
import { ogImageTags } from "@/lib/og-tags";
import { hlFromSearch, ogLocaleTags, withHl } from "@/lib/og-lang";
import { ogImageForLang } from "@/lib/og-image";
import { useLang } from "@/lib/i18n";

const BASE_URL = "https://www.radio.indi-art-culture.com";
const OG_FALLBACK = ogImageForLang("fr");

type ShareSearch = { t?: string; d?: string; img?: string; hl?: string };

function str(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s.slice(0, max) : undefined;
}

function plain(text: string | null): string {
  return (text || "").replace(/\s+/g, " ").trim();
}

export const Route = createFileRoute("/partage/publication/$id")({
  validateSearch: (search: Record<string, unknown>): ShareSearch => ({
    t: str(search.t, 160),
    d: str(search.d, 300),
    img: str(search.img, 500),
    hl: str(search.hl, 5),
  }),
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, content, image_url, image_urls, og_image_url")
      .eq("id", params.id)
      .maybeSingle();
    if (error || !data) throw notFound();
    return data;
  },
  head: ({ params, loaderData, match }) => {
    const lang = hlFromSearch(match.search);
    const s = match.search as ShareSearch;
    if (!loaderData) {
      return {
        meta: [
          { title: "Lien introuvable — InDi RaDio" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const text = plain(loaderData.content);
    const qs = new URLSearchParams();
    if (s.t) qs.set("t", s.t);
    if (s.d) qs.set("d", s.d);
    if (s.img) qs.set("img", s.img);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const url = withHl(`${BASE_URL}/partage/publication/${params.id}${suffix}`, lang);
    const title = s.t || loaderData.title || text.slice(0, 80) || "InDi RaDio";
    const desc = clampDescription(s.d || text.slice(0, 300) || title);
    const own = loaderData.og_image_url || loaderData.image_url || loaderData.image_urls?.[0];
    const image = s.img || own || OG_FALLBACK;
    const landscape = Boolean(s.img || loaderData.og_image_url);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        ...ogLocaleTags(lang),
        ...ogImageTags(image, { baseUrl: BASE_URL, alt: title, declareSize: landscape }),
        { name: "twitter:card", content: landscape ? "summary_large_image" : "summary" },
      ],
    };
  },
  notFoundComponent: () => <NotFoundCard />,
  component: PostSharePage,
});

function NotFoundCard() {
  const { lang } = useLang();
  return (
    <div className="card-brut p-6 text-center">
      <p className="text-sm text-muted-foreground">
        {lang === "en" ? "This link is no longer available." : "Ce lien n'est plus disponible."}
      </p>
      <Link to="/" className="mt-3 inline-block font-bold text-primary hover:underline">
        InDi RaDio
      </Link>
    </div>
  );
}

function PostSharePage() {
  const post = Route.useLoaderData();
  const search = Route.useSearch();
  const { lang } = useLang();
  const en = lang === "en";
  const text = plain(post.content);
  const title = search.t || post.title || text.slice(0, 80) || "InDi RaDio";
  const desc = search.d || text.slice(0, 220);
  const image =
    search.img || post.og_image_url || post.image_url || post.image_urls?.[0] || null;
  const label = en ? "Post" : "Publication";
  const cta = en ? "Open the full post" : "Voir la publication complète";

  return (
    <article className="card-brut mx-auto max-w-2xl space-y-3 p-4">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <h1 className="break-words text-xl font-black leading-tight">{title}</h1>
      {image && (
        <img
          src={image}
          alt={title}
          className="w-full rounded-md border-2 border-black object-cover"
        />
      )}
      {desc && <p className="break-words text-sm text-muted-foreground">{desc}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/p/$postId"
          params={{ postId: post.id }}
          className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground shadow-[2px_2px_0_0_#000]"
        >
          {cta} <ArrowRight className="size-4" />
        </Link>
        <ShareButton target={{ url: `/partage/publication/${post.id}`, title, text: desc }} />
      </div>
    </article>
  );
}
