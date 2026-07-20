import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { ReportAlbumButton } from "@/components/moderation/ReportAlbumButton";

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

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Chargement…</div>;
  if (error || !data) return <div className="p-4">Album introuvable.</div>;

  const photos = data.photos;
  const openAt = (i: number) => setLightboxIdx(i);
  const close = () => setLightboxIdx(null);
  const prev = () => setLightboxIdx((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
  const next = () => setLightboxIdx((i) => (i === null ? i : (i + 1) % photos.length));

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <Link to="/u/$pseudo" params={{ pseudo }} className="text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground">
        ← Profil de @{pseudo}
      </Link>

      <header className="card-brut p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Album</div>
            <h1 className="text-2xl font-black">{data.album.title}</h1>
            {data.album.description && <p className="mt-1 text-sm text-muted-foreground">{data.album.description}</p>}
            <div className="mt-1 text-[11px] text-muted-foreground">{photos.length} photo{photos.length > 1 ? "s" : ""}</div>
          </div>
          <ReportAlbumButton albumId={albumId} />
        </div>
      </header>

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune photo dans cet album.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((ph, i) => (
            <div key={i} className="card-brut overflow-hidden">
              <button
                type="button"
                onClick={() => openAt(i)}
                className="group relative block aspect-square w-full bg-muted"
                aria-label={`Ouvrir la photo ${i + 1}`}
              >
                <img src={ph.url} alt={ph.caption} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                <span className="pointer-events-none absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/40 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <ZoomIn className="size-4 text-white" />
                </span>
              </button>
              <div className="flex items-center justify-between gap-2 px-2 py-1">
                {ph.caption ? (
                  <p className="flex-1 text-[11px] text-muted-foreground line-clamp-2">{ph.caption}</p>
                ) : <span className="flex-1" />}
                <Link
                  to="/p/$postId"
                  params={{ postId: ph.postId }}
                  className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-primary hover:underline"
                >
                  Post →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightboxIdx !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIdx}
          onClose={close}
          onPrev={prev}
          onNext={next}
        />
      )}
    </div>
  );
}

type Photo = { postId: string; url: string; caption: string };

function Lightbox({ photos, index, onClose, onPrev, onNext }: {
  photos: Photo[]; index: number; onClose: () => void; onPrev: () => void; onNext: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const swipeRef = useRef<{ startX: number; startY: number; startT: number; pointerId: number } | null>(null);
  const [swipeDx, setSwipeDx] = useState(0);

  const reset = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);
  useEffect(() => { reset(); }, [index, reset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(5, z + 0.25));
      else if (e.key === "-") setZoom((z) => Math.max(1, z - 0.25));
      else if (e.key === "0") reset();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [onClose, onPrev, onNext, reset]);

  const ph = photos[index];
  if (!ph) return null;

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(1, Math.min(5, z + (e.deltaY < 0 ? 0.15 : -0.15))));
  };
  const onDoubleClick = () => setZoom((z) => (z > 1 ? 1 : 2));
  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom > 1) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: pan.x, baseY: pan.y };
      return;
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    swipeRef.current = { startX: e.clientX, startY: e.clientY, startT: Date.now(), pointerId: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragRef.current) {
      setPan({ x: dragRef.current.baseX + (e.clientX - dragRef.current.startX), y: dragRef.current.baseY + (e.clientY - dragRef.current.startY) });
      return;
    }
    if (swipeRef.current) {
      const dx = e.clientX - swipeRef.current.startX;
      const dy = e.clientY - swipeRef.current.startY;
      if (Math.abs(dx) > Math.abs(dy)) setSwipeDx(dx);
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    if (swipeRef.current) {
      const dx = e.clientX - swipeRef.current.startX;
      const dy = e.clientY - swipeRef.current.startY;
      const dt = Date.now() - swipeRef.current.startT;
      swipeRef.current = null;
      setSwipeDx(0);
      const horizontal = Math.abs(dx) > Math.abs(dy);
      const fast = dt < 400 && Math.abs(dx) > 40;
      const long = Math.abs(dx) > 80;
      if (horizontal && (fast || long) && photos.length > 1) {
        if (dx < 0) onNext();
        else onPrev();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} sur ${photos.length}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 p-2 text-white">
        <div className="text-xs font-bold">{index + 1} / {photos.length}</div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.max(1, z - 0.25))} className="rounded p-1.5 hover:bg-white/10" aria-label="Zoom arrière" title="Zoom -"><ZoomOut className="size-4" /></button>
          <span className="min-w-10 text-center text-[11px] tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(5, z + 0.25))} className="rounded p-1.5 hover:bg-white/10" aria-label="Zoom avant" title="Zoom +"><ZoomIn className="size-4" /></button>
          <button onClick={reset} className="rounded p-1.5 hover:bg-white/10" aria-label="Réinitialiser" title="Réinitialiser (0)"><RotateCcw className="size-4" /></button>
          <button onClick={onClose} className="ml-1 rounded p-1.5 hover:bg-white/10" aria-label="Fermer" title="Fermer (Échap)"><X className="size-5" /></button>
        </div>
      </div>

      <div
        className="relative flex-1 overflow-hidden"
        onWheel={onWheel}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <button
          onClick={onPrev}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 disabled:opacity-30"
          aria-label="Photo précédente"
          disabled={photos.length < 2}
        >
          <ChevronLeft className="size-6" />
        </button>
        <button
          onClick={onNext}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 disabled:opacity-30"
          aria-label="Photo suivante"
          disabled={photos.length < 2}
        >
          <ChevronRight className="size-6" />
        </button>

        <div className="flex h-full w-full items-center justify-center">
          <img
            key={ph.url}
            src={ph.url}
            alt={ph.caption}
            draggable={false}
            onDoubleClick={onDoubleClick}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, cursor: zoom > 1 ? "grab" : "zoom-in", transition: dragRef.current ? "none" : "transform 0.15s ease-out" }}
            className="max-h-full max-w-full select-none object-contain"
          />
        </div>
      </div>

      {(ph.caption || ph.postId) && (
        <div className="flex items-center justify-between gap-2 border-t border-white/10 p-2 text-white">
          <p className="flex-1 text-xs text-white/80 line-clamp-2">{ph.caption}</p>
          <Link
            to="/p/$postId"
            params={{ postId: ph.postId }}
            className="shrink-0 rounded border border-white/20 px-2 py-1 text-[11px] font-bold uppercase tracking-wide hover:bg-white/10"
            onClick={onClose}
          >
            Voir le post
          </Link>
        </div>
      )}
    </div>
  );
}