import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/media/ImageUploader";
import { Switch } from "@/components/ui/switch";
import { ArtistShopManager } from "@/components/artist/ArtistShopManager";
import { MultiImageUploader } from "@/components/media/MultiImageUploader";
import { SocialLinksEditor, sanitizeLinks, type SocialLinks } from "@/components/social/SocialLinksBar";
import { VisibilityPicker, visibilityLabel, type PostVisibility } from "@/components/social/VisibilityPicker";
import { CategoryPicker, type PostCategory } from "@/components/social/PostCategory";
import { isValidVideoUrl } from "@/lib/media-embed";
import { toast } from "@/lib/toast";
import { ArrowLeft, Loader2, Trash2, CalendarPlus, Palette, Image as ImageIcon, Send, Eye, EyeOff, Globe, HelpCircle } from "lucide-react";
import { PendingCertificationNotice } from "@/components/artist/PendingCertificationNotice";
import { openArtistTour } from "@/components/onboarding/ArtistTour";
import { useLang } from "@/lib/i18n";
import { ARTIST_SPACE_TXT } from "@/components/artist/artist-space-i18n";

export const Route = createFileRoute("/_authenticated/profile/artiste")({
  head: () => ({
    meta: [
      { title: "Ma page artiste — InDi RaDio" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ArtistSpacePage,
});

const ACCENT_PRESETS = ["#FFD400", "#FF5C38", "#33D6A6", "#4FA3FF", "#C77DFF", "#FF8FB1"];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

type ArtistEvent = {
  id: string;
  title: string;
  event_date: string;
  venue: string | null;
  ticket_url: string | null;
};

type OwnPost = {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  visibility: string;
};

function ArtistSpacePage() {
  const { profile, session } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { lang } = useLang();
  const isEn = lang === "en";
  const T = ARTIST_SPACE_TXT[isEn ? "en" : "fr"];

  const [banner, setBanner] = useState("");
  const [accent, setAccent] = useState("");
  const [summary, setSummary] = useState("");
  const [genres, setGenres] = useState("");
  const [artistLocation, setArtistLocation] = useState("");
  const [links, setLinks] = useState<SocialLinks>({});
  const [saving, setSaving] = useState(false);
  const [showEvents, setShowEvents] = useState(true);
  const [showShop, setShowShop] = useState(true);
  const [showPosts, setShowPosts] = useState(true);
  const [bannerColor, setBannerColor] = useState("");
  const [bannerKind, setBannerKind] = useState<"photo" | "color">("photo");
  const [indexable, setIndexable] = useState(true);

  useEffect(() => {
    if (!profile) return;
    setBanner((profile as any).banner_url ?? "");
    setAccent((profile as any).accent_color ?? "");
    setSummary((profile as any).gallery_summary ?? "");
    setGenres(((profile as any).artist_genres ?? []).join(", "));
    setArtistLocation((profile as any).artist_location ?? "");
    setShowEvents((profile as any).show_events_section ?? true);
    setShowShop((profile as any).show_shop_section ?? true);
    setShowPosts((profile as any).show_posts_section ?? true);
    setBannerColor((profile as any).banner_color ?? "");
    setBannerKind((profile as any).banner_url ? "photo" : (profile as any).banner_color ? "color" : "photo");
    setIndexable((profile as any).page_indexable ?? true);
    const sl = (profile as any).social_links;
    setLinks(sl && typeof sl === "object" ? (sl as SocialLinks) : {});
  }, [profile]);

  const uid = session?.user.id ?? null;
  const requestedRole = (profile as any)?.role_requested as string | undefined;
  // Accès dès la candidature déposée : l'artiste peut tout préparer avant la
  // validation. L'affichage public reste celui d'un auditeur tant que
  // `role` n'a pas été basculé par l'équipe.
  const isArtistOrMedia =
    profile?.role === "artiste" ||
    (profile as any)?.role === "media" ||
    requestedRole === "artiste" ||
    requestedRole === "media";
  const isPendingArtist =
    (profile as any)?.role_request_status === "pending" &&
    profile?.role !== "artiste" &&
    (profile as any)?.role !== "media";

  const { data: events = [] } = useQuery<ArtistEvent[]>({
    queryKey: ["artist-events", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_events")
        .select("id, title, event_date, venue, ticket_url")
        .eq("artist_id", uid!)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ArtistEvent[];
    },
  });

  const { data: ownPosts = [] } = useQuery<OwnPost[]>({
    queryKey: ["artist-own-posts", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, content, created_at, visibility")
        .eq("author_id", uid!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as OwnPost[];
    },
  });

  const { data: followers = 0 } = useQuery<number>({
    queryKey: ["artist-followers", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { count } = await supabase
        .from("artist_follows")
        .select("id", { count: "exact", head: true })
        .eq("artist_id", uid!);
      return count ?? 0;
    },
  });

  // ---- Événements ----
  const [evTitle, setEvTitle] = useState("");
  const [evDate, setEvDate] = useState("");
  const [evVenue, setEvVenue] = useState("");
  const [evUrl, setEvUrl] = useState("");

  const addEvent = useMutation({
    mutationFn: async () => {
      if (!uid) return;
      if (!evTitle.trim() || !evDate) throw new Error(T.evRequired);
      if (evUrl.trim() && !/^https?:\/\/.+\..+/.test(evUrl.trim())) throw new Error(T.evBadUrl);
      const { error } = await supabase.from("artist_events").insert({
        artist_id: uid,
        title: evTitle.trim(),
        event_date: evDate,
        venue: evVenue.trim() || null,
        ticket_url: evUrl.trim() || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setEvTitle(""); setEvDate(""); setEvVenue(""); setEvUrl("");
      toast.success(T.dateAdded);
      qc.invalidateQueries({ queryKey: ["artist-events"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("artist_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(T.dateDeleted);
      qc.invalidateQueries({ queryKey: ["artist-events"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  // ---- Publication ----
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [postVideo, setPostVideo] = useState("");
  const [postImages, setPostImages] = useState<string[]>([]);
  const [postVisibility, setPostVisibility] = useState<PostVisibility>("feed");
  const [postCategory, setPostCategory] = useState<PostCategory | null>(null);

  const publish = useMutation({
    mutationFn: async () => {
      if (!uid) return;
      const body = postBody.trim();
      const video = postVideo.trim();
      if (!body && !video && postImages.length === 0) throw new Error(T.postEmpty);
      if (video && !isValidVideoUrl(video)) throw new Error(T.postBadVideo);
      const content = video ? (body ? `${body}\n${video}` : video) : body;
      const { error } = await supabase.from("posts").insert({
        author_id: uid,
        content,
        title: postTitle.trim() || null,
        image_url: postImages[0] ?? null,
        image_urls: postImages,
        image_captions: new Array(postImages.length).fill(""),
        visibility: postVisibility,
        category: postCategory,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setPostTitle(""); setPostBody(""); setPostVideo(""); setPostImages([]); setPostCategory(null);
      toast.success(T.postPublished);
      qc.invalidateQueries({ queryKey: ["artist-own-posts"] });
      qc.invalidateQueries({ queryKey: ["wall-posts"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  // Suppression : même permission que sur le mur (RLS « auteur ou admin »).
  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(T.postDeleted);
      qc.invalidateQueries({ queryKey: ["artist-own-posts"] });
      qc.invalidateQueries({ queryKey: ["wall-posts"] });
      qc.invalidateQueries({ queryKey: ["artist-posts-public"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const setVisibility = useMutation({
    mutationFn: async ({ id, visibility }: { id: string; visibility: string }) => {
      const { error } = await supabase.from("posts").update({ visibility } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["artist-own-posts"] });
      qc.invalidateQueries({ queryKey: ["wall-posts"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  async function saveIdentity(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    if (accent && !HEX_RE.test(accent)) {
      toast.error(T.badColor);
      return;
    }
    if (bannerKind === "color" && bannerColor && !HEX_RE.test(bannerColor)) {
      toast.error(T.badBannerColor);
      return;
    }
    setSaving(true);
    try {
      const artistGenres = Array.from(
        new Set(genres.split(",").map((genre) => genre.trim()).filter(Boolean)),
      ).slice(0, 8);
      const { error } = await supabase
        .from("profiles")
        .update({
          banner_url: bannerKind === "photo" ? banner || null : null,
          banner_color: bannerKind === "color" ? bannerColor || null : null,
          page_indexable: indexable,
          accent_color: accent || null,
          gallery_summary: summary.trim() || null,
          artist_genres: artistGenres,
          artist_location: artistLocation.trim() || null,
          social_links: sanitizeLinks(links),
          show_events_section: showEvents,
          show_shop_section: showShop,
          show_posts_section: showPosts,
        } as any)
        .eq("id", uid);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["profile", uid] });
      toast.success(T.pageSaved);
    } catch (err: any) {
      toast.error(err?.message ?? T.saveError);
    } finally {
      setSaving(false);
    }
  }

  if (!profile || !session) return <div className="p-4">{ARTIST_SPACE_TXT[lang === "en" ? "en" : "fr"].loading}</div>;

  if (!isArtistOrMedia) {
    return (
      <div className="space-y-3 p-2">
        <h1 className="section-title">{T.spaceTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {T.reservedHint}
        </p>
        <Button variant="outline" onClick={() => navigate({ to: "/profile" })}>{T.backToProfile}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/profile" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
        <ArrowLeft className="size-4" /> {T.back}
      </Link>
      {isPendingArtist && <PendingCertificationNotice />}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="section-title">{T.myArtistPage}</h1>
        <Button type="button" variant="outline" size="sm" onClick={() => openArtistTour()}>
          <HelpCircle className="size-4" /> {T.artistTour}
        </Button>
        <div className="text-xs text-muted-foreground">
          {followers} {followers > 1 ? T.followersMany : T.followersOne} ·{" "}
          <Link to="/u/$pseudo" params={{ pseudo: profile.pseudo }} className="underline">
            {T.viewPublicPage}
          </Link>
        </div>
      </div>

      {/* Identité visuelle */}
      <form onSubmit={saveIdentity} className="card-brut space-y-5 p-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><ImageIcon className="size-4" /> {T.banner}</Label>
          <div className="flex gap-2">
            {([["photo", T.bannerPhoto], ["color", T.bannerColor]] as const).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setBannerKind(k)}
                aria-pressed={bannerKind === k}
                className={
                  "border-2 border-border px-2 py-1 text-[11px] font-black uppercase tracking-wide " +
                  (bannerKind === k ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")
                }
              >
                {lbl}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {T.bannerHint}
          </p>
          {bannerKind === "photo" && (
            <ImageUploader value={banner} onChange={setBanner} folder={`banners/${session.user.id}`} label={T.bannerUploadLabel} usage="banner" defaultRatio="16:9" />
          )}
          {bannerKind === "photo" && banner && (
            <div className="relative overflow-hidden rounded-sm border-2 border-border">
              <img src={banner} alt={T.bannerPreviewAlt} className="aspect-[16/9] w-full object-cover sm:aspect-[1920/480]" />
              <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[60%] -translate-x-1/2 border-x-2 border-dashed border-primary/70" />
            </div>
          )}
          {bannerKind === "color" && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {ACCENT_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`${T.bannerSwatch} ${c}`}
                    onClick={() => setBannerColor(c)}
                    className={`size-8 rounded-sm border-2 ${bannerColor.toLowerCase() === c.toLowerCase() ? "border-foreground" : "border-border"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <Input
                  value={bannerColor}
                  onChange={(e) => setBannerColor(e.target.value)}
                  placeholder="#FFD400"
                  className="w-32"
                  aria-label={T.bannerColorAria}
                />
              </div>
              <div
                className="aspect-[6/1] w-full border-2 border-border"
                style={{ backgroundColor: bannerColor || "hsl(var(--muted))" }}
              />
              <p className="text-[11px] text-muted-foreground">
                {T.bannerFallbackHint}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="accent" className="flex items-center gap-1.5"><Palette className="size-4" /> {T.accent}</Label>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`${T.colorSwatch} ${c}`}
                onClick={() => setAccent(c)}
                className={`size-8 rounded-sm border-2 ${accent.toLowerCase() === c.toLowerCase() ? "border-foreground" : "border-border"}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <Input
              id="accent"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              placeholder="#FFD400"
              className="w-32"
            />
            {accent && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setAccent("")}>{T.reset}</Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{T.accentHint}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="summary">{T.summary}</Label>
          <Textarea id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} maxLength={600} placeholder={T.summaryPlaceholder} />
          <p className="text-[11px] text-muted-foreground">{summary.length}/600</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="artist-genres">{T.genres}</Label>
            <Input
              id="artist-genres"
              value={genres}
              onChange={(e) => setGenres(e.target.value)}
              maxLength={240}
              placeholder={T.genresPlaceholder}
            />
            <p className="text-[11px] text-muted-foreground">{T.genresHint}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="artist-location">{T.location}</Label>
            <Input
              id="artist-location"
              value={artistLocation}
              onChange={(e) => setArtistLocation(e.target.value)}
              maxLength={120}
              placeholder={T.locationPlaceholder}
            />
            <p className="text-[11px] text-muted-foreground">{T.locationHint}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{T.socials}</Label>
          <SocialLinksEditor value={links} onChange={setLinks} />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><Eye className="size-4" /> {T.sectionsLabel}</Label>
          {([
            [T.sectionEvents, showEvents, setShowEvents] as const,
            [T.sectionShop, showShop, setShowShop] as const,
            [T.sectionPosts, showPosts, setShowPosts] as const,
          ]).map(([label, val, set]) => (
            <label key={label} className="flex items-center justify-between gap-3 border-2 border-border p-2 text-sm font-semibold">
              <span className="flex items-center gap-1.5">
                {val ? <Eye className="size-4" /> : <EyeOff className="size-4 text-muted-foreground" />} {label}
              </span>
              <Switch checked={val} onCheckedChange={set} aria-label={`${T.sectionToggleAria} ${label}`} />
            </label>
          ))}
          <p className="text-[11px] text-muted-foreground">
            {T.sectionsHint}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center justify-between gap-3 border-2 border-border p-2 text-sm font-semibold">
            <span className="flex items-center gap-1.5">
              <Globe className="size-4" /> {T.indexable}
            </span>
            <Switch checked={indexable} onCheckedChange={setIndexable} aria-label={T.indexableAria} />
          </label>
          <p className="text-[11px] text-muted-foreground">
            {T.indexableHint}
          </p>
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? T.saving : T.savePage}
        </Button>
      </form>

      {/* Dates de concert */}
      <section className="card-brut space-y-3 p-4">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
          <CalendarPlus className="size-4 text-primary" /> {T.events}
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder={T.evTitle} value={evTitle} onChange={(e) => setEvTitle(e.target.value)} />
          <Input type="date" value={evDate} onChange={(e) => setEvDate(e.target.value)} />
          <Input placeholder={T.evVenue} value={evVenue} onChange={(e) => setEvVenue(e.target.value)} />
          <Input placeholder={T.evUrl} value={evUrl} onChange={(e) => setEvUrl(e.target.value)} inputMode="url" />
        </div>
        <Button type="button" onClick={() => addEvent.mutate()} disabled={addEvent.isPending}>
          {addEvent.isPending ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />} {T.addDate}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          {T.eventsHint}
        </p>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{T.noEvents}</p>
        ) : (
          <ul className="space-y-2">
            {events.map((ev) => (
              <li key={ev.id} className="flex items-center gap-2 border-2 border-border p-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{ev.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(`${ev.event_date}T12:00:00Z`).toLocaleDateString(isEn ? "en-US" : "fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                    {ev.venue ? ` · ${ev.venue}` : ""}
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => deleteEvent.mutate(ev.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Boutique */}
      <ArtistShopManager artistId={session.user.id} />

      {/* Blog artiste */}
      <section className="card-brut space-y-3 p-4">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
          <Send className="size-4 text-primary" /> {T.publish}
        </h2>
        <Input placeholder={T.postTitle} value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
        <Textarea rows={4} placeholder={T.postBody} value={postBody} onChange={(e) => setPostBody(e.target.value)} />
        <Input placeholder={T.postVideo} value={postVideo} onChange={(e) => setPostVideo(e.target.value)} inputMode="url" />
        <MultiImageUploader values={postImages} onChange={setPostImages} folder={`artist/${session.user.id}`} />
        <VisibilityPicker value={postVisibility} onChange={setPostVisibility} name="new-post-visibility" />
        <CategoryPicker value={postCategory} onChange={setPostCategory} name="new-post-category" />
        <Button type="button" onClick={() => publish.mutate()} disabled={publish.isPending}>
          {publish.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} {T.publish}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          {T.publishHint}
        </p>

        {ownPosts.length > 0 && (
          <ul className="space-y-2 pt-2">
            {ownPosts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 border-2 border-border p-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{p.title || p.content.slice(0, 60) || T.post}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString(isEn ? "en-US" : "fr-FR")} · {visibilityLabel(p.visibility, isEn)}
                  </div>
                </div>
                <select
                  aria-label={T.visibilityAria}
                  value={p.visibility}
                  onChange={(e) => setVisibility.mutate({ id: p.id, visibility: e.target.value })}
                  className="border-2 border-border bg-background px-2 py-1 text-xs font-semibold"
                >
                  <option value="feed">{T.visFeed}</option>
                  <option value="profile_only">{T.visProfile}</option>
                  <option value="followers_only">{T.visFollowers}</option>
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    if (window.confirm(T.confirmDeletePost)) deletePost.mutate(p.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
