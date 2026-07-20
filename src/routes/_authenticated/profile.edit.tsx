import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Upload, Loader2, Trash2, BadgeCheck, Globe, Eye } from "lucide-react";
import { toast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  SocialLinksBar,
  SocialLinksEditor,
  sanitizeLinks,
  type SocialLinks,
} from "@/components/social/SocialLinksBar";

export const Route = createFileRoute("/_authenticated/profile/edit")({
  head: () => ({ meta: [{ title: "Modifier mon profil — Indi Radio" }, { name: "robots", content: "noindex" }] }),
  component: EditProfilePage,
});

const schema = z.object({
  pseudo: z
    .string()
    .trim()
    .min(3, "Pseudo trop court (3 min)")
    .max(30, "Pseudo trop long (30 max)")
    .regex(/^[a-zA-Z0-9_.\-]+$/, "Lettres, chiffres, _ . - uniquement"),
  bio: z.string().trim().max(500, "500 caractères max").optional().or(z.literal("")),
  website: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^https?:\/\/.+\..+/.test(v), "URL invalide (http(s)://…)"),
});

function EditProfilePage() {
  const { profile, session } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [pseudo, setPseudo] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setPseudo(profile.pseudo ?? "");
    setBio((profile as any).bio ?? "");
    setWebsite((profile as any).website ?? "");
    setAvatarUrl(profile.avatar_url ?? null);
    const sl = (profile as any).social_links;
    setSocialLinks(sl && typeof sl === "object" ? (sl as SocialLinks) : {});
  }, [profile]);

  if (!profile || !session) return <div className="p-4">Chargement…</div>;

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Merci de choisir une image"); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error("Image trop lourde (4 Mo max)"); return; }
    if (avatarUrl) {
      setPendingFile(file);
      setShowOverwriteDialog(true);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    void uploadAvatar(file);
  }

  async function uploadAvatar(file: File) {
    if (!session) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      toast.success("Avatar téléversé — n'oublie pas d'enregistrer.");
    } catch (err: any) {
      toast.error(err?.message ?? "Échec du téléversement");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      setPendingFile(null);
    }
  }

  async function handleRemoveAvatar() {
    if (!session) return;
    setRemoving(true);
    try {
      const { data: files } = await supabase.storage.from("avatars").list(session.user.id);
      if (files && files.length > 0) {
        await supabase.storage
          .from("avatars")
          .remove(files.map((f) => `${session.user.id}/${f.name}`));
      }
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null } as any)
        .eq("id", session.user.id);
      if (error) throw error;
      setAvatarUrl(null);
      await qc.invalidateQueries({ queryKey: ["profile", session.user.id] });
      toast.success("Avatar supprimé");
    } catch (err: any) {
      toast.error(err?.message ?? "Impossible de supprimer l'avatar");
    } finally {
      setRemoving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ pseudo, bio, website });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    setSaving(true);
    try {
      // Uniqueness check for pseudo (case-insensitive) if changed
      if (parsed.data.pseudo.toLowerCase() !== profile!.pseudo.toLowerCase()) {
        const { data: exists } = await supabase
          .from("profiles")
          .select("id")
          .ilike("pseudo", parsed.data.pseudo)
          .neq("id", session!.user.id)
          .maybeSingle();
        if (exists) {
          toast.error("Ce pseudo est déjà pris");
          setSaving(false);
          return;
        }
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          pseudo: parsed.data.pseudo,
          bio: parsed.data.bio || null,
          website: parsed.data.website || null,
          avatar_url: avatarUrl,
          social_links: sanitizeLinks(socialLinks),
        } as any)
        .eq("id", session!.user.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["profile", session!.user.id] });
      toast.success("Profil mis à jour");
      navigate({ to: "/profile" });
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link to="/profile" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
        <ArrowLeft className="size-4" /> Retour
      </Link>
      <h1 className="section-title">Modifier mon profil</h1>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <form onSubmit={handleSubmit} className="card-brut space-y-5 p-4">
        <div className="flex items-center gap-4">
          <div className="size-20 shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-2xl font-black">
                {(pseudo[0] || "?").toUpperCase()}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {uploading ? "Envoi…" : "Changer l'avatar"}
            </Button>
            {avatarUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={removing || uploading}
                onClick={handleRemoveAvatar}
                className="text-destructive"
              >
                {removing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                {removing ? "Suppression…" : "Supprimer l'avatar"}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pseudo">Pseudo</Label>
          <Input id="pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} maxLength={30} />
          <p className="text-[11px] text-muted-foreground">Visible partout dans l'application.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Quelques mots sur toi…"
          />
          <p className="text-[11px] text-muted-foreground">{bio.length}/500</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="website">Site / lien</Label>
          <Input
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://…"
            inputMode="url"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Réseaux & plateformes</Label>
          <p className="text-[11px] text-muted-foreground">
            Ajoute tes liens Facebook, Instagram, YouTube, Spotify, Deezer… Ils s'afficheront sur ton profil public.
          </p>
          <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving || uploading} className="flex-1">
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/profile" })}>
            Annuler
          </Button>
        </div>
      </form>

      <aside className="space-y-2 lg:sticky lg:top-4 lg:self-start">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <Eye className="size-3.5" /> Aperçu public
        </div>
        <div className="card-brut space-y-3 p-4">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="size-16 rounded-full border-2 border-border object-cover" />
            ) : (
              <div className="grid size-16 place-items-center rounded-full border-2 border-border bg-muted text-base font-black uppercase">
                {(pseudo.slice(0, 2) || "?").toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-lg font-black">@{pseudo || "pseudo"}</h2>
                {profile.is_certified && <BadgeCheck className="size-4 text-primary" aria-label="Certifié" />}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {profile.role}
              </div>
            </div>
          </div>
          {bio && <p className="whitespace-pre-wrap text-sm">{bio}</p>}
          {website && /^https?:\/\/.+\..+/.test(website) && (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary underline break-all">
              <Globe className="size-3.5 shrink-0" /> {website.replace(/^https?:\/\//, "")}
            </div>
          )}
          {!bio && !website && (
            <p className="text-[11px] italic text-muted-foreground">
              Ajoute une bio et un lien pour enrichir ton profil.
            </p>
          )}
          {Object.keys(sanitizeLinks(socialLinks)).some((k) => k !== "__order" && k !== "__labels") && (
            <div className="border-t border-dashed border-border/60 pt-2">
              <SocialLinksBar links={sanitizeLinks(socialLinks)} />
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Aperçu en direct — visible par les autres après enregistrement.
        </p>
      </aside>
      </div>
    </div>
  );
}