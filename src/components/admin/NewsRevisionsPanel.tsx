import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { History, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

interface Revision {
  id: string;
  created_at: string;
  title: string;
  content: string;
  image_url: string | null;
  image_urls: string[] | null;
  image_captions: string[] | null;
  social_links: unknown;
  embed_url: string | null;
  embed_height: number | null;
  scheduled_at: string | null;
}

interface CurrentPost {
  id: string;
  title: string;
  content: string;
}

/**
 * Historique des versions d'un article du blog : chaque modification archive
 * automatiquement l'état précédent (trigger base). Comparaison côte à côte
 * avec la version actuelle et restauration en un clic.
 */
export function NewsRevisionsPanel({ post }: { post: CurrentPost }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { data: revisions = [] } = useQuery<Revision[]>({
    queryKey: ["news-revisions", post.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_post_revisions")
        .select(
          "id,created_at,title,content,image_url,image_urls,image_captions,social_links,embed_url,embed_height,scheduled_at",
        )
        .eq("news_post_id", post.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as unknown as Revision[];
    },
  });

  const restore = useMutation({
    mutationFn: async (rev: Revision) => {
      const { error } = await supabase
        .from("news_posts")
        .update({
          title: rev.title,
          content: rev.content,
          image_url: rev.image_url,
          image_urls: rev.image_urls ?? [],
          image_captions: rev.image_captions ?? [],
          social_links: (rev.social_links ?? {}) as never,
          embed_url: rev.embed_url,
          embed_height: rev.embed_height,
          scheduled_at: rev.scheduled_at,
        })
        .eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Version restaurée");
      qc.invalidateQueries({ queryKey: ["news-posts"] });
      qc.invalidateQueries({ queryKey: ["news-revisions", post.id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const current = revisions.find((r) => r.id === selected);

  return (
    <div className="mt-2 rounded border border-dashed border-border/70 p-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <History className="size-3.5" /> Historique des versions
        </span>
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {revisions.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              Aucune version antérieure — l'article n'a pas encore été modifié.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded border border-border">
              {revisions.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => setSelected(selected === r.id ? null : r.id)}
                    className="min-w-0 flex-1 truncate text-left text-[11px]"
                  >
                    <span className="font-semibold">
                      {new Date(r.created_at).toLocaleString("fr-FR")}
                    </span>
                    <span className="text-muted-foreground"> — {r.title}</span>
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 shrink-0 text-[10px]"
                    onClick={() => {
                      if (confirm("Restaurer cette version de l'article ?")) restore.mutate(r);
                    }}
                    disabled={restore.isPending}
                  >
                    <RotateCcw className="mr-1 size-3" /> Restaurer
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {current && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded border border-border bg-muted/30 p-2">
                <p className="mb-1 text-[9px] font-bold uppercase text-muted-foreground">
                  Version du {new Date(current.created_at).toLocaleString("fr-FR")}
                </p>
                <p className="text-[11px] font-bold">{current.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">
                  {current.content}
                </p>
              </div>
              <div className="rounded border border-primary/60 bg-primary/5 p-2">
                <p className="mb-1 text-[9px] font-bold uppercase text-primary">Version actuelle</p>
                <p className="text-[11px] font-bold">{post.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">
                  {post.content}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
