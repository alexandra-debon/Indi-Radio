import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { Images, Plus, Trash2, Check, GripVertical, Star } from "lucide-react";
import { ImageUploader } from "@/components/media/ImageUploader";

export const Route = createFileRoute("/_authenticated/profile/albums")({
  head: () => ({ meta: [{ title: "Mes albums photos — InDi RaDio" }] }),
  component: AlbumsManager,
  errorComponent: ({ error }) => <div className="p-4 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-4">Introuvable.</div>,
});

type Album = { id: string; title: string; description: string | null; cover_url: string | null; created_at: string; photo_order: string[] | null };
type PhotoPost = { id: string; image_url: string | null; image_urls: string[] | null; album_id: string | null; title: string | null; created_at: string };

function AlbumsManager() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const uid = session?.user.id;
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);

  const { data: albums = [] } = useQuery<Album[]>({
    queryKey: ["my-albums", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photo_albums")
        .select("id, title, description, cover_url, created_at, photo_order")
        .eq("owner_id", uid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Album[];
    },
  });

  const { data: photoPosts = [] } = useQuery<PhotoPost[]>({
    queryKey: ["my-photo-posts", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, image_url, image_urls, album_id, title, created_at")
        .eq("author_id", uid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as any[]).filter((p) => (p.image_urls && p.image_urls.length) || p.image_url) as PhotoPost[];
    },
  });

  const createAlbum = useMutation({
    mutationFn: async () => {
      if (!uid || !newTitle.trim()) return;
      const { error } = await supabase.from("photo_albums").insert({
        owner_id: uid,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setCreating(false);
      setNewTitle("");
      setNewDesc("");
      toast.success("Album créé");
      qc.invalidateQueries({ queryKey: ["my-albums"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteAlbum = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("photo_albums").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Album supprimé");
      setSelectedAlbum(null);
      qc.invalidateQueries({ queryKey: ["my-albums"] });
      qc.invalidateQueries({ queryKey: ["my-photo-posts"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const setPostAlbum = useMutation({
    mutationFn: async ({ postId, albumId }: { postId: string; albumId: string | null }) => {
      const { error } = await supabase.from("posts").update({ album_id: albumId } as any).eq("id", postId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      // Auto-refresh cover when the album gets its first image
      qc.invalidateQueries({ queryKey: ["my-photo-posts"] });
      qc.invalidateQueries({ queryKey: ["my-albums"] });
      qc.invalidateQueries({ queryKey: ["album", v.albumId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const setCover = useMutation({
    mutationFn: async ({ albumId, coverUrl }: { albumId: string; coverUrl: string | null }) => {
      const { error } = await supabase.from("photo_albums").update({ cover_url: coverUrl } as any).eq("id", albumId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.coverUrl ? "Couverture mise à jour" : "Couverture retirée");
      qc.invalidateQueries({ queryKey: ["my-albums"] });
      qc.invalidateQueries({ queryKey: ["wall-posts"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const activeAlbum = albums.find((a) => a.id === selectedAlbum) ?? null;
  const postsInAlbumRaw = photoPosts.filter((p) => p.album_id === selectedAlbum);
  const postsUnassigned = photoPosts.filter((p) => p.album_id !== selectedAlbum);

  // Local ordered list of post IDs for the active album, seeded from the
  // stored photo_order (falling back to created_at DESC for legacy albums).
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const savingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activeAlbum) { setOrderedIds([]); return; }
    const stored = (activeAlbum.photo_order ?? []).filter((id) => postsInAlbumRaw.some((p) => p.id === id));
    const missing = postsInAlbumRaw.map((p) => p.id).filter((id) => !stored.includes(id));
    setOrderedIds([...stored, ...missing]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAlbum?.id, postsInAlbumRaw.length]);

  const postsInAlbum = orderedIds
    .map((id) => postsInAlbumRaw.find((p) => p.id === id))
    .filter((p): p is PhotoPost => !!p);

  const saveOrder = useMutation({
    mutationFn: async ({ albumId, order }: { albumId: string; order: string[] }) => {
      const { error } = await supabase.from("photo_albums").update({ photo_order: order } as any).eq("id", albumId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["my-albums"] });
      qc.invalidateQueries({ queryKey: ["album", v.albumId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const scheduleSave = (albumId: string, order: string[]) => {
    if (savingRef.current) clearTimeout(savingRef.current);
    savingRef.current = setTimeout(() => { saveOrder.mutate({ albumId, order }); }, 400);
  };

  const reorder = (from: number, to: number) => {
    if (!activeAlbum || from === to || from < 0 || to < 0) return;
    const next = orderedIds.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrderedIds(next);
    scheduleSave(activeAlbum.id, next);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <Link to="/profile" className="text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground">← Mon profil</Link>
        <Button size="sm" onClick={() => setCreating((v) => !v)}>
          <Plus className="size-3.5" /> Nouvel album
        </Button>
      </div>

      <h1 className="text-2xl font-black">Mes albums photos</h1>

      {creating && (
        <div className="card-brut space-y-2 p-3">
          <Input placeholder="Titre de l'album" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={80} />
          <Textarea placeholder="Description (optionnel)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} maxLength={280} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Annuler</Button>
            <Button size="sm" onClick={() => createAlbum.mutate()} disabled={!newTitle.trim() || createAlbum.isPending}>
              <Check className="size-3.5" /> Créer
            </Button>
          </div>
        </div>
      )}

      {albums.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun album. Crée-en un pour regrouper tes photos.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {albums.map((a) => {
            const count = photoPosts.filter((p) => p.album_id === a.id).length;
            const cover = a.cover_url || photoPosts.find((p) => p.album_id === a.id)?.image_url || photoPosts.find((p) => p.album_id === a.id)?.image_urls?.[0] || null;
            const active = selectedAlbum === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setSelectedAlbum(active ? null : a.id)}
                className={`card-brut overflow-hidden text-left transition ${active ? "ring-2 ring-primary" : ""}`}
              >
                <div className="relative aspect-video w-full bg-muted">
                  {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : (
                    <div className="grid h-full place-items-center text-muted-foreground"><Images className="size-6" /></div>
                  )}
                </div>
                <div className="p-2">
                  <div className="truncate text-sm font-bold">{a.title}</div>
                  <div className="text-[11px] text-muted-foreground">{count} photo{count > 1 ? "s" : ""}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {activeAlbum && (
        <div className="card-brut space-y-3 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-black">{activeAlbum.title}</h2>
              {activeAlbum.description && <p className="text-xs text-muted-foreground">{activeAlbum.description}</p>}
            </div>
            <button
              onClick={() => { if (confirm("Supprimer cet album ? (les photos ne sont pas supprimées)")) deleteAlbum.mutate(activeAlbum.id); }}
              className="rounded p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
              aria-label="Supprimer l'album"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Dans cet album ({postsInAlbum.length})</div>
            {postsInAlbum.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune photo — choisis-en dans la liste ci-dessous.</p>
            ) : (
              <>
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Glisse pour réorganiser — sauvegarde auto</p>
              <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
                {postsInAlbum.map((p, idx) => {
                  const url = (p.image_urls && p.image_urls[0]) || p.image_url || "";
                  return (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={(e) => { setDragIdx(idx); e.dataTransfer.effectAllowed = "move"; }}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                      onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) reorder(dragIdx, idx); setDragIdx(null); }}
                      onDragEnd={() => setDragIdx(null)}
                      className={`group relative aspect-square cursor-move overflow-hidden rounded border border-border bg-muted ${dragIdx === idx ? "opacity-50" : ""}`}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <span className="absolute left-1 top-1 grid size-5 place-items-center rounded bg-black/60 text-white opacity-0 transition group-hover:opacity-100" aria-hidden>
                        <GripVertical className="size-3" />
                      </span>
                      <span className="absolute right-1 top-1 rounded bg-black/60 px-1 text-[9px] font-bold text-white">{idx + 1}</span>
                      <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/60 p-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={() => setCover.mutate({ albumId: activeAlbum.id, coverUrl: url })}
                          className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-black"
                        >
                          Couverture
                        </button>
                        <button
                          onClick={() => setPostAlbum.mutate({ postId: p.id, albumId: null })}
                          className="rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-black"
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>

          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Ajouter des photos</div>
            {postsUnassigned.length === 0 ? (
              <p className="text-xs text-muted-foreground">Toutes tes photos sont déjà dans un album.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
                {postsUnassigned.map((p) => {
                  const url = (p.image_urls && p.image_urls[0]) || p.image_url || "";
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPostAlbum.mutate({ postId: p.id, albumId: activeAlbum.id })}
                      className="group relative aspect-square overflow-hidden rounded border border-border bg-muted"
                      title={p.album_id ? "Déplacer dans cet album" : "Ajouter à cet album"}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100" />
                      <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                        <Plus className="size-6 text-white" />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}