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
import { ShieldAlert, Loader2, Feather, Trash2, ExternalLink } from "lucide-react";
import {
  VillageCategoryBadge,
  FreeTagBadge,
} from "@/components/village/VillageCategory";

export const Route = createFileRoute("/_authenticated/admin/redak-village")({
  head: () => ({
    meta: [{ title: "RéDaK'Village — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminVillagePage,
});

type AdminArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_url: string | null;
  category: string | null;
  free_tag: string | null;
  visibility: string;
  published: boolean;
  created_at: string;
  author: { id: string; pseudo: string; stage_name: string | null } | null;
};

function AdminVillagePage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: articles = [], isLoading } = useQuery<AdminArticle[]>({
    queryKey: ["admin-village-articles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("village_articles")
        .select(
          "id, title, slug, excerpt, cover_url, category, free_tag, visibility, published, created_at, author:profiles!village_articles_author_id_fkey(id, pseudo, stage_name)",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as AdminArticle[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-village-articles"] });
    qc.invalidateQueries({ queryKey: ["village-articles"] });
    qc.invalidateQueries({ queryKey: ["wall-compact-teasers"] });
  };

  const togglePublished = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("village_articles")
        .update({ published: value } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error((e as Error).message),
  });

  const removeArticle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("village_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Article supprimé");
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
  const filtered = articles.filter((a) =>
    !q
      ? true
      : `${a.title} ${a.author?.stage_name ?? ""} ${a.author?.pseudo ?? ""} ${a.free_tag ?? ""}`
          .toLowerCase()
          .includes(q),
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-3xl font-black">
        <Feather className="size-7 text-primary" /> RéDaK'Village
      </h1>
      <p className="mt-1 text-muted-foreground">
        Tous les articles de la communauté. Publie, dépublie ou supprime un article.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-card p-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un article, un rédacteur, un tag…"
          className="h-9"
        />
      </div>

      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">Aucun article.</p>
      ) : (
        <>
          <p className="mt-4 text-xs font-semibold text-muted-foreground">
            {filtered.length} article(s) · {filtered.filter((a) => a.published).length} publié(s)
          </p>
          <ul className="mt-2 space-y-2">
            {filtered.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                {a.cover_url && (
                  <SmartImg
                    src={a.cover_url}
                    width={56}
                    height={56}
                    className="size-14 shrink-0 rounded-md object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <VillageCategoryBadge category={a.category} />
                    <FreeTagBadge tag={a.free_tag} />
                    {!a.published && (
                      <span className="rounded-full border-2 border-destructive px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-destructive">
                        Dépublié
                      </span>
                    )}
                  </div>
                  <Link
                    to="/redak-village/$slug"
                    params={{ slug: a.slug }}
                    className="mt-1 flex items-center gap-1 font-bold hover:underline"
                  >
                    {a.title} <ExternalLink className="size-3 shrink-0" />
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {a.author?.stage_name || a.author?.pseudo || "—"} ·{" "}
                    {new Date(a.created_at).toLocaleDateString("fr-FR")}
                  </p>
                  {a.excerpt && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.excerpt}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={a.published}
                    onCheckedChange={(v) => togglePublished.mutate({ id: a.id, value: v })}
                    aria-label="Publier l'article"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Supprimer l'article"
                    onClick={() => {
                      if (confirm(`Supprimer « ${a.title} » ?`)) removeArticle.mutate(a.id);
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
