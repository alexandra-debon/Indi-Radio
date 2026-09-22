import { createFileRoute, Link, notFound, redirect, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck, Trophy, Star, MessageSquare, Heart, FileText, Globe, Images, Award, Mic2, CalendarCheck, Lock, MapPin, Music2, Download, Video } from "lucide-react";
import { SocialLinksBar, type SocialLinks } from "@/components/social/SocialLinksBar";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { useT, useLang } from "@/lib/i18n";
import { breadcrumbLd, HOME_CRUMB, SITE_ORIGIN } from "@/lib/seo-breadcrumb";
import { FollowButton, ArtistEvents, ArtistPosts } from "@/components/artist/ArtistPageSections";
import { ArtistShop } from "@/components/artist/ArtistShop";
import { clampDescription } from "@/lib/i18n/seo-meta";
import { hlFromSearch, ogLocaleTags, withHl } from "@/lib/og-lang";
import { localizedOgText } from "@/lib/og-lang-head";
import { UrlEmbeds } from "@/components/media/UrlEmbeds";

type SectionKey = "events" | "shop" | "posts";

/**
 * Sur mobile, les trois grandes sections (dates, boutique, publications) sont
 * regroupées dans des onglets pour éviter un défilement interminable.
 * À partir de `md`, elles restent empilées comme avant.
 */
function ArtistSections({
  artistId,
  accent,
  showEvents,
  showShop,
  showPosts,
}: {
  artistId: string;
  accent?: string | null;
  showEvents: boolean;
  showShop: boolean;
  showPosts: boolean;
}) {
  const { lang } = useLang();
  const hash = useRouterState({ select: (s) => s.location.hash });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const sections: { key: SectionKey; id: string; label: string; node: React.ReactNode }[] = [];
  if (showEvents) {
    sections.push({
      key: "events",
      id: "dates",
      label: lang === "en" ? "Shows" : "Dates",
      node: <ArtistEvents artistId={artistId} accent={accent} />,
    });
  }
  if (showShop) {
    sections.push({
      key: "shop",
      id: "boutique",
      label: lang === "en" ? "Shop" : "Boutique",
      node: <ArtistShop artistId={artistId} accent={accent} />,
    });
  }
  if (showPosts) {
    sections.push({
      key: "posts",
      id: "publications",
      label: lang === "en" ? "Posts" : "Publications",
      node: <ArtistPosts artistId={artistId} accent={accent} />,
    });
  }

  const firstKey = sections[0]?.key ?? "posts";
  const [tab, setTab] = useState<SectionKey>(firstKey);

  useEffect(() => {
    const h = (hash || "").replace(/^#/, "");
    if (h === "boutique") setTab("shop");
    else if (h === "dates") setTab("events");
    else if (h === "publications") setTab("posts");
  }, [hash]);

  if (sections.length === 0) return null;

  const active = sections.find((s) => s.key === tab) ?? sections[0];

  if (!isMobile) {
    return (
      <>
        {sections.map((s) => (
          <div key={s.key} id={s.id} className="scroll-mt-24">
            {s.node}
          </div>
        ))}
      </>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="sticky top-14 z-20 -mx-4 grid gap-1 border-y-2 border-border bg-background px-4 py-2"
        style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}
      >
        {sections.map((s) => {
          const isActive = s.key === active.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setTab(s.key)}
              aria-current={isActive ? "true" : undefined}
              className={`truncate border-2 border-border px-1 py-2 text-[10px] font-black uppercase tracking-wide transition ${
                isActive ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
              }`}
              style={isActive && accent ? { backgroundColor: accent, borderColor: accent } : undefined}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      <div id={active.id} className="scroll-mt-24">
        {active.node}
      </div>
    </div>
  );
}


export const Route = createFileRoute("/u/$pseudo/")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("profiles")
      .select("pseudo, avatar_url, bio, points, level, role, is_certified, is_team_indi, banner_url, page_indexable, stage_name, gallery_summary, artist_genres, artist_location, social_links, website, artist_video_urls, ep_download_url")
      .ilike("pseudo", params.pseudo)
      .maybeSingle();
    if (!data) {
      const { data: currentPseudo } = await supabase.rpc("resolve_pseudo_alias", {
        _alias: params.pseudo,
      });
      if (currentPseudo && String(currentPseudo).toLowerCase() !== params.pseudo.toLowerCase()) {
        throw redirect({ to: "/u/$pseudo", params: { pseudo: String(currentPseudo) }, replace: true });
      }
    }
    return data;
  },
  head: async ({ params, loaderData, match }) => {
    // Canonical always points at the CURRENT pseudo (the one stored in the
    // profile), so old-pseudo URLs and different-case URLs consolidate to a
    // single canonical after the loader's redirect resolves them.
    const pseudo = loaderData?.pseudo ?? params.pseudo;
    const lang = hlFromSearch(match.search);
    const canonicalBase = `https://www.radio.indi-art-culture.com/u/${encodeURIComponent(pseudo)}`;
    const canonicalUrl = withHl(canonicalBase, lang);
    const requestedUrl = `https://www.radio.indi-art-culture.com/u/${encodeURIComponent(params.pseudo)}`;
    const aliasedCasing =
      loaderData?.pseudo && loaderData.pseudo !== params.pseudo;
    const isArtist = loaderData?.role === "artiste" || (loaderData as any)?.role === "media";
    const roleLabel = loaderData?.is_team_indi
      ? "Team InDi"
      : loaderData?.role === "artiste"
        ? "Artiste indépendant"
        : (loaderData as any)?.role === "media"
          ? "Média indépendant"
          : loaderData?.role === "animateur"
            ? "Animateur"
            : "Auditeur";
    // Le nom de scène est le terme que les internautes recherchent : il passe
    // en tête du titre, le pseudo reste en repli.
    const stageName = ((loaderData as any)?.stage_name ?? "").trim();
    const displayName = stageName || pseudo;
    const genres = (((loaderData as any)?.artist_genres ?? []) as string[]).filter(Boolean);
    const artistLocation = (((loaderData as any)?.artist_location ?? "") as string).trim();
    const identity = [genres.slice(0, 3).join(", "), artistLocation].filter(Boolean).join(" · ");
    const baseTitle = isArtist
      ? `${displayName} — ${roleLabel} sur InDi RaDio`
      : `@${pseudo} — ${roleLabel} sur InDi RaDio`;
    const bio = (loaderData?.bio ?? "").replace(/\s+/g, " ").trim();
    const pitch = (((loaderData as any)?.gallery_summary ?? "") as string).replace(/\s+/g, " ").trim();
    const summarySource = pitch || bio;
    const baseDesc = summarySource
      ? `${displayName}${identity ? ` — ${identity}` : ""}. ${summarySource}`
      : isArtist
        ? `${displayName}, ${roleLabel.toLowerCase()}${identity ? ` — ${identity}` : ""} sur InDi RaDio : musique, actualités, concerts et publications.`
        : `Profil de @${pseudo} sur InDi RaDio — ${roleLabel}${
            loaderData ? `, niveau ${loaderData.level} · ${loaderData.points} pts` : ""
          }. Réseau social de la musique indépendante.`;
    const localized = await localizedOgText(lang, {
      entityType: "profile",
      entityKey: pseudo,
      title: baseTitle,
      description: baseDesc,
    });
    const title = localized.title;
    const desc = clampDescription(localized.description);
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
      { property: "og:url", content: canonicalUrl },
      { property: "og:type", content: "profile" },
      { property: "profile:username", content: pseudo },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:site_name", content: "InDi RaDio" },
      ...ogLocaleTags(lang),
    ];
    // Unresolved pseudo (no profile, no redirect target) — keep it out of the
    // index so stale links don't pollute search results.
    if (!loaderData) {
      meta.push({ name: "robots", content: "noindex, follow" });
    } else if ((loaderData as any).page_indexable === false) {
      // L'artiste a désactivé la visibilité de sa page sur les moteurs.
      meta.push({ name: "robots", content: "noindex, nofollow" });
    } else if (aliasedCasing) {
      // Different casing than the canonical: tell crawlers to prefer the
      // canonical URL and not to index this alias.
      meta.push({ name: "robots", content: "noindex, follow" });
    }
    const socials = ((loaderData as any)?.social_links ?? {}) as Record<string, unknown>;
    const sameAs = [
      ...Object.values(socials),
      (loaderData as any)?.website,
      (loaderData as any)?.ep_download_url,
    ].filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u));
    const ogImage = (loaderData as any)?.banner_url || loaderData?.avatar_url;
    if (ogImage) {
      meta.push({ property: "og:image", content: ogImage });
      meta.push({ name: "twitter:image", content: ogImage });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: canonicalUrl }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            url: canonicalUrl,
            ...(aliasedCasing ? { sameAs: [requestedUrl] } : {}),
            name: title,
            description: desc,
            inLanguage: lang === "en" ? "en-US" : "fr-FR",
            mainEntity: {
              "@type": isArtist ? "MusicGroup" : "Person",
              name: displayName,
              alternateName: `@${pseudo}`,
              url: canonicalUrl,
              ...(loaderData?.avatar_url ? { image: loaderData.avatar_url } : {}),
              ...(desc ? { description: desc } : {}),
              ...(genres.length > 0 ? { genre: genres } : {}),
              ...(artistLocation ? { homeLocation: { "@type": "Place", name: artistLocation } } : {}),
              ...(sameAs.length > 0 ? { sameAs } : {}),
            },
          }),
        },
        breadcrumbLd([
          HOME_CRUMB,
          isArtist
            ? { name: "Artistes", url: `${SITE_ORIGIN}/artistes` }
            : { name: "Top utilisateurs", url: `${SITE_ORIGIN}/top-users` },
          { name: isArtist ? displayName : `@${pseudo}`, url: canonicalUrl },
        ]),
      ],
    };
  },
  component: UserProfilePage,
  errorComponent: ({ error }) => <div className="p-4 text-sm text-destructive" role="alert">{error.message}</div>,
  notFoundComponent: () => <UserNotFound />,
});

function UserNotFound() {
  const t = useT();
  return <div className="p-4">{t("upub.notFound")}</div>;
}

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
  banner_url: string | null;
  banner_color: string | null;
  accent_color: string | null;
  stage_name: string | null;
  gallery_summary: string | null;
  artist_genres: string[];
  artist_location: string | null;
  show_events_section: boolean | null;
  show_shop_section: boolean | null;
  show_posts_section: boolean | null;
  artist_video_urls: string[];
  ep_download_url: string | null;
};

type Stats = { posts: number; comments: number; likesGiven: number };

type AchievementDef = {
  key: string;
  action: "post" | "comment" | "dedicace" | "like_received" | "presence";
  threshold: number;
  icon: React.ComponentType<{ className?: string }>;
  unique_days?: boolean;
};

const ACHIEVEMENTS: AchievementDef[] = [
  { key: "post_1", action: "post", threshold: 1, icon: FileText },
  { key: "post_10", action: "post", threshold: 10, icon: FileText },
  { key: "post_50", action: "post", threshold: 50, icon: FileText },
  { key: "comment_1", action: "comment", threshold: 1, icon: MessageSquare },
  { key: "comment_25", action: "comment", threshold: 25, icon: MessageSquare },
  { key: "comment_100", action: "comment", threshold: 100, icon: MessageSquare },
  { key: "dedicace_1", action: "dedicace", threshold: 1, icon: Mic2 },
  { key: "dedicace_10", action: "dedicace", threshold: 10, icon: Mic2 },
  { key: "like_10", action: "like_received", threshold: 10, icon: Heart },
  { key: "like_50", action: "like_received", threshold: 50, icon: Heart },
  { key: "presence_7", action: "presence", threshold: 7, icon: CalendarCheck, unique_days: true },
  { key: "presence_30", action: "presence", threshold: 30, icon: CalendarCheck, unique_days: true },
];

async function fetchAchievements(userId: string) {
  const { data } = await supabase
    .from("point_events")
    .select("action, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  const events = data ?? [];
  const byAction: Record<string, { created_at: string }[]> = {};
  for (const e of events) (byAction[e.action] ??= []).push(e);
  return ACHIEVEMENTS.map((a) => {
    const evts = byAction[a.action] ?? [];
    const counted = a.unique_days
      ? Array.from(new Set(evts.map((e) => e.created_at.slice(0, 10)))).sort()
      : evts.map((e) => e.created_at);
    const unlocked = counted.length >= a.threshold;
    const obtainedAt = unlocked ? counted[a.threshold - 1] : null;
    return { ...a, progress: counted.length, unlocked, obtainedAt };
  });
}

async function fetchProfile(pseudo: string): Promise<{ profile: Profile; stats: Stats }> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, pseudo, avatar_url, points, level, role, is_certified, is_team_indi, badges, created_at, bio, website, social_links, banner_url, banner_color, accent_color, stage_name, gallery_summary, artist_genres, artist_location, show_events_section, show_shop_section, show_posts_section, artist_video_urls, ep_download_url")
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
  const t = useT();
  const thresholds = [0, 20, 60, 150, 300];
  const nextIdx = Math.min(level, 4);
  const base = thresholds[nextIdx - 1] ?? 0;
  const next = thresholds[nextIdx] ?? points;
  const pct = level >= 5 ? 100 : Math.min(100, Math.round(((points - base) / (next - base)) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>{t("upub.level")} {level}</span>
        <span>{level >= 5 ? t("upub.max") : `${points} / ${next} ${t("profile.pts")}`}</span>
      </div>
      <div className="h-3 w-full border-2 border-border bg-radio-surface">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function UserProfilePage() {
  const { pseudo } = Route.useParams();
  const t = useT();
  const { lang } = useLang();
  const { data, isLoading, error } = useQuery({
    queryKey: ["profile", pseudo],
    queryFn: () => fetchProfile(pseudo),
  });
  const { data: albums = [] } = useQuery({
    queryKey: ["profile-albums", data?.profile.id],
    enabled: !!data?.profile.id,
    queryFn: () => fetchAlbums(data!.profile.id),
  });
  const { data: achievements = [] } = useQuery({
    queryKey: ["profile-achievements", data?.profile.id],
    enabled: !!data?.profile.id,
    queryFn: () => fetchAchievements(data!.profile.id),
  });
  const [openKey, setOpenKey] = useState<string | null>(null);
  const selected = achievements.find((a) => a.key === openKey) ?? null;

  // Ancre `#boutique` : le contenu est chargé de façon asynchrone, on scrolle
  // une fois la section réellement présente dans le DOM.
  const hash = useRouterState({ select: (s) => s.location.hash });
  useEffect(() => {
    if (!hash) return;
    let tries = 0;
    const tick = () => {
      const el = document.getElementById(hash.replace(/^#/, ""));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (tries++ < 20) setTimeout(tick, 100);
    };
    tick();
  }, [hash, data?.profile.id]);


  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">{t("upub.loading")}</div>;
  if (error || !data) return <div className="p-4">{t("upub.notFound")} <Link to="/top-users" className="underline">{t("upub.back")}</Link></div>;

  const { profile, stats } = data;
  const joined = new Date(profile.created_at).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { year: "numeric", month: "long" });

  const isArtistPage = profile.role === "artiste" || profile.role === "media";
  const accent = isArtistPage && profile.accent_color ? profile.accent_color : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <Link to="/top-users" className="text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground">{t("upub.backTop")}</Link>

      {isArtistPage && profile.banner_url && (
        <div className="overflow-hidden border-2 border-border" style={accent ? { borderColor: accent } : undefined}>
          <img
            src={profile.banner_url}
            alt={`Bannière de @${profile.pseudo}`}
            className="aspect-[2/1] w-full object-cover sm:aspect-[1920/480]"
          />
        </div>
      )}
      {isArtistPage && !profile.banner_url && (profile.banner_color || accent) && (
        <div
          className="aspect-[6/1] w-full border-2 border-border"
          style={{
            backgroundColor: profile.banner_color || accent || undefined,
            borderColor: accent || undefined,
          }}
          aria-hidden="true"
        />
      )}

      <div className="card-brut p-4 space-y-4" style={accent ? { borderColor: accent } : undefined}>
        <div className="flex items-center gap-3 sm:gap-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="size-14 shrink-0 rounded-full object-cover border-2 border-border sm:size-20" />
          ) : (
            <div className="grid size-14 shrink-0 place-items-center rounded-full bg-muted text-lg font-black uppercase sm:size-20">
              {profile.pseudo.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-xl font-black sm:text-2xl" style={accent ? { color: accent } : undefined}>
                {isArtistPage && profile.stage_name ? profile.stage_name : `@${profile.pseudo}`}
              </h1>
              {profile.is_certified && <BadgeCheck className="size-5 text-primary" aria-label={t("upub.certified")} />}
            </div>
            {isArtistPage && profile.stage_name && (
              <div className="truncate text-xs text-muted-foreground">@{profile.pseudo}</div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              <span>{profile.role}</span>
              {profile.is_team_indi && <span className="border border-border bg-primary px-1.5 py-0.5 text-foreground">{t("upub.teamIndi")}</span>}
              <span>· {t("upub.memberSince")} {joined}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className="text-2xl font-black tabular-nums text-primary sm:text-3xl">{profile.points}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("upub.points")}</span>
          </div>
        </div>

        {isArtistPage && profile.gallery_summary && (
          <TranslatedText
            as="p"
            className="whitespace-pre-wrap text-sm"
            entityType="profile"
            entityKey={profile.id}
            field="gallery_summary"
            text={profile.gallery_summary}
            manual={false}
          />
        )}

        {isArtistPage && (profile.artist_genres.length > 0 || profile.artist_location) && (
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
            {profile.artist_genres.length > 0 && (
              <span className="inline-flex items-center gap-1.5 border border-border px-2 py-1">
                <Music2 className="size-3.5" aria-hidden="true" />
                <TranslatedText
                  as="span"
                  entityType="profile"
                  entityKey={profile.id}
                  field="artist_genres"
                  text={profile.artist_genres.join(" · ")}
                  manual={false}
                />
              </span>
            )}
            {profile.artist_location && (
              <span className="inline-flex items-center gap-1.5 border border-border px-2 py-1">
                <MapPin className="size-3.5" aria-hidden="true" />
                {profile.artist_location}
              </span>
            )}
          </div>
        )}

        <LevelBar points={profile.points} level={profile.level} />
        <FollowButton artistId={profile.id} accent={accent} />
        {profile.role === "artiste" && profile.is_certified && (
          <a
            href={`/?mention=${encodeURIComponent(profile.pseudo)}`}
            className="inline-flex items-center justify-center gap-1.5 border-2 border-border bg-primary px-3 py-2 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-[2px_2px_0_0_hsl(var(--border))] transition hover:-translate-y-0.5"
          >
            <MessageSquare className="size-3.5" /> {t("gallery.writeTo")}
          </a>
        )}
      </div>

      {(profile.bio || profile.website || profile.ep_download_url || (profile.social_links && Object.keys(profile.social_links).some((k) => k !== "__order" && k !== "__labels"))) && (
        <div className="card-brut space-y-2 p-4">
          {profile.bio && <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide"><FileText className="size-4 text-primary" /> {t("upub.biography")}</h2>}
          {profile.bio && (
            <TranslatedText
              as="p"
              className="whitespace-pre-wrap text-sm"
              entityType="profile"
              entityKey={profile.id}
              field="bio"
              text={profile.bio}
              manual={false}
            />
          )}
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
          {profile.ep_download_url && (
            <Button asChild className="mt-2 w-full sm:w-auto" style={accent ? { backgroundColor: accent, borderColor: accent } : undefined}>
              <a href={profile.ep_download_url} target="_blank" rel="noopener noreferrer nofollow">
                <Download className="size-4" /> {t("upub.downloadEp")}
              </a>
            </Button>
          )}
        </div>
      )}

      {isArtistPage && profile.artist_video_urls.length > 0 && (
        <section className="card-brut p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide">
            <Video className="size-4 text-primary" /> {t("upub.videos")}
          </h2>
          <UrlEmbeds text={profile.artist_video_urls.join("\n")} hidePreviews />
        </section>
      )}

      <ArtistSections
        artistId={profile.id}
        accent={accent}
        showEvents={isArtistPage && profile.show_events_section !== false}
        showShop={profile.show_shop_section !== false}
        showPosts={profile.show_posts_section !== false}
      />


      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={FileText} label={t("upub.stats.posts")} value={stats.posts} />
        <StatCard icon={MessageSquare} label={t("upub.stats.comments")} value={stats.comments} />
        <StatCard icon={Heart} label={t("upub.stats.likes")} value={stats.likesGiven} />
      </div>

      <div className="card-brut p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wide">
          <Trophy className="size-4 text-primary" /> {t("upub.badges")}
        </h2>
        {profile.badges.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("upub.badgesEmpty")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {profile.badges.map((b) => (
              <li key={b} className="flex items-center gap-1 border-2 border-border bg-primary px-2 py-1 text-xs font-black uppercase tracking-wider text-black">
                <Star className="size-3" /> {b}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-brut p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide">
          <Award className="size-4 text-primary" /> {t("upub.achievements")}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {achievements.map((a) => {
            const Icon = a.icon;
            const pct = Math.min(100, Math.round((a.progress / a.threshold) * 100));
            return (
              <li key={a.key}>
              <button
                type="button"
                onClick={() => setOpenKey(a.key)}
                className={"card-brut w-full space-y-1.5 p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary " + (a.unlocked ? "border-primary bg-primary/5" : "opacity-80")}
              >
                <div className="flex items-center gap-2">
                  <div className={"grid size-8 place-items-center rounded-md border-2 border-border " + (a.unlocked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    {a.unlocked ? <Icon className="size-4" /> : <Lock className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black">{t(`ach.${a.key}.label` as never)}</div>
                    <div className="text-[11px] text-muted-foreground">{Math.min(a.progress, a.threshold)} / {a.threshold}</div>
                  </div>
                </div>
                <div className="h-1.5 w-full border border-border bg-radio-surface">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </button>
              </li>
            );
          })}
        </ul>
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setOpenKey(null)}>
        <DialogContent className="max-w-md">
          {selected && (() => {
            const Icon = selected.icon;
            const pct = Math.min(100, Math.round((selected.progress / selected.threshold) * 100));
            const remaining = Math.max(0, selected.threshold - selected.progress);
            const obtained = selected.obtainedAt
              ? (() => {
                  const d = new Date(selected.obtainedAt);
                  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12));
                  return format(utc, "d MMM yyyy", { locale: lang === "en" ? enUS : fr });
                })()
              : null;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={"grid size-12 place-items-center rounded-md border-2 border-border " + (selected.unlocked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {selected.unlocked ? <Icon className="size-6" /> : <Lock className="size-6" />}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <DialogTitle className="text-base font-black">{t(`ach.${selected.key}.label` as never)}</DialogTitle>
                      <DialogDescription className="text-xs">{t(`ach.${selected.key}.desc` as never)}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                    <span className="text-muted-foreground">{t("upub.status")}</span>
                    <span className={selected.unlocked ? "text-primary" : "text-muted-foreground"}>
                      {selected.unlocked ? t("upub.unlocked") : t("upub.locked")}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-bold">{t("upub.progress")}</span>
                      <span className="text-muted-foreground">{Math.min(selected.progress, selected.threshold)} / {selected.threshold}</span>
                    </div>
                    <div className="h-2 w-full border-2 border-border bg-radio-surface">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    {!selected.unlocked && (
                      <div className="text-[11px] text-muted-foreground">{t("upub.remaining")} : {remaining}</div>
                    )}
                  </div>
                  {obtained && (
                    <div className="rounded-md border-2 border-primary bg-primary/5 p-2 text-xs font-semibold">
                      {t("upub.unlockedOn")} {obtained}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenKey(null)}>{t("upub.close")}</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <div className="card-brut p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide">
          <Images className="size-4 text-primary" /> {t("upub.albums")}
        </h2>
        {albums.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("upub.albumsEmpty")}</p>
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
                  <div className="text-[11px] text-muted-foreground">{a.count} {a.count > 1 ? t("upub.photos") : t("upub.photo")}</div>
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