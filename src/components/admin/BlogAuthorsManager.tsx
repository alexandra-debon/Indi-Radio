import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, UserPlus, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBlogAuthors } from "@/hooks/use-blog-authors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Gestion (admin only) des personnes autorisées à publier sur le
 * Blog InDi ArT CulTuRe. L'administrateur peut toujours publier.
 */
export function BlogAuthorsManager() {
  const { session, isAdmin } = useAuth();
  const qc = useQueryClient();
  const { data: authors = [] } = useBlogAuthors();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: results = [] } = useQuery({
    queryKey: ["blog-authors-search", search],
    enabled: isAdmin && search.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,pseudo,role")
        .ilike("pseudo", `%${search.trim()}%`)
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("blog_authors")
        .insert({ user_id: userId, granted_by: session?.user.id ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Auteur ajouté au blog");
      setSearch("");
      qc.invalidateQueries({ queryKey: ["blog-authors"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("blog_authors").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Auteur retiré");
      qc.invalidateQueries({ queryKey: ["blog-authors"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!isAdmin) return null;

  return (
    <div className="card-brut p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-left"
      >
        <span className="flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">Auteurs autorisés du blog ({authors.length})</span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Seul l'admin et les personnes de cette liste peuvent publier ou modifier des articles.
            Les likes, commentaires et partages restent ouverts à tous les utilisateurs connectés.
          </p>

          <div className="space-y-1.5">
            <Input
              lang="fr"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher un pseudo à autoriser…"
              className="text-xs"
            />
            {results.length > 0 && (
              <ul className="divide-y divide-border rounded-md border-2 border-border">
                {results
                  .filter((r) => !authors.some((a) => a.user_id === r.id))
                  .map((r) => (
                    <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-2">
                      <span className="min-w-0 truncate text-xs font-semibold">
                        {r.pseudo ?? "—"} <span className="text-muted-foreground">· {r.role}</span>
                      </span>
                      <Button size="sm" className="shrink-0" onClick={() => add.mutate(r.id)} disabled={add.isPending}>
                        <UserPlus className="h-3.5 w-3.5" /> Autoriser
                      </Button>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {authors.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Aucun auteur ajouté — seul l'admin publie.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border-2 border-border">
              {authors.map((a) => (
                <li key={a.user_id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-2">
                  <span className="min-w-0 truncate text-xs font-semibold">
                    {a.profile?.pseudo ?? a.user_id.slice(0, 8)}
                    {a.profile?.role && <span className="text-muted-foreground"> · {a.profile.role}</span>}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => remove.mutate(a.user_id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Retirer
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
