import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { UrlEmbeds } from "@/components/media/UrlEmbeds";
import { SmartImg } from "@/components/media/SmartImg";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { stripMediaUrls } from "@/lib/media-embed";
import { toast } from "@/lib/toast";
import { useLang } from "@/lib/i18n";
import { CalendarDays, Ticket, Heart, HeartOff, Newspaper, Lock } from "lucide-react";
import { PostInteractions, usePostInteractions } from "@/components/wall/PostInteractions";
import { CategoryBadge, CategoryFilter, type PostCategory } from "@/components/social/PostCategory";
import { useState } from "react";

type ArtistEvent = {
  id: string;
  title: string;
  event_date: string;
  venue: string | null;
  ticket_url: string | null;
};

type ArtistPost = {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  image_url: string | null;
  image_urls: string[] | null;
  visibility: string;
  category: string | null;
};

const TXT = {
  fr: {
    follow: "Suivre",
    unfollow: "Ne plus suivre",
    followers: (n: number) => `${n} abonné${n > 1 ? "s" : ""}`,
    events: "Dates de concert",
    eventsEmpty: "Aucune date annoncée pour le moment.",
    upcoming: "À venir",
    past: "Passé",
    tickets: "Billetterie",
    posts: "Publications",
    postsEmpty: "Aucune publication pour le moment.",
    onlyHere: "Exclusivité de cette page",
    followersOnly: "Réservé aux abonnés",
    lockedHint: "Abonne-toi pour voir les publications réservées aux abonnés.",
  },
  en: {
    follow: "Follow",
    unfollow: "Unfollow",
    followers: (n: number) => `${n} follower${n > 1 ? "s" : ""}`,
    events: "Live dates",
    eventsEmpty: "No date announced yet.",
    upcoming: "Upcoming",
    past: "Past",
    tickets: "Tickets",
    posts: "Posts",
    postsEmpty: "No post yet.",
    onlyHere: "Exclusive to this page",
    followersOnly: "Followers only",
    lockedHint: "Follow to see followers-only posts.",
  },
} as const;

function useTxt() {
  const { lang } = useLang();
  return TXT[lang === "en" ? "en" : "fr"];
}

export function FollowButton({ artistId, accent }: { artistId: string; accent?: string | null }) {
  const { session, requireAuth } = useAuth();
  const qc = useQueryClient();
  const txt = useTxt();
  const uid = session?.user.id ?? null;

  const { data: count = 0 } = useQuery<number>({
    queryKey: ["artist-follow-count", artistId],
    queryFn: async () => {
      const { count } = await supabase
        .from("artist_follows")
        .select("id", { count: "exact", head: true })
        .eq("artist_id", artistId);
      return count ?? 0;
    },
  });

  const { data: following = false } = useQuery<boolean>({
    queryKey: ["artist-following", artistId, uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from("artist_follows")
        .select("id")
        .eq("artist_id", artistId)
        .eq("follower_id", uid!)
        .maybeSingle();
      return !!data;
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!uid) return;
      if (following) {
        const { error } = await supabase
          .from("artist_follows")
          .delete()
          .eq("artist_id", artistId)
          .eq("follower_id", uid);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("artist_follows")
          .insert({ artist_id: artistId, follower_id: uid } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["artist-follow-count", artistId] });
      qc.invalidateQueries({ queryKey: ["artist-following", artistId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (uid === artistId) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant={following ? "outline" : "default"}
        onClick={() => requireAuth(() => toggle.mutate())}
        disabled={toggle.isPending}
        style={!following && accent ? { backgroundColor: accent, color: "#000", borderColor: accent } : undefined}
      >
        {following ? <HeartOff className="size-4" /> : <Heart className="size-4" />}
        {following ? txt.unfollow : txt.follow}
      </Button>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{txt.followers(count)}</span>
    </div>
  );
}

export function ArtistEvents({ artistId, accent }: { artistId: string; accent?: string | null }) {
  const txt = useTxt();
  const { lang } = useLang();
  const { data: events = [] } = useQuery<ArtistEvent[]>({
    queryKey: ["artist-events-public", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_events")
        .select("id, title, event_date, venue, ticket_url")
        .eq("artist_id", artistId)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ArtistEvent[];
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="card-brut p-4" style={accent ? { borderColor: accent } : undefined}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide">
        <CalendarDays className="size-4" style={accent ? { color: accent } : undefined} /> {txt.events}
      </h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{txt.eventsEmpty}</p>
      ) : (
        <ul className="space-y-2">
          {events.map((ev) => {
            const past = ev.event_date < today;
            return (
              <li
                key={ev.id}
                className={`flex flex-wrap items-center gap-2 border-2 border-border p-2 text-sm ${past ? "opacity-70" : ""}`}
              >
                <span
                  className="border-2 border-border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest"
                  style={!past && accent ? { backgroundColor: accent, color: "#000" } : undefined}
                >
                  {past ? txt.past : txt.upcoming}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{ev.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(`${ev.event_date}T12:00:00Z`).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                    {ev.venue ? ` · ${ev.venue}` : ""}
                  </div>
                </div>
                {ev.ticket_url && (
                  <a
                    href={ev.ticket_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1 text-xs font-bold underline"
                    style={accent ? { color: accent } : undefined}
                  >
                    <Ticket className="size-3.5" /> {txt.tickets}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ArtistPosts({ artistId, accent }: { artistId: string; accent?: string | null }) {
  const txt = useTxt();
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const isSelf = uid === artistId;

  const { data: following = false } = useQuery<boolean>({
    queryKey: ["artist-following", artistId, uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from("artist_follows")
        .select("id")
        .eq("artist_id", artistId)
        .eq("follower_id", uid!)
        .maybeSingle();
      return !!data;
    },
  });

  const [category, setCategory] = useState<PostCategory | null>(null);

  const { data: posts = [] } = useQuery<ArtistPost[]>({
    queryKey: ["artist-posts-public", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, content, created_at, image_url, image_urls, visibility, category")
        .eq("author_id", artistId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as ArtistPost[];
    },
  });

  const shown = category ? posts.filter((p) => p.category === category) : posts;
  const postIds = shown.map((p) => p.id);
  const { likes, comments } = usePostInteractions(postIds);

  return (
    <div className="card-brut p-4" style={accent ? { borderColor: accent } : undefined}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide">
        <Newspaper className="size-4" style={accent ? { color: accent } : undefined} /> {txt.posts}
      </h2>
      {!isSelf && !following && (
        <p className="mb-2 flex items-center gap-1.5 border-2 border-dashed border-border p-2 text-[11px] text-muted-foreground">
          <Lock className="size-3.5 shrink-0" /> {txt.lockedHint}
        </p>
      )}
      {posts.length > 0 && (
        <div className="mb-3">
          <CategoryFilter value={category} onChange={setCategory} accent={accent} />
        </div>
      )}
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">{txt.postsEmpty}</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((p) => {
            const images = (p.image_urls && p.image_urls.length > 0 ? p.image_urls : p.image_url ? [p.image_url] : []).slice(0, 3);
            const text = stripMediaUrls(p.content);
            return (
              <li key={p.id} className="border-2 border-border p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <Link to="/p/$postId" params={{ postId: p.id }} className="text-sm font-black hover:underline">
                    {p.title || new Date(p.created_at).toLocaleDateString()}
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <CategoryBadge category={p.category} accent={accent} />
                    {(p.visibility === "profile_only" || p.visibility === "followers_only") && (
                      <span className="shrink-0 border border-border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        {p.visibility === "followers_only" ? txt.followersOnly : txt.onlyHere}
                      </span>
                    )}
                  </div>
                </div>
                {text && (
                  <TranslatedText
                    as="p"
                    className="mt-1 whitespace-pre-wrap text-sm"
                    entityType="post"
                    entityKey={p.id}
                    field="content"
                    text={text}
                    manual={false}
                  />
                )}
                <UrlEmbeds text={p.content} />
                {images.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {images.map((src) => (
                      <SmartImg key={src} src={src} alt="" width={400} height={400} className="aspect-square w-full border-2 border-border object-cover" />
                    ))}
                  </div>
                )}
                <PostInteractions
                  postId={p.id}
                  likes={likes}
                  comments={comments}
                  shareTitle={p.title ?? "Publication sur Indi Radio"}
                  shareText={stripMediaUrls(p.content)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
