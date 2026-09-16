import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUploader } from "@/components/media/ImageUploader";
import { toast } from "@/lib/toast";
import { ShieldAlert, Loader2, Target, Trash2, Plus } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useChallenges, type EditorialChallenge } from "@/components/village/ChallengeBits";

export const Route = createFileRoute("/_authenticated/admin/challenges")({
  head: () => ({
    meta: [{ title: "Challenges éditoriaux — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminChallengesPage,
});

const FR = {
  title: "Challenges éditoriaux",
  intro:
    "Créés et modifiés uniquement par l'administration. Les membres y répondent par un article dans RéDaK'Village.",
  create: "Nouveau challenge",
  name: "Titre du challenge",
  desc: "Consigne / description",
  cover: "Image (optionnelle)",
  ends: "Date de fin (optionnelle)",
  add: "Créer le challenge",
  save: "Enregistrer",
  active: "Actif",
  remove: "Supprimer",
  removeConfirm: "Supprimer ce challenge ? Les articles déjà publiés restent en ligne.",
  none: "Aucun challenge pour l'instant.",
  saved: "Enregistré",
  deleted: "Challenge supprimé",
  titleRequired: "Un titre est obligatoire.",
  denied: "Réservé à l'administration.",
  back: "Retour admin",
};

const EN: typeof FR = {
  title: "Editorial challenges",
  intro:
    "Created and edited by the team only. Members answer them with an article in RéDaK'Village.",
  create: "New challenge",
  name: "Challenge title",
  desc: "Brief / description",
  cover: "Image (optional)",
  ends: "End date (optional)",
  add: "Create challenge",
  save: "Save",
  active: "Active",
  remove: "Delete",
  removeConfirm: "Delete this challenge? Published articles stay online.",
  none: "No challenge yet.",
  saved: "Saved",
  deleted: "Challenge deleted",
  titleRequired: "A title is required.",
  denied: "Admin only.",
  back: "Back to admin",
};

function AdminChallengesPage() {
  const { isAdmin, session } = useAuth();
  const { lang } = useLang();
  const txt = lang === "en" ? EN : FR;
  const qc = useQueryClient();
  const { data: challenges = [], isLoading } = useChallenges(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["editorial-challenges"] });

  const create = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error(txt.titleRequired);
      const { error } = await supabase.from("editorial_challenges").insert({
        title: title.trim(),
        description: description.trim() || null,
        cover_url: cover || null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        created_by: session?.user.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(txt.saved);
      setTitle("");
      setDescription("");
      setCover("");
      setEndsAt("");
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const update = useMutation({
    mutationFn: async (c: EditorialChallenge) => {
      const { error } = await supabase
        .from("editorial_challenges")
        .update({
          title: c.title,
          description: c.description,
          cover_url: c.cover_url,
          ends_at: c.ends_at,
          is_active: c.is_active,
        })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(txt.saved);
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("editorial_challenges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(txt.deleted);
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!isAdmin) {
    return (
      <p className="card-brut flex items-center gap-2 p-4 text-sm">
        <ShieldAlert className="size-4 text-destructive" /> {txt.denied}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        to="/admin"
        search={{ tab: "users" }}
        className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        {txt.back}
      </Link>
      <h1 className="flex items-center gap-2 text-2xl font-black">
        <Target className="size-6 text-primary" /> {txt.title}
      </h1>
      <p className="text-xs text-muted-foreground">{txt.intro}</p>

      <section className="card-brut space-y-3 p-4">
        <h2 className="text-sm font-black uppercase tracking-widest">{txt.create}</h2>
        <div className="space-y-1.5">
          <Label htmlFor="ch-title">{txt.name}</Label>
          <Input id="ch-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ch-desc">{txt.desc}</Label>
          <Textarea
            id="ch-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{txt.cover}</Label>
          <ImageUploader
            value={cover}
            onChange={setCover}
            folder="challenges"
            usage="cover"
            defaultRatio="16:9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ch-ends">{txt.ends}</Label>
          <Input
            id="ch-ends"
            type="date"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          {txt.add}
        </Button>
      </section>

      {isLoading && <Loader2 className="size-4 animate-spin" />}
      {!isLoading && challenges.length === 0 && (
        <p className="card-brut p-4 text-sm text-muted-foreground">{txt.none}</p>
      )}

      <ul className="space-y-2">
        {challenges.map((c) => (
          <li key={c.id}>
            <ChallengeRow
              challenge={c}
              txt={txt}
              onSave={(n) => update.mutate(n)}
              onDelete={() => {
                if (window.confirm(txt.removeConfirm)) remove.mutate(c.id);
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChallengeRow({
  challenge,
  txt,
  onSave,
  onDelete,
}: {
  challenge: EditorialChallenge;
  txt: typeof FR;
  onSave: (c: EditorialChallenge) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<EditorialChallenge>(challenge);
  return (
    <div className="card-brut space-y-2 p-3">
      <Input
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        aria-label={txt.name}
      />
      <Textarea
        rows={2}
        value={draft.description ?? ""}
        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        aria-label={txt.desc}
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
          <Switch
            checked={draft.is_active}
            onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
          />
          {txt.active}
        </label>
        <Input
          type="date"
          className="w-40"
          aria-label={txt.ends}
          value={draft.ends_at ? draft.ends_at.slice(0, 10) : ""}
          onChange={(e) =>
            setDraft({
              ...draft,
              ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
            })
          }
        />
        <Button size="sm" onClick={() => onSave(draft)}>
          {txt.save}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} aria-label={txt.remove}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
