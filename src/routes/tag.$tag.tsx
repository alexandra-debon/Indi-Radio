import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserBadge } from "@/components/UserBadge";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { renderRich } from "@/lib/rich-text";
import { stripMediaUrls } from "@/lib/media-embed";
import { Hash } from "lucide-react";

type Row = {
  id: string;
  author_id: string;
  content: string;
  title: string | null;
  created_at: string;
  image_url: string | null;
  image_urls: string[] | null;
  author: {
    id: string;
    pseudo: string;
    role: "admin" | "artiste" | "animateur" | "auditeur";
    is_certified: boolean;
    is_team_indi: boolean;
    badges: string[];
    level: number;
  } | null;
};

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl p-6 text-sm">
      <p className="text-destructive">Erreur : {error.message}</p>
      <button onClick={reset} className="mt-2 rounded border px-2 py-1">
        Réessayer
      </button>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="mx-auto max-w-2xl p-6 text-center text-sm text-muted-foreground">
      Hashtag introuvable.
    </div>
  );
}

export const Route = createFileRoute("/tag/$tag")({
  component: TagPage,
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,
  head: ({ params }) => {
    const t = params.tag;
    return {
      meta: [
        { title: `#${t} — InDi RaDio` },
        { name: "description", content: `Toutes les publications avec le hashtag #${t} sur InDi RaDio.` },
        { property: "og:title", content: `#${t} — InDi RaDio` },
        { property: "og:description", content: `Publications taggées #${t}.` },
        { property: "og:type", content: "website" },
      ],
    };
  },
});

function TagPage() {
  const { tag } = Route.useParams();
  const needle = `%#${tag}%`;

  const { data: posts = [], isLoading } = useQuery<Row[]>({
    queryKey: ["tag-posts", tag],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, author_id, content, title, created_at, image_url, image_urls, author:profiles!posts_author_id_fkey(id, pseudo, role, is_certified, is_team_indi, badges, level)")
        .or(`content.ilike.${needle},title.ilike.${needle}`)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  return (
    <section className="mx-auto max-w-3xl space-y-3 p-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-8 items-center justify-center rounded-full border-2 border-black bg-primary text-black shadow-[2px_2px_0_0_#000]">
          <Hash className="size-4" strokeWidth={3} />
        </span>
        <h1 className="text-2xl font-bold">#{tag}</h1>
        <span className="text-xs text-muted-foreground">({posts.length})</span>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      )}

      {!isLoading && posts.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucune publication avec ce hashtag pour le moment.
        </p>
      )}

      <ul className="space-y-2">
        {posts.map((p) => {
          const imgs = (p.image_urls && p.image_urls.length > 0) ? p.image_urls : (p.image_url ? [p.image_url] : []);
          const cleanedContent = stripMediaUrls(p.content);
          return (
            <li key={p.id} className="card-brut p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <UserBadge profile={p.author} className="text-xs" />
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: fr })}
                </span>
              </div>
              {p.title && (
                <Link to="/p/$postId" params={{ postId: p.id }} className="block text-base font-bold leading-tight hover:underline">
                  {renderRich(p.title)}
                </Link>
              )}
              {cleanedContent && (
                <p className="whitespace-pre-wrap text-sm">{renderRich(cleanedContent)}</p>
              )}
              {imgs[0] && (
                <div className="mt-2 overflow-hidden rounded border border-border bg-muted" style={{ aspectRatio: "16/9" }}>
                  <img src={imgs[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="mt-2 text-right">
                <Link
                  to="/p/$postId"
                  params={{ postId: p.id }}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  Voir la publication →
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}