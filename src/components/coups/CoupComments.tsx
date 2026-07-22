import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ReportButton } from "@/components/moderation/ReportButton";
import { TranslatedText } from "@/components/i18n/TranslatedText";

type Props = { coupId: string };

type Row = {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
  parent_id: string | null;
  pseudo?: string;
};

export function CoupComments({ coupId }: Props) {
  const { session, requireAuth } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"pertinence" | "recent">("pertinence");
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const key = ["coup-comments", coupId];

  useEffect(() => {
    const ch = supabase
      .channel(`coup-com-${coupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "content_comments", filter: `content_id=eq.${coupId}` },
        () => qc.invalidateQueries({ queryKey: key }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coupId, qc]);

  const { data: comments = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data } = await supabase
        .from("content_comments")
        .select("id, body, author_id, created_at, parent_id")
        .eq("content_type", "coup_de_coeur")
        .eq("content_id", coupId)
        .order("created_at", { ascending: true })
        .limit(300);
      const rows = (data ?? []) as Row[];
      const ids = Array.from(new Set(rows.map((r) => r.author_id)));
      let pseudos: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, pseudo").in("id", ids);
        pseudos = Object.fromEntries((profs ?? []).map((p) => [p.id, p.pseudo]));
      }
      return rows.map((r) => ({ ...r, pseudo: pseudos[r.author_id] ?? "auditeur" }));
    },
  });

  const add = useMutation({
    mutationFn: async (opts: { body: string; parentId: string | null }) => {
      if (!session || !opts.body.trim()) return;
      const { error } = await supabase.from("content_comments").insert({
        content_type: "coup_de_coeur",
        content_id: coupId,
        author_id: session.user.id,
        body: opts.body.trim(),
        parent_id: opts.parentId,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      if (vars.parentId) { setReplyText(""); setReplyTo(null); }
      else setText("");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const { roots, childrenOf } = useMemo(() => {
    const byParent = new Map<string, Row[]>();
    for (const c of comments) {
      if (c.parent_id) {
        const arr = byParent.get(c.parent_id) ?? [];
        arr.push(c);
        byParent.set(c.parent_id, arr);
      }
    }
    const rootRows = comments.filter((c) => !c.parent_id);
    if (sortBy === "recent") {
      rootRows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else {
      rootRows.sort((a, b) => {
        const diff = (byParent.get(b.id)?.length ?? 0) - (byParent.get(a.id)?.length ?? 0);
        return diff !== 0 ? diff : b.created_at.localeCompare(a.created_at);
      });
    }
    return { roots: rootRows, childrenOf: (id: string) => byParent.get(id) ?? [] };
  }, [comments, sortBy]);

  const total = comments.length;

  return (
    <div className="border-t border-border pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary"
        >
          <MessageCircle className="size-4" />
          {total} commentaire{total > 1 ? "s" : ""}
          <span className="text-muted-foreground">— {open ? "masquer" : "afficher"}</span>
        </button>
        {open && (
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-muted-foreground">Trier :</span>
            <button
              onClick={() => setSortBy("pertinence")}
              className={cn("rounded px-2 py-0.5", sortBy === "pertinence" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              Pertinence
            </button>
            <button
              onClick={() => setSortBy("recent")}
              className={cn("rounded px-2 py-0.5", sortBy === "recent" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              Récents
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          {session ? (
            <div className="space-y-2">
              <Textarea
                rows={2}
                placeholder="Écris un commentaire…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <Button
                size="sm"
                disabled={add.isPending || !text.trim()}
                onClick={() => add.mutate({ body: text, parentId: null })}
              >
                Publier
              </Button>
            </div>
          ) : (
            <button onClick={() => requireAuth(() => {})} className="text-xs text-primary underline">
              Connecte-toi pour commenter
            </button>
          )}

          {roots.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun commentaire pour le moment.</p>
          ) : (
            <ul className="space-y-2">
              {roots.map((c) => (
                <li key={c.id} className="rounded border border-border p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{c.pseudo}</span>
                    <span className="text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <TranslatedText
                    entityType="content_comment"
                    entityKey={c.id}
                    field="body"
                    text={c.body}
                    as="p"
                    className="mt-1 whitespace-pre-wrap text-foreground/90"
                  />
                  <div className="mt-1 flex items-center gap-3">
                    {session && (
                      <button
                        onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(""); }}
                        className="text-[10px] text-muted-foreground hover:text-primary"
                      >
                        Répondre
                      </button>
                    )}
                    {session?.user.id === c.author_id && (
                      <button
                        onClick={() => del.mutate(c.id)}
                        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3" /> Supprimer
                      </button>
                    )}
                    {session && session.user.id !== c.author_id && (
                      <ReportButton commentType="content_comment" commentId={c.id} />
                    )}
                  </div>

                  {replyTo === c.id && session && (
                    <div className="mt-2 space-y-1">
                      <Textarea
                        rows={2}
                        placeholder="Ta réponse…"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={add.isPending || !replyText.trim()}
                          onClick={() => add.mutate({ body: replyText, parentId: c.id })}
                        >
                          Répondre
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setReplyTo(null); setReplyText(""); }}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}

                  {childrenOf(c.id).length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {childrenOf(c.id).map((r) => (
                        <li key={r.id} className="ml-4 rounded border border-border bg-muted/30 p-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{r.pseudo}</span>
                            <span className="text-muted-foreground">
                              {new Date(r.created_at).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                          <TranslatedText
                            entityType="content_comment"
                            entityKey={r.id}
                            field="body"
                            text={r.body}
                            as="p"
                            className="mt-1 whitespace-pre-wrap text-foreground/90"
                          />
                          <div className="mt-1 flex items-center gap-3">
                            {session?.user.id === r.author_id && (
                              <button
                                onClick={() => del.mutate(r.id)}
                                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3" /> Supprimer
                              </button>
                            )}
                            {session && session.user.id !== r.author_id && (
                              <ReportButton commentType="content_comment" commentId={r.id} />
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}