import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Loader2, Tv, Trash2, ExternalLink, Pencil, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { TeeviVideoEditor } from "@/components/teevi/TeeviVideoEditor";
import type { TeeviVideo } from "@/components/teevi/teevi-i18n";

export const Route = createFileRoute("/_authenticated/admin/teevi")({
  head: () => ({
    meta: [{ title: "InDi TeeVi — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminTeeviPage,
});

function AdminTeeviPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: videos = [], isLoading } = useQuery<TeeviVideo[]>({
    queryKey: ["admin-teevi-videos"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teevi_videos")
        .select("id, title, video_url, summary, tags, published, author_id, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as TeeviVideo[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-teevi-videos"] });
    qc.invalidateQueries({ queryKey: ["teevi-videos"] });
    qc.invalidateQueries({ queryKey: ["wall-compact-teasers"] });
  };

  const togglePublished = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from("teevi_videos").update({ published: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error((e as Error).message),
  });

  const removeVideo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teevi_videos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vidéo supprimée");
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ShieldAlert className="mx-auto mb-3 size-10 text-destructive" />
        <p className="text-muted-foreground">Cette page est réservée aux administrateurs.</p>
      </main>
    );
  }

  const q = search.trim().toLowerCase();
  const filtered = videos.filter((v) =>
    !q ? true : `${v.title} ${v.summary ?? ""} ${(v.tags ?? []).join(" ")}`.toLowerCase().includes(q),
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-3xl font-black">
        <Tv className="size-7 text-primary" /> InDi TeeVi
      </h1>
      <p className="mt-1 text-muted-foreground">
        Toutes les vidéos. Ajoute, modifie, publie, dépublie ou supprime une vidéo.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une vidéo, un tag…"
          className="h-9 min-w-[200px] flex-1"
        />
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" /> Nouvelle vidéo
          </Button>
        )}
      </div>

      {creating && (
        <div className="mt-4">
          <TeeviVideoEditor
            onDone={() => {
              setCreating(false);
              invalidate();
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">Aucune vidéo.</p>
      ) : (
        <>
          <p className="mt-4 text-xs font-semibold text-muted-foreground">
            {filtered.length} vidéo(s) · {filtered.filter((v) => v.published).length} publiée(s)
          </p>
          <ul className="mt-2 space-y-2">
            {filtered.map((v) =>
              editingId === v.id ? (
                <li key={v.id}>
                  <TeeviVideoEditor
                    video={v}
                    onDone={() => {
                      setEditingId(null);
                      invalidate();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!v.published && (
                        <span className="rounded-full border-2 border-destructive px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-destructive">
                          Dépubliée
                        </span>
                      )}
                      {(v.tags ?? []).map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-primary/60 bg-primary/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <Link
                      to="/indi-teevi/$videoId"
                      params={{ videoId: v.id }}
                      className="mt-1 flex items-center gap-1 font-bold hover:underline"
                    >
                      {v.title} <ExternalLink className="size-3 shrink-0" />
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleDateString("fr-FR")} · {v.video_url}
                    </p>
                    {v.summary && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{v.summary}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={v.published}
                      onCheckedChange={(val) => togglePublished.mutate({ id: v.id, value: val })}
                      aria-label="Publier la vidéo"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Modifier la vidéo"
                      onClick={() => setEditingId(v.id)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Supprimer la vidéo"
                      onClick={() => {
                        if (confirm(`Supprimer « ${v.title} » ?`)) removeVideo.mutate(v.id);
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ),
            )}
          </ul>
        </>
      )}
    </main>
  );
}
