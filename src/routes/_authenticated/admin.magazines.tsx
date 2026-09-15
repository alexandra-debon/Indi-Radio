import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { SmartImg } from "@/components/media/SmartImg";
import { toast } from "@/lib/toast";
import { ShieldAlert, Loader2, BookOpen, Trash2, ExternalLink } from "lucide-react";
import { flipHtml5ThumbnailUrl } from "@/lib/fliphtml5";

export const Route = createFileRoute("/_authenticated/admin/magazines")({
  head: () => ({
    meta: [{ title: "Magazines — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminMagazinesPage,
});

type AdminMagazine = {
  id: string;
  title: string;
  body: string | null;
  cover_url: string | null;
  magazine_url: string;
  published: boolean;
  created_at: string;
  author: { id: string; pseudo: string; stage_name: string | null } | null;
};

function AdminMagazinesPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: entries = [], isLoading } = useQuery<AdminMagazine[]>({
    queryKey: ["admin-magazine-entries"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("magazine_entries")
        .select(
          "id, title, body, cover_url, magazine_url, published, created_at, author:profiles!magazine_entries_author_id_fkey(id, pseudo, stage_name)",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as AdminMagazine[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-magazine-entries"] });
    qc.invalidateQueries({ queryKey: ["magazine-entries"] });
    qc.invalidateQueries({ queryKey: ["wall-compact-teasers"] });
  };

  const togglePublished = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("magazine_entries")
        .update({ published: value } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error((e as Error).message),
  });

  const removeEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("magazine_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Magazine supprimé");
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
  const filtered = entries.filter((e) =>
    !q
      ? true
      : `${e.title} ${e.author?.stage_name ?? ""} ${e.author?.pseudo ?? ""}`
          .toLowerCase()
          .includes(q),
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-3xl font-black">
        <BookOpen className="size-7 text-primary" /> Magazines
      </h1>
      <p className="mt-1 text-muted-foreground">
        Tous les articles magazine. Publie, dépublie ou supprime un article.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-card p-4">
        <Input
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
          placeholder="Rechercher un magazine, un auteur…"
          className="h-9"
        />
      </div>

      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">Aucun magazine.</p>
      ) : (
        <>
          <p className="mt-4 text-xs font-semibold text-muted-foreground">
            {filtered.length} magazine(s) · {filtered.filter((e) => e.published).length} publié(s)
          </p>
          <ul className="mt-2 space-y-2">
            {filtered.map((e) => {
              const thumb = e.cover_url || flipHtml5ThumbnailUrl(e.magazine_url);
              return (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  {thumb &&
                    (e.cover_url ? (
                      <SmartImg
                        src={thumb}
                        width={56}
                        height={56}
                        className="size-14 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <img
                        src={thumb}
                        alt=""
                        loading="lazy"
                        className="size-14 shrink-0 rounded-md object-contain"
                      />
                    ))}
                  <div className="min-w-0 flex-1">
                    {!e.published && (
                      <span className="rounded-full border-2 border-destructive px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-destructive">
                        Dépublié
                      </span>
                    )}
                    <Link
                      to="/magazines/$magazineId"
                      params={{ magazineId: e.id }}
                      className="mt-1 flex items-center gap-1 font-bold hover:underline"
                    >
                      {e.title} <ExternalLink className="size-3 shrink-0" />
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {e.author?.stage_name || e.author?.pseudo || "—"} ·{" "}
                      {new Date(e.created_at).toLocaleDateString("fr-FR")}
                    </p>
                    {e.body && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{e.body}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={e.published}
                      onCheckedChange={(v) => togglePublished.mutate({ id: e.id, value: v })}
                      aria-label="Publier le magazine"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Supprimer le magazine"
                      onClick={() => {
                        if (confirm(`Supprimer « ${e.title} » ?`)) removeEntry.mutate(e.id);
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
