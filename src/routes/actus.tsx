import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { UserBadge } from "@/components/UserBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Newspaper } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/actus")({
  head: () => ({
    meta: [
      { title: "Indi Rézo — Actus artistes | Indi Radio" },
      { name: "description", content: "Le fil d'actualités Indi Rézo : les infos artistes publiées par la rédaction d'Indi Radio." },
      { property: "og:title", content: "Indi Rézo — Actus artistes" },
      { property: "og:description", content: "Fil d'actus des artistes indé sur Indi Radio." },
    ],
  }),
  component: ActusPage,
});

interface NewsPost {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author: { id: string; pseudo: string; role: "admin" | "artiste" | "animateur" | "auditeur"; is_certified: boolean; level: number } | null;
}

function ActusPage() {
  const { session, profile, isAdmin, isAnimateur, openAuth } = useAuth();
  const qc = useQueryClient();

  const { data: posts = [] } = useQuery<NewsPost[]>({
    queryKey: ["news-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("id,title,content,image_url,created_at, author:profiles!news_posts_author_id_fkey(id,pseudo,role,is_certified,level)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as NewsPost[];
    },
  });

  const canPublish = isAdmin || isAnimateur;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      if (!session) return;
      const { error } = await supabase.from("news_posts").insert({
        author_id: session.user.id,
        title,
        content,
        image_url: imageUrl || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Publié !");
      setTitle(""); setContent(""); setImageUrl("");
      qc.invalidateQueries({ queryKey: ["news-posts"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-4">
      <h1 className="section-title">Indi Rézo</h1>
      <p className="text-sm text-muted-foreground">Le fil des actus artistes, orchestré par la rédaction.</p>

      {canPublish && (
        <div className="card-brut space-y-2 p-3">
          <div className="text-[10px] uppercase tracking-widest text-primary">Nouveau post — {profile?.role}</div>
          <Input placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Image URL (optionnel)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <Textarea placeholder="Contenu…" rows={3} value={content} onChange={(e) => setContent(e.target.value)} />
          <Button size="sm" onClick={() => create.mutate()} disabled={!title || !content || create.isPending}>Publier</Button>
        </div>
      )}

      <ul className="space-y-3">
        {posts.length === 0 && (
          <li className="card-brut p-4 text-center text-sm text-muted-foreground">
            <Newspaper className="mx-auto mb-2 size-6" />
            Aucune actu pour l'instant.
          </li>
        )}
        {posts.map((p) => <NewsCard key={p.id} post={p} onSignIn={openAuth} sessionUserId={session?.user.id ?? null} />)}
      </ul>
    </div>
  );
}

function NewsCard({ post, onSignIn, sessionUserId }: { post: NewsPost; onSignIn: () => void; sessionUserId: string | null }) {
  const qc = useQueryClient();
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");

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
        .select("id, content, created_at, author:profiles!news_comments_author_id_fkey(id,pseudo,role,is_certified,level)")
        .eq("news_post_id", post.id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

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
      if (!sessionUserId || !comment.trim()) return;
      const { error } = await supabase.from("news_comments").insert({ news_post_id: post.id, author_id: sessionUserId, content: comment.trim() });
      if (error) throw error;
    },
    onSuccess: () => { setComment(""); qc.invalidateQueries({ queryKey: ["news-comments", post.id] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <li className="card-brut overflow-hidden">
      {post.image_url && <img src={post.image_url} alt="" className="h-48 w-full object-cover" />}
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <UserBadge profile={post.author} className="text-xs" />
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
          </span>
        </div>
        <h3 className="text-lg font-bold">{post.title}</h3>
        <p className="whitespace-pre-wrap text-sm">{post.content}</p>
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => (sessionUserId ? toggleLike.mutate() : onSignIn())}
            className={`flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs ${likeInfo?.liked ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
          >
            <Heart className={`size-3.5 ${likeInfo?.liked ? "fill-current" : ""}`} /> {likeInfo?.count ?? 0}
          </button>
          <button onClick={() => setCommentOpen((v) => !v)} className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted">
            <MessageCircle className="size-3.5" /> commentaires
          </button>
        </div>

        {commentOpen && (
          <div className="space-y-2 border-t border-border pt-3">
            {comments.map((c: any) => (
              <div key={c.id} className="rounded-md bg-muted/40 p-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <UserBadge profile={c.author} className="text-[11px]" />
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                  </span>
                </div>
                <p className="text-sm">{c.content}</p>
              </div>
            ))}
            {sessionUserId ? (
              <div className="flex gap-2">
                <Input placeholder="Ajouter un commentaire…" value={comment} onChange={(e) => setComment(e.target.value)} />
                <Button size="sm" onClick={() => addComment.mutate()} disabled={!comment.trim()}>Envoyer</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={onSignIn}>Se connecter pour commenter</Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}