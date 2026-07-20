import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useRouterState } from "@tanstack/react-router";
import { parseHashTargets } from "@/lib/notif-navigate";
import { useAuth } from "@/hooks/use-auth";
import { UserBadge } from "@/components/UserBadge";
import { Button } from "@/components/ui/button";
import { MentionTextarea } from "@/components/mentions/MentionTextarea";
import { toast } from "@/lib/toast";
import { Pencil, Trash2, Check, X, Heart, MessageCircle, Pin, PinOff, ArrowUpRight, Image as ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { UrlEmbeds } from "@/components/media/UrlEmbeds";
import { ShareButton } from "@/components/share/ShareButton";
import { CommentLikeButton } from "@/components/CommentLikeButton";
import { ReportButton } from "@/components/moderation/ReportButton";
import { Input } from "@/components/ui/input";
import { isValidVideoUrl, stripMediaUrls } from "@/lib/media-embed";
import { SocialLinksBar, SocialLinksEditor, sanitizeLinks, type SocialLinks } from "@/components/social/SocialLinksBar";
import { ImageUploader } from "@/components/media/ImageUploader";
import { MultiImageUploader } from "@/components/media/MultiImageUploader";
import { ReportImageButton } from "@/components/moderation/ReportImageButton";
import { InlineEditable } from "@/components/wall/InlineEditable";
import { EmojiPickerButton } from "@/components/text/EmojiPickerButton";
import { renderRich } from "@/lib/rich-text";
import { suggestHashtags, type HashtagSuggestion } from "@/lib/hashtag-suggest";
import { Hash } from "lucide-react";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { useLang, useT } from "@/lib/i18n";

interface PostRow {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  pinned_at: string | null;
  pin_label: string | null;
  social_links: SocialLinks | null;
  image_url: string | null;
  image_urls: string[] | null;
  title: string | null;
  image_captions: string[] | null;
  album_id: string | null;
  album: { id: string; title: string; cover_url: string | null } | null;
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

export function SocialWall() {
  const { session, requireAuth, isAdmin, isArtiste } = useAuth();
  const t = useT();
  const { lang } = useLang();
  const dateLocale = lang === "en" ? enUS : fr;
  // Ouvert à toute la communauté : tout utilisateur connecté peut uploader des photos.
  const canUploadImages = !!session;
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [socialDraft, setSocialDraft] = useState<SocialLinks>({});
  const [editSocial, setEditSocial] = useState<SocialLinks>({});
  const [imageDraft, setImageDraft] = useState("");
  const [editImage, setEditImage] = useState("");
  const [imagesDraft, setImagesDraft] = useState<string[]>([]);
  const [editImages, setEditImages] = useState<string[]>([]);
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
    queryKey: ["wall-posts", activeTag],
    queryFn: async () => {
      let req = supabase
        .from("posts")
        .select("id, author_id, content, created_at, pinned_at, pin_label, social_links, image_url, image_urls, title, image_captions, album_id, album:photo_albums!posts_album_id_fkey(id, title, cover_url), author:profiles!posts_author_id_fkey(id, pseudo, role, is_certified, is_team_indi, badges, level)")
        .order("pinned_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (activeTag) {
        const needle = `%#${activeTag}%`;
        req = req.or(`content.ilike.${needle},title.ilike.${needle}`);
      }
      const { data, error } = await req;
      if (error) throw error;
      return (data ?? []) as unknown as PostRow[];
    },
  });

  const { data: popularTags = [] } = useQuery<HashtagSuggestion[]>({
    queryKey: ["wall-popular-tags"],
    queryFn: () => suggestHashtags("", { limit: 12 }),
    staleTime: 60_000,
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

  const albumIdsKey = Array.from(new Set(posts.map((p) => p.album_id).filter((x): x is string => !!x))).sort().join(",");
  const { data: albumStats = {} } = useQuery<Record<string, { count: number; firstImage: string | null }>>({
    queryKey: ["wall-album-stats", albumIdsKey],
    enabled: albumIdsKey.length > 0,
    queryFn: async () => {
      const ids = albumIdsKey.split(",").filter(Boolean);
      const { data, error } = await supabase
        .from("posts")
        .select("album_id, image_url, image_urls, created_at")
        .in("album_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const out: Record<string, { count: number; firstImage: string | null }> = {};
      for (const row of (data ?? []) as any[]) {
        const aid = row.album_id as string;
        if (!out[aid]) out[aid] = { count: 0, firstImage: null };
        out[aid].count += 1;
        const img = row.image_url || (Array.isArray(row.image_urls) ? row.image_urls[0] : null);
        if (img) out[aid].firstImage = img; // last assignment = oldest (desc order) — but we want the most recent, so only set if null
      }
      // Recompute firstImage as most recent (desc order): iterate again and pick first with image
      for (const aid of ids) {
        const first = (data ?? []).find((r: any) => r.album_id === aid && (r.image_url || (Array.isArray(r.image_urls) && r.image_urls[0])));
        if (first) out[aid].firstImage = (first as any).image_url || (first as any).image_urls?.[0] || null;
      }
      return out;
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
      if (!session) return;
      const trimmedVideo = videoUrl.trim();
      const trimmedContent = content.trim();
      if (!trimmedContent && !trimmedVideo) return;
      if (trimmedVideo && !isValidVideoUrl(trimmedVideo)) {
        throw new Error("Lien vidéo invalide (YouTube ou Vimeo attendu)");
      }
      const finalContent = trimmedVideo
        ? (trimmedContent ? `${trimmedContent}\n${trimmedVideo}` : trimmedVideo)
        : trimmedContent;
      const mentions = Array.from(finalContent.matchAll(MENTION_RE)).map((m) => m[1]);
      const { error } = await supabase.from("posts").insert({
        author_id: session.user.id,
        content: finalContent,
        mentions,
        social_links: isAdmin ? sanitizeLinks(socialDraft) : {},
        image_url: canUploadImages ? (imageDraft.trim() || imagesDraft[0] || null) : null,
        image_urls: canUploadImages ? imagesDraft : [],
        title: title.trim() || null,
        image_captions: canUploadImages ? new Array(imagesDraft.length).fill("") : [],
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      setTitle("");
      setVideoUrl("");
      setSocialDraft({});
      setImageDraft("");
      setImagesDraft([]);
      toast.success("Ton message est en ligne — +2 pts");
      qc.invalidateQueries({ queryKey: ["wall-posts"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, content, social_links, image_url, image_urls }: { id: string; content: string; social_links?: SocialLinks; image_url?: string | null; image_urls?: string[] }) => {
      const mentions = Array.from(content.matchAll(MENTION_RE)).map((m) => m[1]);
      const payload: any = { content, mentions };
      if (social_links !== undefined) payload.social_links = sanitizeLinks(social_links);
      if (image_url !== undefined) payload.image_url = image_url;
      if (image_urls !== undefined) payload.image_urls = image_urls;
      const { error } = await supabase.from("posts").update(payload).eq("id", id);
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
    if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") return;
    if (!hasPosts) return;
    const el = listRef.current;
    if (!el) return;
    const saved = window.sessionStorage.getItem(SCROLL_KEY);
    if (saved == null) return;
    const y = Number(saved);
    if (Number.isNaN(y)) return;
    requestAnimationFrame(() => { el.scrollTop = y; });
  }, [hasPosts]);

  // Persist scroll position as the user scrolls (throttled via rAF).
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") return;
    const el = listRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        window.sessionStorage.setItem(SCROLL_KEY, String(el.scrollTop));
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
        <h2 className="section-title">{t("wall.title")}</h2>
      </div>

      <div className="card-brut p-3 border-2 border-primary ring-1 ring-primary/30">
        <MentionTextarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={session ? t("wall.placeholderSignedIn") : t("wall.placeholderSignedOut")}
          onFocus={() => { if (!session) requireAuth(() => {}); }}
          rows={2}
          className="resize-none border-0 bg-transparent placeholder:font-semibold placeholder:text-foreground placeholder:opacity-100 disabled:opacity-100 focus-visible:ring-0"
          disabled={!session}
        />
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("wall.postTitle")}
          maxLength={120}
          disabled={!session}
          className="mt-2 h-8 text-xs font-semibold"
        />
        {(title.trim() || content.trim()) && (
          <div className="mt-1 flex items-center gap-2">
            <EmojiPickerButton
              onPick={(e) => setContent((v) => v + e)}
              ariaLabel="Insérer un emoji dans le message"
            />
            <span className="text-[10px] text-muted-foreground">
              {t("wall.emojiHint")}
            </span>
          </div>
        )}
        {(title.trim() || content.trim()) && (
          <div className="mt-1 rounded border border-dashed border-border bg-muted/30 px-1.5 py-1 text-[11px] leading-snug">
            <span className="mr-1 text-[9px] font-bold uppercase text-muted-foreground">{t("wall.preview")}</span>
            {title.trim() && (
              <span className="mr-1 font-bold">{renderRich(title)}</span>
            )}
            <span className="whitespace-pre-wrap">{renderRich(content)}</span>
          </div>
        )}
        <Input
          type="url"
          inputMode="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder={t("wall.videoUrl")}
          disabled={!session}
          className="mt-2 h-8 text-xs"
        />
        {isAdmin && (
          <div className="mt-2">
            <SocialLinksEditor value={socialDraft} onChange={setSocialDraft} />
          </div>
        )}
        {canUploadImages && (
          <div className="mt-2">
            <MultiImageUploader values={imagesDraft} onChange={setImagesDraft} folder="wall" />
          </div>
        )}
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            onClick={() => requireAuth(() => create.mutate())}
            disabled={(!content.trim() && !videoUrl.trim()) || create.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            {t("comment.publish")}
          </Button>
        </div>
      </div>

      {(popularTags.length > 0 || activeTag) && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background/40 p-2">
          <span className="mr-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            <Hash className="size-3" /> {t("wall.filter")}
          </span>
          {popularTags.map((t) => {
            const isActive = activeTag === t.tag;
            return (
              <button
                key={t.tag}
                type="button"
                onClick={() => setActiveTag(isActive ? null : t.tag)}
                aria-pressed={isActive}
                className={
                  "inline-flex items-center gap-1 rounded-full border-2 border-black px-2 py-0.5 text-[11px] font-semibold transition " +
                  (isActive
                    ? "bg-primary text-black shadow-[2px_2px_0_0_#000]"
                    : "bg-background hover:bg-muted")
                }
              >
                #{t.tag}
                <span className="text-[9px] font-normal opacity-70">{t.count}</span>
              </button>
            );
          })}
          {activeTag && (
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
            >
              <X className="size-3" /> {t("wall.reset")}
            </button>
          )}
        </div>
      )}

      <ul
        ref={listRef}
        className="max-h-[28rem] space-y-2 overflow-y-auto rounded-lg border border-border bg-background/40 p-2 pr-3"
      >
        {posts.length === 0 && !activeTag && (
          <li className="card-brut p-4 text-center text-sm text-muted-foreground">
            {t("wall.empty")}
          </li>
        )}
        {posts.length === 0 && activeTag && (
          <li className="card-brut p-4 text-center text-sm text-muted-foreground">
            {t("wall.noTag")} <span className="font-semibold text-primary">#{activeTag}</span>.
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
                    {p.pin_label || t("wall.pinned")}
                  </span>
                </div>
              )}
              <div className="mb-1 flex items-center justify-between gap-2">
                <UserBadge profile={p.author} className="text-xs" />
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: dateLocale })}
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
                  {isAdmin && (
                    <SocialLinksEditor value={editSocial} onChange={setEditSocial} />
                  )}
                  {(isAdmin || isOwner) && (
                    <MultiImageUploader values={editImages} onChange={setEditImages} folder="wall" />
                  )}
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="size-3.5" /> Annuler
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updatePost.mutate({ id: p.id, content: editContent.trim(), social_links: isAdmin ? editSocial : undefined, image_url: (isAdmin || isOwner) ? (editImages[0] || null) : undefined, image_urls: (isAdmin || isOwner) ? editImages : undefined })}
                      disabled={!editContent.trim() || updatePost.isPending}
                    >
                      <Check className="size-3.5" /> Enregistrer
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {(() => {
                    const canEditMeta = isOwner || isAdmin;
                    if (canEditMeta) {
                      return (
                        <InlineEditable
                          initial={p.title ?? ""}
                          placeholder="Ajouter un titre…"
                          ariaLabel="Titre de la publication"
                          maxLength={120}
                          className="text-base font-bold leading-tight"
                          withEmoji
                          preview
                          save={async (v) => {
                            const { error } = await supabase
                              .from("posts")
                              .update({ title: v.trim() || null } as any)
                              .eq("id", p.id);
                            if (error) throw error;
                            qc.invalidateQueries({ queryKey: ["wall-posts"] });
                          }}
                        />
                      );
                    }
                    return p.title ? (
                      <h3 className="text-base font-bold leading-tight">
                        <TranslatedText entityType="post" entityKey={p.id} field="title" text={p.title}>
                          {(t) => <>{renderRich(t)}</>}
                        </TranslatedText>
                      </h3>
                    ) : null;
                  })()}
                  {stripMediaUrls(p.content) && (
                    <p className="whitespace-pre-wrap text-sm">
                      <TranslatedText entityType="post" entityKey={p.id} field="content" text={stripMediaUrls(p.content)}>
                        {(t) => <>{renderRich(t)}</>}
                      </TranslatedText>
                    </p>
                  )}
                  {(() => {
                    const imgs = (p.image_urls && p.image_urls.length > 0) ? p.image_urls : (p.image_url ? [p.image_url] : []);
                    if (imgs.length === 0) return null;
                    const captions = p.image_captions ?? [];
                    const canEditMeta = isOwner || isAdmin;
                    const saveCaption = (idx: number) => async (v: string) => {
                      const next = imgs.map((_, i) => (captions[i] ?? ""));
                      next[idx] = v;
                      const { error } = await supabase
                        .from("posts")
                        .update({ image_captions: next } as any)
                        .eq("id", p.id);
                      if (error) throw error;
                      qc.invalidateQueries({ queryKey: ["wall-posts"] });
                    };
                     const renderCaption = (i: number) => {
                       if (canEditMeta) {
                         return (
                           <InlineEditable
                             key={`cap-${p.id}-${i}`}
                             initial={captions[i] ?? ""}
                             placeholder="Légende…"
                             ariaLabel={`Légende de l'image ${i + 1}`}
                             maxLength={200}
                             className="text-[11px] text-muted-foreground"
                             withEmoji
                             preview
                             save={saveCaption(i)}
                           />
                         );
                       }
                       return captions[i] ? (
                         <p className="mt-1 px-1.5 text-[11px] text-muted-foreground">
                           <TranslatedText entityType="post" entityKey={`${p.id}:cap:${i}`} field="caption" text={captions[i]}>
                             {(t) => <>{renderRich(t)}</>}
                           </TranslatedText>
                         </p>
                       ) : null;
                     };
                    if (imgs.length === 1) {
                      return (
                        <div className="mt-2">
                          <div className="relative w-full overflow-hidden rounded border border-border bg-muted" style={{ aspectRatio: "16/9" }}>
                            <img src={imgs[0]} alt={captions[0] ?? ""} loading="lazy" className="w-full h-full object-cover" />
                            {session && session.user.id !== p.author_id && (
                              <ReportImageButton postId={p.id} imageUrl={imgs[0]} />
                            )}
                          </div>
                           {renderCaption(0)}
                        </div>
                      );
                    }
                    return (
                      <div className={`mt-2 grid gap-1 ${imgs.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
                        {imgs.map((u, i) => (
                          <div key={i} className="flex flex-col">
                            <div className="relative overflow-hidden rounded border border-border bg-muted" style={{ aspectRatio: "16/9" }}>
                              <img src={u} alt={captions[i] ?? ""} loading="lazy" className="w-full h-full object-cover" />
                              {session && session.user.id !== p.author_id && (
                                <ReportImageButton postId={p.id} imageUrl={u} />
                              )}
                            </div>
                             {renderCaption(i)}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {p.album && p.author?.pseudo && (() => {
                    const stats = albumStats[p.album.id];
                    const cover = p.album.cover_url || stats?.firstImage || p.image_url || (Array.isArray(p.image_urls) ? p.image_urls[0] : null);
                    const count = stats?.count ?? 0;
                    return (
                      <div className="mt-2">
                        <Link
                          to="/u/$pseudo/albums/$albumId"
                          params={{ pseudo: p.author.pseudo, albumId: p.album.id }}
                          title={`Voir l'album « ${p.album.title} » (${count} photo${count > 1 ? "s" : ""})`}
                          className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-primary/10 pr-2.5 py-1 pl-1 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          {cover ? (
                            <img src={cover} alt="" className="size-6 rounded-full object-cover border border-black" loading="lazy" />
                          ) : (
                            <span className="inline-flex size-6 items-center justify-center rounded-full border border-black bg-background">
                              <ImageIcon className="size-3.5" />
                            </span>
                          )}
                          <span>Album : {p.album.title}</span>
                          {count > 0 && (
                            <span className="rounded-full bg-black px-1.5 py-0.5 text-[10px] text-primary">{count} photo{count > 1 ? "s" : ""}</span>
                          )}
                        </Link>
                      </div>
                    );
                  })()}
                  <UrlEmbeds text={p.content} />
                  <SocialLinksBar links={p.social_links} className="mt-2" />
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
                        onClick={() => { setEditingId(p.id); setEditContent(p.content); setEditSocial((p.social_links as SocialLinks | null) ?? {}); setEditImage(p.image_url ?? ""); setEditImages((p.image_urls && p.image_urls.length > 0) ? p.image_urls : (p.image_url ? [p.image_url] : [])); }}
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
                  <>
                    {p.author?.pseudo && (
                      <div className="mt-2 flex justify-end">
                        <Link
                          to="/u/$pseudo"
                          params={{ pseudo: p.author.pseudo }}
                          title={`Voir le profil public de @${p.author.pseudo}`}
                          className="group inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline"
                        >
                          <span className="inline-flex size-5 items-center justify-center rounded-full border-2 border-black bg-primary text-black shadow-[1.5px_1.5px_0_0_#000] transition-transform group-hover:-translate-y-0.5">
                            <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={3} />
                          </span>
                          {t("wall.publicProfile")}
                        </Link>
                      </div>
                    )}
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
                      <ShareButton
                        target={{
                          url: `/p/${p.id}`,
                          title: `${p.author?.pseudo ?? "Un auditeur"} sur Indi Radio`,
                          text: stripMediaUrls(p.content).slice(0, 200),
                        }}
                        className="ml-auto"
                      />
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
                              {stripMediaUrls(c.content) && (
                                <p className="whitespace-pre-wrap text-xs">
                                  <TranslatedText entityType="post_comment" entityKey={c.id} field="content" text={stripMediaUrls(c.content)}>
                                    {(t) => <>{renderRich(t)}</>}
                                  </TranslatedText>
                                </p>
                              )}
                              <UrlEmbeds text={c.content} compact />
                              <div className="mt-1 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <CommentLikeButton commentId={c.id} kind="post" />
                                  {session && session.user.id !== c.author_id && (
                                    <ReportButton commentType="post_comment" commentId={c.id} />
                                  )}
                                </div>
                                {canDelC && (
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
                          );
                        })}
                        <div className="flex gap-2">
                          <MentionTextarea
                            value={replyDraft[p.id] ?? ""}
                            onChange={(e) => setReplyDraft((r) => ({ ...r, [p.id]: e.target.value }))}
                            placeholder={session ? t("comment.writeReply") : t("comment.signInToReply")}
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
                            {t("comment.send")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>);
              })()}
            </li>
          );
        })}
      </ul>
    </section>
  );
}