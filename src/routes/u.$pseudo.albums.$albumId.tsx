import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/u/$pseudo/albums/$albumId")({
  head: ({ params }) => ({
    meta: [
      { title: `Album de @${params.pseudo} — InDi RaDio` },
      { name: "description", content: `Galerie photo de @${params.pseudo}.` },
      { property: "og:title", content: `Album de @${params.pseudo}` },
      { property: "og:description", content: `Galerie photo sur InDi RaDio.` },
    ],
  }),
  component: AlbumGallery,
  errorComponent: ({ error }) => <div className="p-4 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-4">Album introuvable.</div>,
});

type AlbumPost = {
  id: string;
  image_url: string | null;
  image_urls: string[] | null;
  image_captions: string[] | null;
  title: string | null;
  created_at: string;
};

async function fetchAlbum(albumId: string, pseudo: string) {
  const { data: album, error: aerr } = await supabase
    .from("photo_albums")
    .select("id, owner_id, title, description, cover_url, created_at, photo_order")
    .eq("id", albumId)
    .maybeSingle();
  if (aerr) throw aerr;
  if (!album) throw notFound();

  const { data: owner } = await supabase.from("profiles").select("pseudo, avatar_url").eq("id", album.owner_id).maybeSingle();
  if (!owner || owner.pseudo.toLowerCase() !== pseudo.toLowerCase()) throw notFound();

  const { data: posts, error: perr } = await supabase
    .from("posts")
    .select("id, image_url, image_urls, image_captions, title, created_at")
    .eq("album_id", albumId)
    .order("created_at", { ascending: false });
  if (perr) throw perr;

  const order = ((album as any).photo_order ?? []) as string[];
  const orderedPosts = (() => {
    const list = (posts ?? []) as AlbumPost[];
    if (order.length === 0) return list;
    const byId = new Map(list.map((p) => [p.id, p]));
    const head = order.map((id) => byId.get(id)).filter((p): p is AlbumPost => !!p);
    const rest = list.filter((p) => !order.includes(p.id));
    return [...head, ...rest];
  })();

  const photos: { postId: string; url: string; caption: string }[] = [];
  for (const p of orderedPosts) {
    const imgs = (p.image_urls && p.image_urls.length > 0) ? p.image_urls : (p.image_url ? [p.image_url] : []);
    imgs.forEach((u, i) => photos.push({ postId: p.id, url: u, caption: (p.image_captions?.[i]) ?? "" }));
  }
  return { album, owner, photos };
}

function AlbumGallery() {
  const { pseudo, albumId } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["album", albumId, pseudo],
    queryFn: () => fetchAlbum(albumId, pseudo),
  });

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Chargement…</div>;
  if (error || !data) return <div className="p-4">Album introuvable.</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <Link to="/u/$pseudo" params={{ pseudo }} className="text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground">
        ← Profil de @{pseudo}
      </Link>

      <header className="card-brut p-4">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Album</div>
        <h1 className="text-2xl font-black">{data.album.title}</h1>
        {data.album.description && <p className="mt-1 text-sm text-muted-foreground">{data.album.description}</p>}
        <div className="mt-1 text-[11px] text-muted-foreground">{data.photos.length} photo{data.photos.length > 1 ? "s" : ""}</div>
      </header>

      {data.photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune photo dans cet album.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {data.photos.map((ph, i) => (
            <Link
              key={i}
              to="/p/$postId"
              params={{ postId: ph.postId }}
              className="card-brut overflow-hidden"
            >
              <div className="relative aspect-square w-full bg-muted">
                <img src={ph.url} alt={ph.caption} loading="lazy" className="h-full w-full object-cover" />
              </div>
              {ph.caption && (
                <p className="px-2 py-1 text-[11px] text-muted-foreground line-clamp-2">{ph.caption}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}