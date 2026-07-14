import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRouterState } from "@tanstack/react-router";
import { parseHashTargets } from "@/lib/notif-navigate";
import { useAuth } from "@/hooks/use-auth";
import { UserBadge } from "@/components/UserBadge";
import { Button } from "@/components/ui/button";
import { MentionTextarea } from "@/components/mentions/MentionTextarea";
import { toast } from "sonner";
import { Pencil, Trash2, Check, X, Heart, MessageCircle, Pin, PinOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface PostRow {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  pinned_at: string | null;
  pin_label: string | null;
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

interface CommentRow {
  id: string;
  post_id: string;
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
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [pinDialogFor, setPinDialogFor] = useState<string | null>(null);
  const [pinLabelDraft, setPinLabelDraft] = useState("");
  const hash = useRouterState({ select: (s) => s.location.hash });
  const listRef = useRef<HTMLUListElement | null>(null);

  // Auto-open the thread targeted by a notification hash like `post-<id>|c-<cid>`
  useEffect(() => {
    const { primary } = parseHashTargets(hash);
    if (!primary || !primary.startsWith("post-")) return;
    const postId = primary.slice("post-".length);
    if (postId) setOpenThread(postId);
  }, [hash]);

  const { data: posts = [] } = useQuery<PostRow[]>({
    queryKey: ["wall-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, author_id, content, created_at, pinned_at, pin_label, author:profiles!posts_author_id_fkey(id, pseudo, role, is_certified, is_team_indi, badges, level)")
        .order("pinned_at", { ascending: false, nullsFirst: false })
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
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => {
        qc.invalidateQueries({ queryKey: ["wall-likes"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, () => {
        qc.invalidateQueries({ queryKey: ["wall-comments"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const { data: likes = [] } = useQuery<{ post_id: string; user_id: string }[]>({
    queryKey: ["wall-likes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("post_likes").select("post_id, user_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: comments = [] } = useQuery<CommentRow[]>({
    queryKey: ["wall-comments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_comments")
        .select("id, post_id, author_id, content, created_at, author:profiles!post_comments_author_id_fkey(id, pseudo, role, is_certified, is_team_indi, badges, level)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CommentRow[];
    },
  });

  const toggleLike = useMutation({
    mutationFn: async (postId: string) => {
      if (!session) return;
      const uid = session.user.id;
      const already = likes.some((l) => l.post_id === postId && l.user_id === uid);
      if (already) {
        const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", uid);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: uid });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wall-likes"] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const addComment = useMutation({
    mutationFn: async ({ postId, text }: { postId: string; text: string }) => {
      if (!session || !text.trim()) return;
      const { error } = await supabase.from("post_comments").insert({
        post_id: postId,
        author_id: session.user.id,
        content: text.trim(),
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      setReplyDraft((r) => ({ ...r, [v.postId]: "" }));
      qc.invalidateQueries({ queryKey: ["wall-comments"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("post_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wall-comments"] }),
    onError: (e) => toast.error((e as Error).message),
  });

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

  const setPin = useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string | null }) => {
      const { error } = await supabase
        .from("posts")
        .update({
          pinned_at: label ? new Date().toISOString() : null,
          pin_label: label,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.label ? "Message épinglé" : "Message désépinglé");
      setPinDialogFor(null);
      setPinLabelDraft("");
      qc.invalidateQueries({ queryKey: ["wall-posts"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const SCROLL_KEY = "wall-scroll-pos";
  const hasPosts = posts.length > 0;

  // Restore saved scroll position once the list has content.
  useEffect(() => {
    if (!hasPosts) return;
    const el = listRef.current;
    if (!el) return;
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved == null) return;
    const y = Number(saved);
    if (Number.isNaN(y)) return;
    requestAnimationFrame(() => { el.scrollTop = y; });
  }, [hasPosts]);

  // Persist scroll position as the user scrolls (throttled via rAF).
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        sessionStorage.setItem(SCROLL_KEY, String(el.scrollTop));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

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

      <ul
        ref={listRef}
        className="max-h-[28rem] space-y-2 overflow-y-auto rounded-lg border border-border bg-background/40 p-2 pr-3"
      >
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
          const isPinned = !!p.pinned_at;
          return (
            <li
              key={p.id}
              id={`post-${p.id}`}
              className={`card-brut scroll-mt-24 p-3 ${isPinned ? "border-2 border-primary/70 bg-primary/5" : ""}`}
            >
              {isPinned && (
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                    <Pin className="size-3" />
                    {p.pin_label || "Épinglé"}
                  </span>
                </div>
              )}
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
                  {(canEdit || canDelete || isAdmin) && (
                    <div className="mt-2 flex justify-end gap-1">
                      {isAdmin && !isPinned && (
                        <button
                          onClick={() => { setPinDialogFor(p.id); setPinLabelDraft(""); }}
                          className="rounded p-1 text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                          aria-label="Épingler"
                          title="Épingler"
                        >
                          <Pin className="size-3.5" />
                        </button>
                      )}
                      {isAdmin && isPinned && (
                        <button
                          onClick={() => setPin.mutate({ id: p.id, label: null })}
                          className="rounded p-1 text-primary hover:bg-destructive hover:text-destructive-foreground"
                          aria-label="Désépingler"
                          title="Désépingler"
                        >
                          <PinOff className="size-3.5" />
                        </button>
                      )}
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
                  {pinDialogFor === p.id && (
                    <div className="mt-2 rounded border border-primary/60 bg-primary/5 p-2 space-y-2">
                      <div className="text-[11px] font-semibold text-primary">Libellé du badge</div>
                      <div className="flex flex-wrap gap-1">
                        {["Indi Adore !", "Une info Indi", "Une question pour vous", "À la une"].map((preset) => (
                          <button
                            key={preset}
                            onClick={() => setPinLabelDraft(preset)}
                            className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] hover:bg-muted"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                      <input
                        value={pinLabelDraft}
                        onChange={(e) => setPinLabelDraft(e.target.value)}
                        placeholder="Libellé personnalisé…"
                        maxLength={40}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => { setPinDialogFor(null); setPinLabelDraft(""); }}>
                          <X className="size-3.5" /> Annuler
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setPin.mutate({ id: p.id, label: (pinLabelDraft.trim() || "Épinglé") })}
                          disabled={setPin.isPending}
                        >
                          <Pin className="size-3.5" /> Épingler
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
              {!isEditing && (() => {
                const postLikes = likes.filter((l) => l.post_id === p.id);
                const liked = !!session && postLikes.some((l) => l.user_id === session.user.id);
                const postComments = comments.filter((c) => c.post_id === p.id);
                const isOpen = openThread === p.id;
                return (
                  <div className="mt-2 border-t border-border pt-2">
                    <div className="flex items-center gap-3 text-xs">
                      <button
                        onClick={() => requireAuth(() => toggleLike.mutate(p.id))}
                        className={`inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-muted ${liked ? "text-primary" : "text-muted-foreground"}`}
                        aria-label="J'aime"
                      >
                        <Heart className={`size-3.5 ${liked ? "fill-current" : ""}`} />
                        <span>{postLikes.length}</span>
                      </button>
                      <button
                        onClick={() => setOpenThread(isOpen ? null : p.id)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-muted-foreground hover:bg-muted"
                        aria-label="Répondre"
                      >
                        <MessageCircle className="size-3.5" />
                        <span>{postComments.length}</span>
                      </button>
                    </div>
                    {isOpen && (
                      <div className="mt-2 space-y-2">
                        {postComments.map((c) => {
                          const canDelC = session?.user.id === c.author_id || isAdmin;
                          return (
                            <div
                              key={c.id}
                              id={`comment-${c.id}`}
                              className="scroll-mt-24 rounded border border-border bg-muted/30 p-2 transition"
                            >
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <UserBadge profile={c.author} className="text-[11px]" />
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap text-xs">{renderMentions(c.content)}</p>
                              {canDelC && (
                                <div className="mt-1 flex justify-end">
                                  <button
                                    onClick={() => { if (confirm("Supprimer cette réponse ?")) deleteComment.mutate(c.id); }}
                                    className="rounded p-0.5 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                                    aria-label="Supprimer"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div className="flex gap-2">
                          <MentionTextarea
                            value={replyDraft[p.id] ?? ""}
                            onChange={(e) => setReplyDraft((r) => ({ ...r, [p.id]: e.target.value }))}
                            placeholder={session ? "Écris une réponse…" : "Connecte-toi pour répondre"}
                            onFocus={() => { if (!session) requireAuth(() => {}); }}
                            rows={1}
                            className="min-h-[38px] resize-none text-xs"
                            disabled={!session}
                          />
                          <Button
                            size="sm"
                            onClick={() => requireAuth(() => addComment.mutate({ postId: p.id, text: replyDraft[p.id] ?? "" }))}
                            disabled={!(replyDraft[p.id] ?? "").trim() || addComment.isPending}
                          >
                            Envoyer
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </li>
          );
        })}
      </ul>
    </section>
  );
}