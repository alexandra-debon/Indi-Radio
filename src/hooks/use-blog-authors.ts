import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type BlogAuthorRow = {
  user_id: string;
  created_at: string;
  profile: { id: string; pseudo: string | null; role: string } | null;
};

/** Liste des auteurs autorisés à publier sur le Blog InDi ArT CulTuRe. */
export function useBlogAuthors() {
  const { session } = useAuth();
  return useQuery<BlogAuthorRow[]>({
    queryKey: ["blog-authors"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_authors")
        .select("user_id,created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,pseudo,role")
        .in("id", rows.map((r) => r.user_id));
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({
        user_id: r.user_id,
        created_at: r.created_at,
        profile: (byId.get(r.user_id) as BlogAuthorRow["profile"]) ?? null,
      }));
    },
  });
}

/**
 * Droit de publication sur le blog : administrateur, ou personne explicitement
 * ajoutée à la liste des auteurs par l'administrateur.
 * La règle est doublée côté base par la policy RLS `can_publish_news`.
 */
export function useCanPublishNews() {
  const { session, isAdmin } = useAuth();
  const { data: authors = [], isLoading } = useBlogAuthors();
  const isBlogAuthor = !!session && authors.some((a) => a.user_id === session.user.id);
  return { canPublish: isAdmin || isBlogAuthor, isLoading: !!session && isLoading };
}
