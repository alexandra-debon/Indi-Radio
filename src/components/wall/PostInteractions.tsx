import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { UserBadge } from "@/components/UserBadge";
import { Button } from "@/components/ui/button";
import { MentionTextarea } from "@/components/mentions/MentionTextarea";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/plausible";
import { Heart, MessageCircle, Trash2, ArrowUpRight, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { UrlEmbeds } from "@/components/media/UrlEmbeds";
import { ShareButton } from "@/components/share/ShareButton";
import { CommentLikeButton } from "@/components/CommentLikeButton";
import { ReportButton } from "@/components/moderation/ReportButton";
import { Input } from "@/components/ui/input";
import { isValidVideoUrl, stripMediaUrls } from "@/lib/media-embed";
import { MultiImageUploader } from "@/components/media/MultiImageUploader";
import { renderRich } from "@/lib/rich-text";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { useLang, useT } from "@/lib/i18n";
import { SmartImg } from "@/components/media/SmartImg";

export interface PostCommentRow {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  image_urls: string[] | null;
  image_captions: string[] | null;
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

export function usePostInteractions(postIds: string[]) {
  const idsKey = [...postIds].sort().join(",");
  const likesQuery = useQuery<{ post_id: string; user_id: string }[]>({
    queryKey: ["post-likes", idsKey],
    enabled: postIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("post_likes").select("post_id, user_id").in("post_id", idsKey.split(","));
      if (error) throw error;
      return data ?? [];
    },
  });
  const commentsQuery = useQuery<PostCommentRow[]>({
    queryKey: ["post-comments", idsKey],
    enabled: postIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_comments")
        .select("id, post_id, author_id, content, created_at, image_urls, image_captions, author:profiles!post_comments_author_id_fkey(id, pseudo, role, is_certified, is_team_indi, badges, level)")
        .in("post_id", idsKey.split(","))
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PostCommentRow[];
    },
  });
  return { likes: likesQuery.data ?? [], comments: commentsQuery.data ?? [], idsKey };
}

export function PostInteractions({
  postId,
  likes,
  comments,
  shareTitle,
  shareText,
}: {
  postId: string;
  likes: { post_id: string; user_id: string }[];
  comments: PostCommentRow[];
  shareTitle: string;
  shareText: string;
}) {
  const { session, isAdmin, requireAuth } = useAuth();
  const qc = useQueryClient();
  const { lang } = useLang();
  const t = useT();
  const dateLocale = lang === "en" ? enUS : fr;
  const uid = session?.user.id ?? null;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const postLikes = likes.filter((l) => l.post_id === postId);
  const liked = !!uid && postLikes.some((l) => l.user_id === uid);
  const postComments = comments.filter((c) => c.post_id === postId);

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!uid) return;
      if (liked) {
        const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", uid);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: uid });
        if (error) throw error;
        trackEvent("like", { type: "wall_post" });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-likes"] });
      qc.invalidateQueries({ queryKey: ["wall-likes"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!uid) return;
      const trimmedVideo = video.trim();
      if (trimmedVideo && !isValidVideoUrl(trimmedVideo)) {
        throw new Error("Lien vidéo invalide (YouTube ou Vimeo attendu)");
      }
      if (!draft.trim() && images.length === 0 && !trimmedVideo) return;
      const finalContent = trimmedVideo ? (draft.trim() ? `${draft.trim()}\n${trimmedVideo}` : trimmedVideo) : draft.trim();
      const { error } = await supabase.from("post_comments").insert({
        post_id: postId,
        author_id: uid,
        content: finalContent,
        image_urls: images,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      trackEvent("comment", { type: "wall_post" });
      setDraft("");
      setImages([]);
      setVideo("");
      qc.invalidateQueries({ queryKey: ["post-comments"] });
      qc.invalidateQueries({ queryKey: ["wall-comments"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const editComment = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase.from("post_comments").update({ content: content.trim() } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditId(null);
      setEditText("");
      qc.invalidateQueries({ queryKey: ["post-comments"] });
      qc.invalidateQueries({ queryKey: ["wall-comments"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("post_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-comments"] });
      qc.invalidateQueries({ queryKey: ["wall-comments"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mt-2 border-t border-border pt-2">
      <div className="flex items-center gap-3 text-xs">
        <button
          onClick={() => requireAuth(() => toggleLike.mutate())}
          className={`inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-muted ${liked ? "text-primary" : "text-muted-foreground"}`}
          aria-label="J'aime"
        >
          <Heart className={`size-3.5 ${liked ? "fill-current" : ""}`} />
          <span>{postLikes.length}</span>
        </button>
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-muted-foreground hover:bg-muted"
          aria-label="Répondre"
        >
          <MessageCircle className="size-3.5" />
          <span>{postComments.length}</span>
        </button>
        <ShareButton target={{ url: `/p/${postId}`, title: shareTitle, text: shareText.slice(0, 200) }} className="ml-auto" />
      </div>
      {open && (
        <div className="mt-2 space-y-2">
          {postComments.map((c) => {
            const canDel = uid === c.author_id || isAdmin;
            return (
              <div key={c.id} id={`comment-${c.id}`} className="scroll-mt-24 rounded border border-border bg-muted/30 p-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <UserBadge profile={c.author} className="text-[11px]" />
                    {c.author?.pseudo && (
                      <Link
                        to="/u/$pseudo"
                        params={{ pseudo: c.author.pseudo }}
                        title={`Voir le profil public de @${c.author.pseudo}`}
                        className="inline-flex items-center justify-center rounded border-2 border-black bg-yellow-400 p-0.5 text-black shadow-[1px_1px_0_0_#000] transition hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#000]"
                        aria-label={`Profil public de @${c.author.pseudo}`}
                      >
                        <ArrowUpRight className="size-3" />
                      </Link>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: dateLocale })}
                  </span>
                </div>
                {editId === c.id ? (
                  <div className="space-y-1">
                    <MentionTextarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={!editText.trim() || editComment.isPending}
                        onClick={() => editComment.mutate({ id: c.id, content: editText })}
                      >
                        {t("comment.save")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                        {t("comment.cancel")}
                      </Button>
                    </div>
                  </div>
                ) : null}
                {editId !== c.id && stripMediaUrls(c.content) && (
                  <p className="whitespace-pre-wrap text-xs">
                    <TranslatedText entityType="post_comment" entityKey={c.id} field="content" text={stripMediaUrls(c.content)}>
                      {(tr) => <>{renderRich(tr)}</>}
                    </TranslatedText>
                  </p>
                )}
                {Array.isArray(c.image_urls) && c.image_urls.length > 0 && (
                  <div className={`mt-1 grid gap-1 ${c.image_urls.length === 1 ? "grid-cols-1" : c.image_urls.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                    {c.image_urls.map((u, i) => (
                      <div key={i} className="relative overflow-hidden rounded border border-border bg-muted" style={{ aspectRatio: "1/1" }}>
                        <SmartImg src={u} width={320} height={320} responsive={[160, 320]} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                <UrlEmbeds text={c.content} compact />
                <div className="mt-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <CommentLikeButton commentId={c.id} kind="post" />
                    {session && session.user.id !== c.author_id && <ReportButton commentType="post_comment" commentId={c.id} />}
                  </div>
                  <div className="flex items-center gap-1">
                  {uid === c.author_id && editId !== c.id && (
                    <button
                      onClick={() => { setEditId(c.id); setEditText(c.content); }}
                      className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-primary"
                      aria-label={t("comment.edit")}
                    >
                      <Pencil className="size-3" />
                    </button>
                  )}
                  {canDel && (
                    <button
                      onClick={() => { if (confirm("Supprimer cette réponse ?")) deleteComment.mutate(c.id); }}
                      className="rounded p-0.5 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="flex gap-2">
            <MentionTextarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={session ? t("comment.writeReply") : t("comment.signInToReply")}
              onFocus={() => { if (!session) requireAuth(() => {}); }}
              rows={1}
              className="min-h-[38px] resize-none text-xs"
              disabled={!session}
            />
            <Button
              size="sm"
              onClick={() => requireAuth(() => addComment.mutate())}
              disabled={(!draft.trim() && images.length === 0 && !video.trim()) || addComment.isPending}
            >
              {t("comment.send")}
            </Button>
          </div>
          {session && (
            <>
              <Input
                type="url"
                inputMode="url"
                value={video}
                onChange={(e) => setVideo(e.target.value)}
                placeholder={t("wall.videoUrlPlaceholder")}
                className="h-8 text-xs bg-transparent border-border/50 placeholder:italic placeholder:text-muted-foreground/70 placeholder:font-normal"
              />
              <MultiImageUploader values={images} onChange={setImages} folder="wall-comments" max={4} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
