import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { useLang } from "@/lib/i18n";
import { Loader2, Trash2, ExternalLink } from "lucide-react";

export type ManagedPost = {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  visibility: string;
};

const TXT = {
  fr: {
    empty: "Tu n'as encore publié aucune publication.",
    loading: "Chargement…",
    deleted: "Publication supprimée",
    confirm: "Supprimer définitivement cette publication ?",
    visibility: "Diffusion de la publication",
    feed: "Mur général + ma page",
    profile_only: "Ma page uniquement",
    followers_only: "Réservé à mes abonnés",
    open: "Voir la publication",
    hint: "Toutes tes publications sont listées ici, quelle que soit leur diffusion : tu peux changer leur visibilité ou les supprimer à tout moment.",
    count: (n: number) => `${n} publication${n > 1 ? "s" : ""}`,
  },
  en: {
    empty: "You haven't posted anything yet.",
    loading: "Loading…",
    deleted: "Post deleted",
    confirm: "Permanently delete this post?",
    visibility: "Post visibility",
    feed: "Main wall + my page",
    profile_only: "My page only",
    followers_only: "Followers only",
    open: "View post",
    hint: "Every post you wrote is listed here, whatever its visibility: you can change it or delete the post at any time.",
    count: (n: number) => `${n} post${n > 1 ? "s" : ""}`,
  },
} as const;

/** Liste de gestion de TOUTES les publications d'un membre (feed, page, abonnés). */
export function MyPostsManager({ userId, limit = 100 }: { userId: string; limit?: number }) {
  const { lang } = useLang();
  const t = TXT[lang === "en" ? "en" : "fr"];
  const qc = useQueryClient();

  const { data: posts = [], isLoading } = useQuery<ManagedPost[]>({
    queryKey: ["my-posts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, content, created_at, visibility")
        .eq("author_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ManagedPost[];
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["my-posts"] });
    qc.invalidateQueries({ queryKey: ["artist-own-posts"] });
    qc.invalidateQueries({ queryKey: ["wall-posts"] });
    qc.invalidateQueries({ queryKey: ["artist-posts-public"] });
  }

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.deleted);
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const setVisibility = useMutation({
    mutationFn: async ({ id, visibility }: { id: string; visibility: string }) => {
      const { error } = await supabase.from("posts").update({ visibility } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> {t.loading}
      </p>
    );
  }

  if (posts.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.empty}</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">{t.hint}</p>
      <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {t.count(posts.length)}
      </div>
      <ul className="space-y-2">
        {posts.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2 border-2 border-border p-2 text-sm">
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{p.title || p.content.slice(0, 60) || "—"}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(p.created_at).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR")}
              </div>
            </div>
            <select
              aria-label={t.visibility}
              value={p.visibility}
              onChange={(e) => setVisibility.mutate({ id: p.id, visibility: e.target.value })}
              className="border-2 border-border bg-background px-2 py-1 text-xs font-semibold"
            >
              <option value="feed">{t.feed}</option>
              <option value="profile_only">{t.profile_only}</option>
              <option value="followers_only">{t.followers_only}</option>
            </select>
            <Link
              to="/p/$postId"
              params={{ postId: p.id }}
              aria-label={t.open}
              title={t.open}
              className="inline-flex size-8 items-center justify-center border-2 border-border"
            >
              <ExternalLink className="size-4" />
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              aria-label={t.confirm}
              onClick={() => {
                if (window.confirm(t.confirm)) deletePost.mutate(p.id);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
