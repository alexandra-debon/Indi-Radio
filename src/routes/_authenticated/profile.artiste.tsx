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
import { MultiImageUploader } from "@/components/media/MultiImageUploader";
import { SocialLinksEditor, sanitizeLinks, type SocialLinks } from "@/components/social/SocialLinksBar";
import { VisibilityPicker, visibilityLabel, type PostVisibility } from "@/components/social/VisibilityPicker";
import { isValidVideoUrl } from "@/lib/media-embed";
import { toast } from "@/lib/toast";
import { ArrowLeft, Loader2, Trash2, CalendarPlus, Palette, Image as ImageIcon, Send, Eye, EyeOff } from "lucide-react";

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

  const [banner, setBanner] = useState("");
  const [accent, setAccent] = useState("");
  const [summary, setSummary] = useState("");
  const [links, setLinks] = useState<SocialLinks>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setBanner((profile as any).banner_url ?? "");
    setAccent((profile as any).accent_color ?? "");
    setSummary((profile as any).gallery_summary ?? "");
    const sl = (profile as any).social_links;
    setLinks(sl && typeof sl === "object" ? (sl as SocialLinks) : {});
  }, [profile]);

  const uid = session?.user.id ?? null;
  const isArtistOrMedia = profile?.role === "artiste" || (profile as any)?.role === "media";

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
      if (!evTitle.trim() || !evDate) throw new Error("Titre et date obligatoires");
      if (evUrl.trim() && !/^https?:\/\/.+\..+/.test(evUrl.trim())) throw new Error("Lien billetterie invalide");
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
      toast.success("Date ajoutée");
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
      toast.success("Date supprimée");
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

  const publish = useMutation({
    mutationFn: async () => {
      if (!uid) return;
      const body = postBody.trim();
      const video = postVideo.trim();
      if (!body && !video && postImages.length === 0) throw new Error("Écris un message ou ajoute un média");
      if (video && !isValidVideoUrl(video)) throw new Error("Lien vidéo invalide (YouTube, Vimeo, SoundCloud)");
      const content = video ? (body ? `${body}\n${video}` : video) : body;
      const { error } = await supabase.from("posts").insert({
        author_id: uid,
        content,
        title: postTitle.trim() || null,
        image_url: postImages[0] ?? null,
        image_urls: postImages,
        image_captions: new Array(postImages.length).fill(""),
        visibility: postVisibility,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setPostTitle(""); setPostBody(""); setPostVideo(""); setPostImages([]);
      toast.success("Publication en ligne");
      qc.invalidateQueries({ queryKey: ["artist-own-posts"] });
      qc.invalidateQueries({ queryKey: ["wall-posts"] });
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
      toast.error("Couleur invalide (format #RRGGBB)");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          banner_url: banner || null,
          accent_color: accent || null,
          gallery_summary: summary.trim() || null,
          social_links: sanitizeLinks(links),
        } as any)
        .eq("id", uid);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["profile", uid] });
      toast.success("Page mise à jour");
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  if (!profile || !session) return <div className="p-4">Chargement…</div>;

  if (!isArtistOrMedia) {
    return (
      <div className="space-y-3 p-2">
        <h1 className="section-title">Espace artiste</h1>
        <p className="text-sm text-muted-foreground">
          Cet espace est réservé aux comptes Artiste et Média certifiés. Tu peux déposer une candidature depuis ton profil.
        </p>
        <Button variant="outline" onClick={() => navigate({ to: "/profile" })}>Retour au profil</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/profile" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
        <ArrowLeft className="size-4" /> Retour
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="section-title">Ma page artiste</h1>
        <div className="text-xs text-muted-foreground">
          {followers} abonné{followers > 1 ? "s" : ""} ·{" "}
          <Link to="/u/$pseudo" params={{ pseudo: profile.pseudo }} className="underline">
            Voir ma page publique
          </Link>
        </div>
      </div>

      {/* Identité visuelle */}
      <form onSubmit={saveIdentity} className="card-brut space-y-5 p-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><ImageIcon className="size-4" /> Bannière</Label>
          <p className="text-[11px] text-muted-foreground">
            Format large conseillé 2048 × 1152 px. Garde le texte et le logo au centre : sur mobile, seule la zone
            centrale (environ 1235 × 338 px) reste visible.
          </p>
          <ImageUploader value={banner} onChange={setBanner} folder={`banners/${session.user.id}`} label="Bannière (2048×1152)" usage="banner" defaultRatio="16:9" />
          {banner && (
            <div className="relative overflow-hidden rounded-sm border-2 border-border">
              <img src={banner} alt="Aperçu de la bannière" className="aspect-[16/9] w-full object-cover sm:aspect-[1920/480]" />
              <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[60%] -translate-x-1/2 border-x-2 border-dashed border-primary/70" />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="accent" className="flex items-center gap-1.5"><Palette className="size-4" /> Couleur d'accent</Label>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Couleur ${c}`}
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
              <Button type="button" variant="ghost" size="sm" onClick={() => setAccent("")}>Réinitialiser</Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Utilisée pour les bordures, titres et boutons de ta page publique.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="summary">Résumé de présentation</Label>
          <Textarea id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} maxLength={600} placeholder="Ton univers en quelques lignes…" />
          <p className="text-[11px] text-muted-foreground">{summary.length}/600</p>
        </div>

        <div className="space-y-1.5">
          <Label>Réseaux & plateformes</Label>
          <SocialLinksEditor value={links} onChange={setLinks} />
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? "Enregistrement…" : "Enregistrer ma page"}
        </Button>
      </form>

      {/* Dates de concert */}
      <section className="card-brut space-y-3 p-4">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
          <CalendarPlus className="size-4 text-primary" /> Dates de concert
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Titre (ex : Release party)" value={evTitle} onChange={(e) => setEvTitle(e.target.value)} />
          <Input type="date" value={evDate} onChange={(e) => setEvDate(e.target.value)} />
          <Input placeholder="Lieu / ville" value={evVenue} onChange={(e) => setEvVenue(e.target.value)} />
          <Input placeholder="Lien billetterie (https://…)" value={evUrl} onChange={(e) => setEvUrl(e.target.value)} inputMode="url" />
        </div>
        <Button type="button" onClick={() => addEvent.mutate()} disabled={addEvent.isPending}>
          {addEvent.isPending ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />} Ajouter la date
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Les dates passées restent affichées sur ta page en historique, jusqu'à ce que tu les supprimes.
        </p>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune date pour l'instant.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((ev) => (
              <li key={ev.id} className="flex items-center gap-2 border-2 border-border p-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{ev.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(`${ev.event_date}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
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

      {/* Blog artiste */}
      <section className="card-brut space-y-3 p-4">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
          <Send className="size-4 text-primary" /> Publier
        </h2>
        <Input placeholder="Titre (optionnel)" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
        <Textarea rows={4} placeholder="Ton actualité, ton nouveau morceau…" value={postBody} onChange={(e) => setPostBody(e.target.value)} />
        <Input placeholder="Lien vidéo / audio (YouTube, Vimeo, SoundCloud)" value={postVideo} onChange={(e) => setPostVideo(e.target.value)} inputMode="url" />
        <MultiImageUploader values={postImages} onChange={setPostImages} folder={`artist/${session.user.id}`} />
        <VisibilityPicker value={postVisibility} onChange={setPostVisibility} name="new-post-visibility" />
        <Button type="button" onClick={() => publish.mutate()} disabled={publish.isPending}>
          {publish.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Publier
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Mes abonnés sont prévenus à chaque publication, quel que soit le mode de diffusion choisi.
        </p>

        {ownPosts.length > 0 && (
          <ul className="space-y-2 pt-2">
            {ownPosts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 border-2 border-border p-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{p.title || p.content.slice(0, 60) || "Publication"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("fr-FR")} · {visibilityLabel(p.visibility)}
                  </div>
                </div>
                <select
                  aria-label="Diffusion de la publication"
                  value={p.visibility}
                  onChange={(e) => setVisibility.mutate({ id: p.id, visibility: e.target.value })}
                  className="border-2 border-border bg-background px-2 py-1 text-xs font-semibold"
                >
                  <option value="feed">Feed général + ma page</option>
                  <option value="profile_only">Ma page uniquement</option>
                  <option value="followers_only">Réservé à mes abonnés</option>
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    if (window.confirm("Supprimer définitivement cette publication ?")) deletePost.mutate(p.id);
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
