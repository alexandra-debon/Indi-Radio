import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck, Trophy, Star, MessageSquare, Heart, FileText, Globe, Images } from "lucide-react";
import { SocialLinksBar, type SocialLinks } from "@/components/social/SocialLinksBar";

export const Route = createFileRoute("/u/$pseudo")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.pseudo} — Profil | InDi RaDio` },
      { name: "description", content: `Profil de @${params.pseudo} sur InDi RaDio : points, niveau et badges.` },
      { property: "og:title", content: `@${params.pseudo} — InDi RaDio` },
      { property: "og:description", content: `Découvrez le profil de @${params.pseudo}.` },
    ],
  }),
  component: UserProfilePage,
  errorComponent: ({ error }) => <div className="p-4 text-sm text-destructive" role="alert">{error.message}</div>,
  notFoundComponent: () => <div className="p-4">Utilisateur introuvable.</div>,
});

type Profile = {
  id: string;
  pseudo: string;
  avatar_url: string | null;
  points: number;
  level: number;
  role: string;
  is_certified: boolean;
  is_team_indi: boolean;
  badges: string[];
  created_at: string;
  bio: string | null;
  website: string | null;
  social_links: SocialLinks | null;
};

type Stats = { posts: number; comments: number; likesGiven: number };

async function fetchProfile(pseudo: string): Promise<{ profile: Profile; stats: Stats }> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, pseudo, avatar_url, points, level, role, is_certified, is_team_indi, badges, created_at, bio, website, social_links")
    .ilike("pseudo", pseudo)
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw notFound();

  const [{ count: posts }, { count: postComments }, { count: newsComments }, { count: postLikes }, { count: newsLikes }] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", profile.id),
    supabase.from("post_comments").select("id", { count: "exact", head: true }).eq("author_id", profile.id),
    supabase.from("news_comments").select("id", { count: "exact", head: true }).eq("author_id", profile.id),
    supabase.from("post_likes").select("post_id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase.from("news_likes").select("news_post_id", { count: "exact", head: true }).eq("user_id", profile.id),
  ]);

  return {
    profile: profile as Profile,
    stats: {
      posts: posts ?? 0,
      comments: (postComments ?? 0) + (newsComments ?? 0),
      likesGiven: (postLikes ?? 0) + (newsLikes ?? 0),
    },
  };
}

type AlbumSummary = { id: string; title: string; description: string | null; cover_url: string | null; count: number };

async function fetchAlbums(ownerId: string): Promise<AlbumSummary[]> {
  const { data: albums, error } = await supabase
    .from("photo_albums")
    .select("id, title, description, cover_url")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const list = (albums ?? []) as { id: string; title: string; description: string | null; cover_url: string | null }[];
  if (list.length === 0) return [];
  const results: AlbumSummary[] = [];
  for (const a of list) {
    const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("album_id", a.id);
    let cover = a.cover_url;
    if (!cover) {
      const { data: firstPost } = await supabase
        .from("posts")
        .select("image_url, image_urls")
        .eq("album_id", a.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      cover = (firstPost?.image_urls?.[0]) ?? firstPost?.image_url ?? null;
    }
    results.push({ ...a, cover_url: cover, count: count ?? 0 });
  }
  return results;
}

function LevelBar({ points, level }: { points: number; level: number }) {
  const thresholds = [0, 20, 60, 150, 300];
  const nextIdx = Math.min(level, 4);
  const base = thresholds[nextIdx - 1] ?? 0;
  const next = thresholds[nextIdx] ?? points;
  const pct = level >= 5 ? 100 : Math.min(100, Math.round(((points - base) / (next - base)) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>Niveau {level}</span>
        <span>{level >= 5 ? "MAX" : `${points} / ${next} pts`}</span>
      </div>
      <div className="h-3 w-full border-2 border-border bg-radio-surface">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function UserProfilePage() {
  const { pseudo } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["profile", pseudo],
    queryFn: () => fetchProfile(pseudo),
  });
  const { data: albums = [] } = useQuery({
    queryKey: ["profile-albums", data?.profile.id],
    enabled: !!data?.profile.id,
    queryFn: () => fetchAlbums(data!.profile.id),
  });

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Chargement…</div>;
  if (error || !data) return <div className="p-4">Utilisateur introuvable. <Link to="/top-users" className="underline">Retour</Link></div>;

  const { profile, stats } = data;
  const joined = new Date(profile.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <Link to="/top-users" className="text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground">← Top utilisateurs</Link>

      <div className="card-brut p-4 space-y-4">
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="size-20 rounded-full object-cover border-2 border-border" />
          ) : (
            <div className="grid size-20 place-items-center rounded-full bg-muted text-lg font-black uppercase">
              {profile.pseudo.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-2xl font-black">@{profile.pseudo}</h1>
              {profile.is_certified && <BadgeCheck className="size-5 text-primary" aria-label="Certifié" />}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              <span>{profile.role}</span>
              {profile.is_team_indi && <span className="border border-border bg-primary px-1.5 py-0.5 text-foreground">Team InDi</span>}
              <span>· Membre depuis {joined}</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-3xl font-black tabular-nums text-primary">{profile.points}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">points</span>
          </div>
        </div>

        <LevelBar points={profile.points} level={profile.level} />
      </div>

      {(profile.bio || profile.website || (profile.social_links && Object.keys(profile.social_links).some((k) => k !== "__order" && k !== "__labels"))) && (
        <div className="card-brut space-y-2 p-4">
          {profile.bio && <p className="whitespace-pre-wrap text-sm">{profile.bio}</p>}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary underline"
            >
              <Globe className="size-3.5" /> {profile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          {profile.social_links && <SocialLinksBar links={profile.social_links} />}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={FileText} label="Publications" value={stats.posts} />
        <StatCard icon={MessageSquare} label="Commentaires" value={stats.comments} />
        <StatCard icon={Heart} label="Likes donnés" value={stats.likesGiven} />
      </div>

      <div className="card-brut p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wide">
          <Trophy className="size-4 text-primary" /> Badges
        </h2>
        {profile.badges.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun badge pour le moment.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {profile.badges.map((b) => (
              <li key={b} className="flex items-center gap-1 border-2 border-border bg-primary px-2 py-1 text-xs font-bold text-foreground">
                <Star className="size-3" /> {b}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-brut p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide">
          <Images className="size-4 text-primary" /> Albums photos
        </h2>
        {albums.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun album partagé pour le moment.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {albums.map((a) => (
              <Link
                key={a.id}
                to="/u/$pseudo/albums/$albumId"
                params={{ pseudo: profile.pseudo, albumId: a.id }}
                className="card-brut overflow-hidden transition hover:-translate-y-0.5"
              >
                <div className="relative aspect-video w-full bg-muted">
                  {a.cover_url ? (
                    <img src={a.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-foreground"><Images className="size-6" /></div>
                  )}
                </div>
                <div className="p-2">
                  <div className="truncate text-sm font-bold">{a.title}</div>
                  <div className="text-[11px] text-muted-foreground">{a.count} photo{a.count > 1 ? "s" : ""}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: number }) {
  return (
    <div className="card-brut p-3 text-center">
      <Icon className="mx-auto size-4 text-primary" />
      <div className="mt-1 text-xl font-black tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}