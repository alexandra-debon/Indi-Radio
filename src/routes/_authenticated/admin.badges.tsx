import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { ShieldAlert, Loader2, Award, Trash2, Plus, Check } from "lucide-react";
import { useLang } from "@/lib/i18n";
import {
  BADGE_ICONS,
  BADGE_ICON_KEYS,
  BadgeChip,
  useBadgeDefs,
  type BadgeDef,
} from "@/components/badges/badge-defs";

export const Route = createFileRoute("/_authenticated/admin/badges")({
  head: () => ({
    meta: [{ title: "Badges — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminBadgesPage,
});

const FR = {
  title: "Badges administrables",
  intro:
    "Créez des badges (nom, icône, couleur) et attribuez-les à n'importe quel profil. Les accomplissements automatiques restent un système séparé.",
  create: "Nouveau badge",
  key: "Identifiant (unique, sans espace)",
  labelFr: "Nom (français)",
  labelEn: "Nom (anglais)",
  icon: "Icône",
  color: "Couleur",
  desc: "Description (optionnelle)",
  save: "Enregistrer",
  add: "Créer le badge",
  remove: "Supprimer",
  removeConfirm: "Supprimer ce badge ? Il restera affiché sur les profils qui le portent.",
  assign: "Attribuer à un membre",
  searchUser: "Rechercher un pseudo…",
  noUser: "Aucun membre trouvé.",
  carries: "Badges portés",
  none: "Aucun badge défini pour le moment.",
  saved: "Enregistré",
  deleted: "Badge supprimé",
  keyRequired: "Un identifiant et un nom français sont obligatoires.",
  denied: "Réservé à l'administration.",
  back: "Retour admin",
};

const EN: typeof FR = {
  title: "Manageable badges",
  intro:
    "Create badges (name, icon, colour) and grant them to any profile. Automatic achievements stay a separate system.",
  create: "New badge",
  key: "Identifier (unique, no space)",
  labelFr: "Name (French)",
  labelEn: "Name (English)",
  icon: "Icon",
  color: "Colour",
  desc: "Description (optional)",
  save: "Save",
  add: "Create badge",
  remove: "Delete",
  removeConfirm: "Delete this badge? It stays visible on profiles that carry it.",
  assign: "Grant to a member",
  searchUser: "Search a nickname…",
  noUser: "No member found.",
  carries: "Badges carried",
  none: "No badge defined yet.",
  saved: "Saved",
  deleted: "Badge deleted",
  keyRequired: "An identifier and a French name are required.",
  denied: "Admin only.",
  back: "Back to admin",
};

type ProfileRow = { id: string; pseudo: string; badges: string[] | null };

function AdminBadgesPage() {
  const { isAdmin } = useAuth();
  const { lang } = useLang();
  const txt = lang === "en" ? EN : FR;
  const qc = useQueryClient();
  const { data: defs = [], isLoading } = useBadgeDefs();
  const [search, setSearch] = useState("");

  const [key, setKey] = useState("");
  const [labelFr, setLabelFr] = useState("");
  const [labelEn, setLabelEn] = useState("");
  const [icon, setIcon] = useState("award");
  const [color, setColor] = useState("#f5c518");
  const [desc, setDesc] = useState("");

  const createBadge = useMutation({
    mutationFn: async () => {
      const k = key.trim().toLowerCase().replace(/\s+/g, "-");
      if (!k || !labelFr.trim()) throw new Error(txt.keyRequired);
      const { error } = await supabase.from("badge_definitions").insert({
        key: k,
        label_fr: labelFr.trim(),
        label_en: labelEn.trim() || null,
        icon,
        color,
        description: desc.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(txt.saved);
      setKey("");
      setLabelFr("");
      setLabelEn("");
      setDesc("");
      qc.invalidateQueries({ queryKey: ["badge-definitions"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const updateBadge = useMutation({
    mutationFn: async (d: BadgeDef) => {
      const { error } = await supabase
        .from("badge_definitions")
        .update({
          label_fr: d.label_fr,
          label_en: d.label_en,
          icon: d.icon,
          color: d.color,
          description: d.description,
        })
        .eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(txt.saved);
      qc.invalidateQueries({ queryKey: ["badge-definitions"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteBadge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("badge_definitions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(txt.deleted);
      qc.invalidateQueries({ queryKey: ["badge-definitions"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const { data: users = [] } = useQuery<ProfileRow[]>({
    queryKey: ["admin-badge-users", search],
    enabled: isAdmin && search.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, pseudo, badges")
        .ilike("pseudo", `%${search.trim()}%`)
        .order("pseudo")
        .limit(20);
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  const toggleBadge = useMutation({
    mutationFn: async ({ user, badgeKey }: { user: ProfileRow; badgeKey: string }) => {
      const current = user.badges ?? [];
      const next = current.includes(badgeKey)
        ? current.filter((b) => b !== badgeKey)
        : [...current, badgeKey];
      const { error } = await supabase.from("profiles").update({ badges: next }).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(txt.saved);
      qc.invalidateQueries({ queryKey: ["admin-badge-users"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
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
        <Award className="size-6 text-primary" /> {txt.title}
      </h1>
      <p className="text-xs text-muted-foreground">{txt.intro}</p>

      <section className="card-brut space-y-3 p-4">
        <h2 className="text-sm font-black uppercase tracking-widest">{txt.create}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="badge-key">{txt.key}</Label>
            <Input id="badge-key" value={key} onChange={(e) => setKey(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="badge-fr">{txt.labelFr}</Label>
            <Input id="badge-fr" value={labelFr} onChange={(e) => setLabelFr(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="badge-en">{txt.labelEn}</Label>
            <Input id="badge-en" value={labelEn} onChange={(e) => setLabelEn(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="badge-icon">{txt.icon}</Label>
            <select
              id="badge-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="h-10 w-full rounded-md border-2 border-border bg-background px-2 text-sm"
            >
              {BADGE_ICON_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="badge-color">{txt.color}</Label>
            <Input
              id="badge-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-20 p-1"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="badge-desc">{txt.desc}</Label>
            <Textarea
              id="badge-desc"
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={() => createBadge.mutate()} disabled={createBadge.isPending}>
          {createBadge.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          {txt.add}
        </Button>
      </section>

      <section className="space-y-2">
        {isLoading && <Loader2 className="size-4 animate-spin" />}
        {!isLoading && defs.length === 0 && (
          <p className="card-brut p-4 text-sm text-muted-foreground">{txt.none}</p>
        )}
        {defs.map((d) => (
          <BadgeDefRow
            key={d.id}
            def={d}
            txt={txt}
            onSave={(n) => updateBadge.mutate(n)}
            onDelete={() => {
              if (window.confirm(txt.removeConfirm)) deleteBadge.mutate(d.id);
            }}
          />
        ))}
      </section>

      <section className="card-brut space-y-3 p-4">
        <h2 className="text-sm font-black uppercase tracking-widest">{txt.assign}</h2>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={txt.searchUser}
        />
        {search.trim().length >= 2 && users.length === 0 && (
          <p className="text-xs text-muted-foreground">{txt.noUser}</p>
        )}
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id} className="rounded-md border-2 border-border p-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-bold">{u.pseudo}</span>
                {(u.badges ?? []).map((b) => (
                  <BadgeChip key={b} badgeKey={b} def={defs.find((d) => d.key === b)} />
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {defs.map((d) => {
                  const on = (u.badges ?? []).includes(d.key);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleBadge.mutate({ user: u, badgeKey: d.key })}
                      className={
                        "inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest transition " +
                        (on
                          ? "border-primary bg-primary text-black"
                          : "border-border text-muted-foreground hover:border-primary")
                      }
                    >
                      {on && <Check className="size-3" />}
                      {lang === "en" ? d.label_en || d.label_fr : d.label_fr}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function BadgeDefRow({
  def,
  txt,
  onSave,
  onDelete,
}: {
  def: BadgeDef;
  txt: typeof FR;
  onSave: (d: BadgeDef) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<BadgeDef>(def);
  const Icon = BADGE_ICONS[draft.icon] ?? Award;
  return (
    <div className="card-brut grid gap-2 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <span
        className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-wider text-black"
        style={{ backgroundColor: draft.color }}
      >
        <Icon className="size-3.5" /> {draft.label_fr}
      </span>
      <div className="grid gap-2 sm:grid-cols-4">
        <Input
          value={draft.label_fr}
          onChange={(e) => setDraft({ ...draft, label_fr: e.target.value })}
          aria-label={txt.labelFr}
        />
        <Input
          value={draft.label_en ?? ""}
          onChange={(e) => setDraft({ ...draft, label_en: e.target.value })}
          aria-label={txt.labelEn}
        />
        <select
          value={draft.icon}
          onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
          aria-label={txt.icon}
          className="h-10 rounded-md border-2 border-border bg-background px-2 text-sm"
        >
          {BADGE_ICON_KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <Input
          type="color"
          value={draft.color}
          onChange={(e) => setDraft({ ...draft, color: e.target.value })}
          aria-label={txt.color}
          className="h-10 w-20 p-1"
        />
      </div>
      <div className="flex gap-2">
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
