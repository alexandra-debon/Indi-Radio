import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { UserBadge } from "@/components/UserBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Newspaper, ArrowUpRight } from "lucide-react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { toast } from "@/lib/toast";
import { useHashHighlight, parseHashTargets } from "@/lib/notif-navigate";
import { Link, useRouterState } from "@tanstack/react-router";
import { UrlEmbeds } from "@/components/media/UrlEmbeds";
import { isValidVideoUrl, stripMediaUrls } from "@/lib/media-embed";
import { ShareButton } from "@/components/share/ShareButton";
import { CommentLikeButton } from "@/components/CommentLikeButton";
import { ReportButton } from "@/components/moderation/ReportButton";
import ogActus from "@/assets/og-actus.jpg";
import { SocialLinksBar, SocialLinksEditor, sanitizeLinks, type SocialLinks } from "@/components/social/SocialLinksBar";
import { ImageUploader } from "@/components/media/ImageUploader";
import { MultiImageUploader } from "@/components/media/MultiImageUploader";
import { ReportImageButton } from "@/components/moderation/ReportImageButton";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { renderRich } from "@/lib/rich-text";
import { useLang, useT } from "@/lib/i18n";
import { breadcrumbLd, HOME_CRUMB, SITE_ORIGIN } from "@/lib/seo-breadcrumb";
import { SmartImg } from "@/components/media/SmartImg";

const OG_ACTUS = `https://radio.indi-art-culture.com${ogActus}`;

export const Route = createFileRoute("/actus")({
  head: () => ({
    meta: [
      { title: "Indi Rézo — Radio musique indé & réseau social musique InDi RaDio" },
      { name: "description", content: "Toute l'actu de la scène indépendante et du réseau social musique InDi ArT CulTuRe. Radio musique indé, clips, chroniques et podcasts." },
      { name: "keywords", content: "radio musique indé, réseau social musique, radio musique indépendante, actus indépendantes, InDi RaDio, Indi Rézo" },
      { property: "og:title", content: "Indi Rézo — Radio musique indé & réseau social musique InDi RaDio" },
      { property: "og:description", content: "Toute l'actu de la scène indépendante et du réseau social musique InDi ArT CulTuRe. Radio musique indé, clips, chroniques et podcasts." },
      { property: "og:url", content: "https://radio.indi-art-culture.com/actus" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_ACTUS },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_ACTUS },
    ],
    links: [{ rel: "canonical", href: "https://radio.indi-art-culture.com/actus" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          "@id": "https://radio.indi-art-culture.com/actus#blog",
          name: "Indi Rézo",
          description: "Fil d'actualités des artistes indépendants et l'actu InDi Radio, orchestré par la rédaction d'Indi Radio.",
          url: "https://radio.indi-art-culture.com/actus",
          inLanguage: "fr-FR",
          publisher: { "@id": "https://radio.indi-art-culture.com/#org" },
        }),
      },
      breadcrumbLd([
        HOME_CRUMB,
        { name: "Indi Rézo", url: `${SITE_ORIGIN}/actus` },
      ]),
    ],
  }),
  component: ActusPage,
});

interface NewsPost {
  id: string;
  author_id: string;
  title: string;
  content: string;
  image_url: string | null;
  image_urls: string[] | null;
  image_captions: string[] | null;
  created_at: string;
  social_links: SocialLinks | null;
  author: { id: string; pseudo: string; role: "admin" | "artiste" | "animateur" | "auditeur"; is_certified: boolean; is_team_indi: boolean; badges: string[]; level: number } | null;
}

function ActusPage() {
  const { session, profile, isAdmin, isAnimateur, openAuth } = useAuth();
  const t = useT();
  const qc = useQueryClient();
  useHashHighlight();
  const hash = useRouterState({ select: (s) => s.location.hash });
  const focusedNewsId = (() => {
    const { primary } = parseHashTargets(hash);
    if (!primary || !primary.startsWith("news-")) return null;
    return primary.slice("news-".length) || null;
  })();

  const { data: posts = [] } = useQuery<NewsPost[]>({
    queryKey: ["news-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("id,author_id,title,content,image_url,image_urls,image_captions,created_at,social_links, author:profiles!news_posts_author_id_fkey(id,pseudo,role,is_certified,is_team_indi,badges,level)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as NewsPost[];
    },
  });

  const canPublish = isAdmin || isAnimateur;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});

  const create = useMutation({
    mutationFn: async () => {
      if (!session) return;
      const trimmedVideo = videoUrl.trim();
      if (trimmedVideo && !isValidVideoUrl(trimmedVideo)) {
        throw new Error("Lien vidéo invalide (YouTube ou Vimeo attendu)");
      }
      const finalContent = trimmedVideo
        ? (content.trim() ? `${content.trim()}\n${trimmedVideo}` : trimmedVideo)
        : content;
      const { error } = await supabase.from("news_posts").insert({
        author_id: session.user.id,
        title,
        content: finalContent,
        image_url: images[0] ?? null,
        image_urls: images,
        social_links: sanitizeLinks(socialLinks),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Publié !");
      setTitle(""); setContent(""); setImages([]); setVideoUrl(""); setSocialLinks({});
      qc.invalidateQueries({ queryKey: ["news-posts"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-4">
      <h1 className="section-title">{t("page.actus.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("page.actus.subtitle")}</p>

      {canPublish && (
        <div className="card-brut space-y-2 p-3">
          <div className="text-[10px] uppercase tracking-widest text-primary">Nouveau post — {profile?.role}</div>
          <Input placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
          <MultiImageUploader values={images} onChange={setImages} folder="news" />
          <Input placeholder="Lien vidéo YouTube ou Vimeo (optionnel)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
          <Textarea placeholder="Contenu…" rows={3} value={content} onChange={(e) => setContent(e.target.value)} />
          <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />
          <Button size="sm" onClick={() => create.mutate()} disabled={!title || !content || create.isPending}>Publier</Button>
        </div>
      )}

      <h2 className="section-title text-base">{t("page.actus.feed")}</h2>
      <ul className="space-y-3">
        {posts.length === 0 && (
          <li className="card-brut p-4 text-center text-sm text-muted-foreground">
            <Newspaper className="mx-auto mb-2 size-6" />
            {t("page.actus.empty")}
          </li>
        )}
        {posts.map((p) => (
          <NewsCard
            key={p.id}
            post={p}
            onSignIn={openAuth}
            sessionUserId={session?.user.id ?? null}
            autoOpenComments={focusedNewsId === p.id}
          />
        ))}
      </ul>
    </div>
  );
}

function NewsCard({ post, onSignIn, sessionUserId, autoOpenComments = false }: { post: NewsPost; onSignIn: () => void; sessionUserId: string | null; autoOpenComments?: boolean }) {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const t = useT();
  const { lang } = useLang();
  const dateLocale = lang === "en" ? enUS : fr;
  const [commentOpen, setCommentOpen] = useState(false);
  useEffect(() => {
    if (autoOpenComments) setCommentOpen(true);
  }, [autoOpenComments]);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const initialImages = (post.image_urls && post.image_urls.length > 0) ? post.image_urls : (post.image_url ? [post.image_url] : []);
  const [editForm, setEditForm] = useState({ title: post.title, content: post.content, images: initialImages, social_links: (post.social_links ?? {}) as SocialLinks });
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [commentImages, setCommentImages] = useState<string[]>([]);

  const isOwner = sessionUserId === post.author_id;
  const canEditPost = isOwner;
  const canDeletePost = isOwner || isAdmin;

  const { data: likeInfo } = useQuery({
    queryKey: ["news-likes", post.id, sessionUserId ?? "anon"],
    queryFn: async () => {
      const [{ count }, own] = await Promise.all([
        supabase.from("news_likes").select("*", { count: "exact", head: true }).eq("news_post_id", post.id),
        sessionUserId
          ? supabase.from("news_likes").select("id").eq("news_post_id", post.id).eq("user_id", sessionUserId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return { count: count ?? 0, liked: !!own.data };
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["news-comments", post.id],
    enabled: commentOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from("news_comments")
        .select("id, author_id, content, created_at, image_urls, image_captions, author:profiles!news_comments_author_id_fkey(id,pseudo,role,is_certified,is_team_indi,badges,level)")
        .eq("news_post_id", post.id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`news-comments-${post.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "news_comments", filter: `news_post_id=eq.${post.id}` },
        () => qc.invalidateQueries({ queryKey: ["news-comments", post.id] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "news_likes", filter: `news_post_id=eq.${post.id}` },
        () => qc.invalidateQueries({ queryKey: ["news-likes", post.id] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [post.id, qc]);

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!sessionUserId) return;
      if (likeInfo?.liked) {
        await supabase.from("news_likes").delete().eq("news_post_id", post.id).eq("user_id", sessionUserId);
      } else {
        await supabase.from("news_likes").insert({ news_post_id: post.id, user_id: sessionUserId });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["news-likes", post.id] }),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!sessionUserId) return;
      if (!comment.trim() && commentImages.length === 0) return;
      const { error } = await supabase.from("news_comments").insert({
        news_post_id: post.id,
        author_id: sessionUserId,
        content: comment.trim(),
        image_urls: commentImages,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { setComment(""); setCommentImages([]); qc.invalidateQueries({ queryKey: ["news-comments", post.id] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const updatePost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("news_posts").update({
        title: editForm.title,
        content: editForm.content,
        image_url: editForm.images[0] ?? null,
        image_urls: editForm.images,
        social_links: sanitizeLinks(editForm.social_links),
      } as any).eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Actu modifiée"); setEditing(false); qc.invalidateQueries({ queryKey: ["news-posts"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const deletePost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("news_posts").delete().eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Actu supprimée"); qc.invalidateQueries({ queryKey: ["news-posts"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase.from("news_comments").update({ content }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { setEditingCommentId(null); qc.invalidateQueries({ queryKey: ["news-comments", post.id] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("news_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["news-comments", post.id] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <li id={`news-${post.id}`} className="card-brut scroll-mt-24 overflow-hidden">
      {!editing && (() => {
        const imgs = (post.image_urls && post.image_urls.length > 0) ? post.image_urls : (post.image_url ? [post.image_url] : []);
        if (imgs.length === 0) return null;
        if (imgs.length === 1) {
          return (
            <div className="w-full overflow-hidden bg-muted" style={{ aspectRatio: "16/9" }}>
              <SmartImg src={imgs[0]} width={1280} height={720} responsive={[480, 800, 1280]} sizes="(max-width: 640px) 100vw, 800px" alt="" className="w-full h-full object-cover" />
            </div>
          );
        }
        return (
          <div className={`grid gap-1 ${imgs.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
            {imgs.map((u, i) => (
              <div key={i} className="relative overflow-hidden bg-muted" style={{ aspectRatio: "16/9" }}>
                <SmartImg src={u} width={640} height={360} responsive={[320, 480, 640]} alt="" className="w-full h-full object-cover" />
                {sessionUserId && sessionUserId !== post.author_id && (
                  <ReportImageButton postId={post.id} imageUrl={u} />
                )}
              </div>
            ))}
          </div>
        );
      })()}
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <UserBadge profile={post.author} className="text-xs" />
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: dateLocale })}
          </span>
        </div>
        {editing ? (
          <div className="space-y-2">
            <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Titre" />
            <MultiImageUploader values={editForm.images} onChange={(v) => setEditForm({ ...editForm, images: v })} folder="news" />
            <Textarea rows={4} value={editForm.content} onChange={(e) => setEditForm({ ...editForm, content: e.target.value })} placeholder="Contenu" />
            <SocialLinksEditor value={editForm.social_links} onChange={(v) => setEditForm({ ...editForm, social_links: v })} />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="size-3.5" /> Annuler</Button>
              <Button size="sm" onClick={() => updatePost.mutate()} disabled={!editForm.title || !editForm.content || updatePost.isPending}><Check className="size-3.5" /> Enregistrer</Button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold">
              <TranslatedText entityType="news_post" entityKey={post.id} field="title" text={post.title} />
            </h3>
            {stripMediaUrls(post.content) && (
              <p className="whitespace-pre-wrap text-sm">
                <TranslatedText entityType="news_post" entityKey={post.id} field="content" text={stripMediaUrls(post.content)} />
              </p>
            )}
            <UrlEmbeds text={post.content} />
            <SocialLinksBar links={post.social_links} className="pt-1" />
            {post.author?.pseudo && (
              <div className="mt-1 flex justify-end">
                <Link
                  to="/u/$pseudo"
                  params={{ pseudo: post.author.pseudo }}
                  title={`Voir le profil public de @${post.author.pseudo}`}
                  className="group inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline"
                >
                  <span className="inline-flex size-5 items-center justify-center rounded-full border-2 border-black bg-primary text-black shadow-[1.5px_1.5px_0_0_#000] transition-transform group-hover:-translate-y-0.5">
                    <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={3} />
                  </span>
                  Profil public
                </Link>
              </div>
            )}
          </>
        )}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => (sessionUserId ? toggleLike.mutate() : onSignIn())}
            aria-label={likeInfo?.liked ? "Retirer mon j'aime" : "J'aime cette actualité"}
            className={`flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs ${likeInfo?.liked ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
          >
            <Heart className={`size-3.5 ${likeInfo?.liked ? "fill-current" : ""}`} /> {likeInfo?.count ?? 0}
          </button>
          <button onClick={() => setCommentOpen((v) => !v)} className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted">
            <MessageCircle className="size-3.5" /> commentaires
          </button>
          <ShareButton
            target={{
              url: `/actus/${post.id}`,
              title: `${post.title} — Indi Rézo`,
              text: stripMediaUrls(post.content).slice(0, 200) || post.title,
            }}
          />
          {!editing && (canEditPost || canDeletePost) && (
            <div className="ml-auto flex gap-1">
              {canEditPost && (
                <button onClick={() => setEditing(true)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Modifier">
                  <Pencil className="size-3.5" />
                </button>
              )}
              {canDeletePost && (
                <button onClick={() => { if (confirm("Supprimer cette actu ?")) deletePost.mutate(); }} className="rounded p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground" aria-label="Supprimer">
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {commentOpen && (
          <div className="space-y-2 border-t border-border pt-3">
            {comments.map((c: any) => {
              const isCommentOwner = sessionUserId === c.author_id;
              const canDelC = isCommentOwner || isAdmin;
              const canEditC = isCommentOwner;
              const isEditingC = editingCommentId === c.id;
              return (
                <div
                  key={c.id}
                  id={`comment-${c.id}`}
                  className="scroll-mt-24 rounded-md bg-muted/40 p-2 transition"
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
                  {isEditingC ? (
                    <div className="space-y-1">
                      <Input value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)} />
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)}><X className="size-3" /></Button>
                        <Button size="sm" onClick={() => updateComment.mutate({ id: c.id, content: editCommentText.trim() })} disabled={!editCommentText.trim()}><Check className="size-3" /></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {stripMediaUrls(c.content) && (
                          <p className="text-sm">
                            <TranslatedText entityType="news_comment" entityKey={c.id} field="content" text={stripMediaUrls(c.content)}>
                              {(txt) => <>{renderRich(txt)}</>}
                            </TranslatedText>
                          </p>
                        )}
                        {Array.isArray(c.image_urls) && c.image_urls.length > 0 && (
                          <div className={`mt-1 grid gap-1 ${c.image_urls.length === 1 ? "grid-cols-1" : c.image_urls.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                            {c.image_urls.map((u: string, i: number) => (
                              <div key={i} className="relative overflow-hidden rounded border border-border bg-muted" style={{ aspectRatio: "1/1" }}>
                                <SmartImg src={u} width={320} height={320} responsive={[160, 320]} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                        <UrlEmbeds text={c.content} compact />
                      </div>
                      {(canEditC || canDelC) && (
                        <div className="flex shrink-0 gap-1">
                          {canEditC && (
                            <button onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.content); }} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Modifier"><Pencil className="size-3" /></button>
                          )}
                          {canDelC && (
                            <button onClick={() => { if (confirm("Supprimer ce commentaire ?")) deleteComment.mutate(c.id); }} className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Supprimer"><Trash2 className="size-3" /></button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {!isEditingC && (
                    <div className="mt-1">
                      <CommentLikeButton commentId={c.id} kind="news" />
                      {sessionUserId && sessionUserId !== c.author_id && (
                        <span className="ml-3"><ReportButton commentType="news_comment" commentId={c.id} /></span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {sessionUserId ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input placeholder={t("comment.add")} value={comment} onChange={(e) => setComment(e.target.value)} />
                  <Button size="sm" onClick={() => addComment.mutate()} disabled={!comment.trim() && commentImages.length === 0}>{t("comment.send")}</Button>
                </div>
                <MultiImageUploader values={commentImages} onChange={setCommentImages} folder="news-comments" max={4} />
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={onSignIn}>{t("comment.signInToComment")}</Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}