import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { UserBadge } from "@/components/UserBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MentionTextarea } from "@/components/mentions/MentionTextarea";
import { toast } from "sonner";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface PostRow {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    pseudo: string;
    role: "admin" | "artiste" | "animateur" | "auditeur";
    is_certified: boolean;
    is_team_indi: boolean;
    badges: string[];
    level: number;
  } | null;
}

const MENTION_RE = /@([\p{L}\p{N}_.-]+)/gu;

function renderMentions(content: string) {
  const parts = content.split(/(@[\p{L}\p{N}_.-]+)/gu);
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <span key={i} className="mention">{p}</span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function SocialWall() {
  const { session, requireAuth, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const { data: posts = [] } = useQuery<PostRow[]>({
    queryKey: ["wall-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, author_id, content, created_at, author:profiles!posts_author_id_fkey(id, pseudo, role, is_certified, is_team_indi, badges, level)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as PostRow[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("posts-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => {
        qc.invalidateQueries({ queryKey: ["wall-posts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const create = useMutation({
    mutationFn: async () => {
      if (!session || !content.trim()) return;
      const mentions = Array.from(content.matchAll(MENTION_RE)).map((m) => m[1]);
      const { error } = await supabase.from("posts").insert({
        author_id: session.user.id,
        content: content.trim(),
        mentions,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      toast.success("Ton message est en ligne — +2 pts");
      qc.invalidateQueries({ queryKey: ["wall-posts"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const mentions = Array.from(content.matchAll(MENTION_RE)).map((m) => m[1]);
      const { error } = await supabase.from("posts").update({ content, mentions }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      toast.success("Message modifié");
      qc.invalidateQueries({ queryKey: ["wall-posts"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message supprimé");
      qc.invalidateQueries({ queryKey: ["wall-posts"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="section-title">En direct avec les auditeurs</h2>
      </div>

      <div className="card-brut p-3 border-2 border-primary ring-1 ring-primary/30">
        <MentionTextarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={session ? "Balance ton message…  utilise @pseudo pour mentionner" : "Connecte-toi pour poster"}
          onFocus={() => { if (!session) requireAuth(() => {}); }}
          rows={2}
          className="resize-none border-0 bg-transparent placeholder:font-semibold placeholder:text-foreground placeholder:opacity-100 disabled:opacity-100 focus-visible:ring-0"
          disabled={!session}
        />
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            onClick={() => requireAuth(() => create.mutate())}
            disabled={!content.trim() || create.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            Publier
          </Button>
        </div>
      </div>

      <ul className="space-y-2">
        {posts.length === 0 && (
          <li className="card-brut p-4 text-center text-sm text-muted-foreground">
            Le mur est vide — sois le premier à écrire !
          </li>
        )}
        {posts.map((p) => {
          const isOwner = session?.user.id === p.author_id;
          const canEdit = isOwner;
          const canDelete = isOwner || isAdmin;
          const isEditing = editingId === p.id;
          return (
            <li key={p.id} className="card-brut p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <UserBadge profile={p.author} className="text-xs" />
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: fr })}
                </span>
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <MentionTextarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="size-3.5" /> Annuler
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updatePost.mutate({ id: p.id, content: editContent.trim() })}
                      disabled={!editContent.trim() || updatePost.isPending}
                    >
                      <Check className="size-3.5" /> Enregistrer
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm">{renderMentions(p.content)}</p>
                  {(canEdit || canDelete) && (
                    <div className="mt-2 flex justify-end gap-1">
                      {canEdit && (
                        <button
                          onClick={() => { setEditingId(p.id); setEditContent(p.content); }}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Modifier"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => { if (confirm("Supprimer ce message ?")) deletePost.mutate(p.id); }}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}