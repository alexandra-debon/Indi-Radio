import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Calendar, Disc3, Eye, EyeOff, Heart, Pencil, Save, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextArea } from "@/components/text/RichTextArea";
import { ImageUploader } from "@/components/media/ImageUploader";
import { StarRating } from "@/components/rating/StarRating";
import { SocialLinksEditor, SocialLinksBar, sanitizeLinks, type SocialLinks } from "@/components/social/SocialLinksBar";
import { renderRich } from "@/lib/rich-text";
import { toast } from "@/lib/toast";

function formatFavDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return d;
  }
}

function DraftStatus({
  savedAt,
  restoredAt,
  onDiscard,
}: {
  savedAt: number | null;
  restoredAt: number | null;
  onDiscard: () => void;
}) {
  if (!savedAt) return null;
  const time = new Date(savedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-primary/30 bg-primary/5 px-2 py-1 text-[11px] text-muted-foreground">
      <Save className="size-3.5 text-primary" />
      <span>
        {restoredAt ? "Brouillon restauré" : "Brouillon enregistré"} · {time}
      </span>
      <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={onDiscard}>
        Effacer le brouillon
      </Button>
    </div>
  );
}

/** Rendu fidèle à la page publique « Coups de Cœur », pour prévisualiser avant publication. */
function FavoritePreview({
  data,
  social,
}: {
  data: {
    featured_date: string;
    cover_url: string;
    artist: string;
    title: string;
    kind: string;
    comment: string;
    discovery_story: string;
    editorial_rating: number | null;
  };
  social: SocialLinks;
}) {
  const links = sanitizeLinks(social);
  const hasLinks = links && Object.keys(links).length > 0;
  return (
    <div className="rounded-md border-2 border-dashed border-primary/60 p-3">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-primary">
        Aperçu avant publication
      </div>
      <div className="card-brut p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="w-full shrink-0 sm:w-40">
            <div className="aspect-square overflow-hidden rounded-md bg-muted">
              {data.cover_url ? (
                <img src={data.cover_url} alt={`${data.title} — ${data.artist}`} className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center">
                  <Disc3 className="size-10 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="size-3.5" />
              <time dateTime={data.featured_date}>{formatFavDate(data.featured_date)}</time>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-primary">
                {data.kind === "single" ? "Chanson" : data.kind === "ep" ? "EP" : "Album"}
              </div>
              <h2 className="text-xl font-bold leading-tight">
                {data.title || <span className="text-muted-foreground">Titre…</span>}
              </h2>
              <div className="text-sm text-muted-foreground">
                par <span className="font-medium text-foreground">{data.artist || "Artiste…"}</span>
              </div>
              {data.editorial_rating != null && data.editorial_rating > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    Note rédaction
                  </span>
                  <StarRating value={data.editorial_rating} size={16} />
                </div>
              )}
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {data.comment ? renderRich(data.comment) : (
                <span className="text-muted-foreground">Notre coup de cœur…</span>
              )}
            </div>
            {data.discovery_story && (
              <div className="rounded-md border-l-4 border-primary bg-muted/40 p-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                  Comment on l'a découvert·e
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {renderRich(data.discovery_story)}
                </div>
              </div>
            )}
            {hasLinks && <SocialLinksBar links={links as SocialLinks} className="pt-1" />}
          </div>
        </div>
      </div>
    </div>
  );
}

export type FavoriteRow = {
  id: string;
  featured_date: string;
  cover_url: string | null;
  artist: string;
  title: string;
  kind: string;
  comment: string;
  discovery_story: string | null;
  social_links: SocialLinks | null;
  published: boolean;
  editorial_rating: number | null;
};

const EMPTY_FAV = {
  featured_date: new Date().toISOString().slice(0, 10),
  cover_url: "",
  artist: "",
  title: "",
  kind: "album",
  comment: "",
  discovery_story: "",
  published: true,
  editorial_rating: null as number | null,
};

export function FavoritesAdmin({ search = "" }: { search?: string }) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [form, setForm] = useState(EMPTY_FAV);
  const [social, setSocial] = useState<SocialLinks>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const draft = useLocalDraft(
    "indi:draft:coup-de-coeur:new",
    { form, social },
    (v) => {
      if (v.form) setForm({ ...EMPTY_FAV, ...v.form });
      if (v.social) setSocial(v.social);
    },
    {
      isEmpty: (v) =>
        !v.form.artist &&
        !v.form.title &&
        !v.form.comment &&
        !v.form.discovery_story &&
        !v.form.cover_url,
    },
  );

  const { data: items = [] } = useQuery({
    queryKey: ["admin-coups-de-coeur"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coups_de_coeur" as any)
        .select("*")
        .order("featured_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FavoriteRow[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-coups-de-coeur"] });
    qc.invalidateQueries({ queryKey: ["coups-de-coeur"] });
    qc.invalidateQueries({ queryKey: ["wall-compact-teasers"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Non authentifié");
      if (!form.artist || !form.title || !form.comment)
        throw new Error("Artiste, titre et commentaire requis");
      const { error } = await supabase.from("coups_de_coeur" as any).insert({
        featured_date: form.featured_date,
        cover_url: form.cover_url || null,
        artist: form.artist,
        title: form.title,
        kind: form.kind,
        comment: form.comment,
        discovery_story: form.discovery_story || null,
        social_links: sanitizeLinks(social),
        published: form.published,
        editorial_rating: form.editorial_rating,
        author_id: session.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Coup de cœur publié");
      setForm(EMPTY_FAV);
      setSocial({});
      draft.clear();
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coups_de_coeur" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supprimé");
      invalidate();
    },
  });

  const togglePublished = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("coups_de_coeur" as any)
        .update({ published: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error((e as Error).message),
  });

  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter((r) => `${r.title} ${r.artist}`.toLowerCase().includes(q))
    : items;

  return (
    <div className="space-y-4">
      <div className="card-brut space-y-2 p-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
          Nouveau coup de cœur
        </h3>
        <DraftStatus
          savedAt={draft.savedAt}
          restoredAt={draft.restoredAt}
          onDiscard={() => {
            setForm(EMPTY_FAV);
            setSocial({});
            draft.clear();
          }}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input
            type="date"
            value={form.featured_date}
            onChange={(e) => setForm({ ...form, featured_date: e.target.value })}
          />
          <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="album">Album</SelectItem>
              <SelectItem value="ep">EP</SelectItem>
              <SelectItem value="single">Chanson / Single</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Artiste *"
            value={form.artist}
            onChange={(e) => setForm({ ...form, artist: e.target.value })}
          />
          <Input
            placeholder="Titre de l'album ou de la chanson *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div className="sm:col-span-2">
            <ImageUploader
              value={form.cover_url}
              onChange={(v) => setForm({ ...form, cover_url: v })}
              folder="covers"
              label="Pochette"
            />
          </div>
        </div>
        <RichTextArea
          rows={6}
          placeholder="Notre coup de cœur — pourquoi on aime *"
          value={form.comment}
          onChange={(v) => setForm({ ...form, comment: v })}
        />
        <RichTextArea
          rows={4}
          placeholder="Comment on a découvert cet·te artiste (optionnel)"
          value={form.discovery_story}
          onChange={(v) => setForm({ ...form, discovery_story: v })}
        />
        <SocialLinksEditor value={social} onChange={setSocial} />
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Note rédaction
          </span>
          <StarRating
            value={form.editorial_rating}
            onChange={(v) => setForm({ ...form, editorial_rating: v })}
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={form.published}
              onCheckedChange={(v) => setForm({ ...form, published: v })}
            />
            Publier immédiatement
          </label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPreview((v) => !v)}
            className="gap-1.5"
          >
            {showPreview ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {showPreview ? "Masquer l'aperçu" : "Aperçu"}
          </Button>
          <Button
            size="sm"
            onClick={() => create.mutate()}
            disabled={!form.artist || !form.title || !form.comment || create.isPending}
          >
            {create.isPending ? "Publication…" : "Publier le coup de cœur"}
          </Button>
        </div>
        {showPreview && <FavoritePreview data={form} social={social} />}
      </div>

      <div className="text-xs text-muted-foreground">
        {items.length} coup(s) de cœur · {items.filter((r) => r.published).length} publié(s)
      </div>

      <ul className="space-y-2">
        {filtered.map((r) => (
          <li key={r.id} className="card-brut p-3">
            <div className="flex items-center gap-3">
              <div className="size-14 shrink-0 overflow-hidden rounded bg-muted">
                {r.cover_url ? (
                  <img src={r.cover_url} alt={r.title} className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center">
                    <Heart className="size-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">
                  {r.title}{" "}
                  <span className="font-normal text-muted-foreground">— {r.artist}</span>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {r.featured_date} · {r.published ? "publié" : "brouillon"}
                </div>
                <Link
                  to="/coups-de-coeur/$coupId"
                  params={{ coupId: r.id }}
                  className="inline-flex items-center gap-1 text-xs text-primary underline"
                >
                  <ExternalLink className="size-3" />
                  Voir la fiche
                </Link>
              </div>
              <Switch
                checked={r.published}
                onCheckedChange={(v) => togglePublished.mutate({ id: r.id, value: v })}
                aria-label="Publié"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => setEditId(editId === r.id ? null : r.id)}
                aria-label="Modifier"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                onClick={() => {
                  if (confirm("Supprimer ce coup de cœur ?")) remove.mutate(r.id);
                }}
                aria-label="Supprimer"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            {editId === r.id && (
              <FavoriteEdit row={r} onDone={() => setEditId(null)} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FavoriteEdit({ row, onDone }: { row: FavoriteRow; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    featured_date: row.featured_date,
    cover_url: row.cover_url ?? "",
    artist: row.artist,
    title: row.title,
    kind: row.kind,
    comment: row.comment,
    discovery_story: row.discovery_story ?? "",
    published: row.published,
    editorial_rating: row.editorial_rating ?? null,
  });
  const [social, setSocial] = useState<SocialLinks>(
    (row.social_links as SocialLinks | null) ?? {},
  );
  const [preview, setPreview] = useState(true);
  const draft = useLocalDraft(
    `indi:draft:coup-de-coeur:${row.id}`,
    { f, social },
    (v) => {
      if (v.f) setF((prev) => ({ ...prev, ...v.f }));
      if (v.social) setSocial(v.social);
    },
  );
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("coups_de_coeur" as any)
        .update({
          featured_date: f.featured_date,
          cover_url: f.cover_url || null,
          artist: f.artist,
          title: f.title,
          kind: f.kind,
          comment: f.comment,
          discovery_story: f.discovery_story || null,
          social_links: sanitizeLinks(social),
          published: f.published,
          editorial_rating: f.editorial_rating,
        })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mis à jour");
      draft.clear();
      qc.invalidateQueries({ queryKey: ["admin-coups-de-coeur"] });
      qc.invalidateQueries({ queryKey: ["coups-de-coeur"] });
      qc.invalidateQueries({ queryKey: ["wall-compact-teasers"] });
      onDone();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <DraftStatus
        savedAt={draft.savedAt}
        restoredAt={draft.restoredAt}
        onDiscard={() => {
          setF({
            featured_date: row.featured_date,
            cover_url: row.cover_url ?? "",
            artist: row.artist,
            title: row.title,
            kind: row.kind,
            comment: row.comment,
            discovery_story: row.discovery_story ?? "",
            published: row.published,
            editorial_rating: row.editorial_rating ?? null,
          });
          setSocial((row.social_links as SocialLinks | null) ?? {});
          draft.clear();
        }}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input type="date" value={f.featured_date} onChange={(e) => setF({ ...f, featured_date: e.target.value })} />
        <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v })}>
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="album">Album</SelectItem>
            <SelectItem value="ep">EP</SelectItem>
            <SelectItem value="single">Chanson / Single</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Artiste" value={f.artist} onChange={(e) => setF({ ...f, artist: e.target.value })} />
        <Input placeholder="Titre" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <div className="sm:col-span-2">
          <ImageUploader value={f.cover_url} onChange={(v) => setF({ ...f, cover_url: v })} folder="covers" label="Pochette" />
        </div>
      </div>
      <RichTextArea rows={6} placeholder="Notre coup de cœur" value={f.comment} onChange={(v) => setF({ ...f, comment: v })} />
      <RichTextArea rows={4} placeholder="Comment on a découvert…" value={f.discovery_story} onChange={(v) => setF({ ...f, discovery_story: v })} />
      <SocialLinksEditor value={social} onChange={setSocial} />
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Note rédaction
        </span>
        <StarRating
          value={f.editorial_rating}
          onChange={(v) => setF({ ...f, editorial_rating: v })}
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs">
          <Switch checked={f.published} onCheckedChange={(v) => setF({ ...f, published: v })} />
          Publié
        </label>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPreview((v) => !v)}>
          {preview ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          {preview ? "Masquer l'aperçu" : "Aperçu"}
        </Button>
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Annuler</Button>
      </div>
      {preview && <FavoritePreview data={f} social={social} />}
    </div>
  );
}
