import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UserBadge } from "@/components/UserBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/lib/toast";
import { ShieldAlert, Users, Send, Newspaper, Headphones, Mic2, Trash2, Pencil, Disc3, BookOpen, Ban, ShieldOff, Undo2, AlertTriangle, Flag, Rocket, Mail } from "lucide-react";
import { z } from "zod";
import { MagazineEntryEditor, type MagazineEntryDraft } from "@/components/magazines/MagazineEntryEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useServerFn } from "@tanstack/react-start";
import { banUser, quarantineUser, releaseUser } from "@/lib/admin-ban.functions";
import { listUserEmails } from "@/lib/admin-users.functions";
import { EmailStatusPanel } from "@/components/admin/EmailStatusPanel";
import { getUserCount } from "@/lib/public-stats.functions";
import { SocialLinksEditor, sanitizeLinks, type SocialLinks } from "@/components/social/SocialLinksBar";
import { DeployCheckPanel } from "@/components/admin/DeployCheckPanel";
import { ImageUploader } from "@/components/media/ImageUploader";

/** Accept "mm:ss", "hh:mm:ss" or a raw number of seconds. Returns null on empty/invalid. */
function parseDuration(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  if (s.includes(":")) {
    const parts = s.split(":").map((p) => Number(p));
    if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
    let total = 0;
    for (const n of parts) total = total * 60 + n;
    return Math.round(total);
  }
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}
function formatDuration(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const r = Math.floor(sec % 60);
  const mm = h > 0 ? m.toString().padStart(2, "0") : String(m);
  const ss = r.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const adminSearchSchema = z.object({
  tab: z.enum(["users", "requests", "news", "podcasts", "shows", "chroniques", "magazines", "reports", "deploy", "emails"]).catch("users"),
});

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Panneau admin — Indi Radio" }, { name: "robots", content: "noindex" }] }),
  validateSearch: adminSearchSchema,
  component: AdminPage,
});

function UserCountBadge() {
  const fetchCount = useServerFn(getUserCount);
  const { data, isLoading } = useQuery({
    queryKey: ["user-count"],
    queryFn: () => fetchCount(),
    staleTime: 60_000,
  });
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
      <Users className="size-3" />
      {isLoading ? "…" : `${data?.count ?? 0} inscrits`}
    </span>
  );
}

function AdminPage() {
  const { isAdmin } = useAuth();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  if (!isAdmin) {
    return (
      <div className="card-brut flex flex-col items-center gap-3 p-6 text-center">
        <ShieldAlert className="size-8 text-destructive" />
        <h1 className="text-lg font-bold">Accès refusé</h1>
        <p className="text-sm text-muted-foreground">Cette section est réservée aux administrateurs.</p>
      </div>
    );
  }
  const sections = [
    { key: "users" as const, label: "Profils & rôles", icon: Users, desc: "Promouvoir, certifier, chercher" },
    { key: "requests" as const, label: "Dédicaces", icon: Send, desc: "Modérer les demandes auditeurs" },
    { key: "news" as const, label: "Publier une actu", icon: Newspaper, desc: "Poster sur Indi Rézo" },
    { key: "podcasts" as const, label: "Podcasts", icon: Headphones, desc: "Podcasts & épisodes" },
    { key: "shows" as const, label: "Émissions", icon: Mic2, desc: "Émissions, chroniques, animateurs" },
    { key: "chroniques" as const, label: "Chroniques albums", icon: Disc3, desc: "Chroniques d'albums indés" },
    { key: "magazines" as const, label: "Magazine Indi Art", icon: BookOpen, desc: "Articles interactifs FlipHTML5" },
    { key: "reports" as const, label: "Signalements", icon: Flag, desc: "Modérer les commentaires signalés" },
    { key: "emails" as const, label: "Emails", icon: Mail, desc: "Statut DNS & test d'envoi" },
    { key: "deploy" as const, label: "Déploiement", icon: Rocket, desc: "Publier et vérifier le site en ligne" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="section-title">Panneau admin</h1>
        <UserCountBadge />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {sections.map((s) => {
          const Icon = s.icon;
          const active = tab === s.key;
          return (
            <button
              key={s.key}
              onClick={() => navigate({ search: { tab: s.key } })}
              className={`card-brut flex items-start gap-3 p-3 text-left transition ${active ? "border-primary bg-primary/10" : "hover:bg-muted"}`}
            >
              <Icon className={`size-5 shrink-0 ${active ? "text-primary" : ""}`} />
              <div>
                <div className="text-sm font-bold">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v as any } })}>
        <TabsList className="grid h-auto grid-cols-3 gap-1 sm:grid-cols-10">
          <TabsTrigger value="users">Profils</TabsTrigger>
          <TabsTrigger value="requests">Dédicaces</TabsTrigger>
          <TabsTrigger value="news">Publier</TabsTrigger>
          <TabsTrigger value="podcasts">Podcasts</TabsTrigger>
          <TabsTrigger value="shows">Émissions</TabsTrigger>
          <TabsTrigger value="chroniques">Chroniques</TabsTrigger>
          <TabsTrigger value="magazines">Magazines</TabsTrigger>
          <TabsTrigger value="reports">Signalements</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
          <TabsTrigger value="deploy">Déploiement</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4"><UserAdmin /></TabsContent>
        <TabsContent value="requests" className="mt-4"><RequestsAdmin /></TabsContent>
        <TabsContent value="news" className="mt-4"><NewsPublisher /></TabsContent>
        <TabsContent value="podcasts" className="mt-4"><PodcastsAdmin /></TabsContent>
        <TabsContent value="shows" className="mt-4"><ShowsAdmin /></TabsContent>
        <TabsContent value="chroniques" className="mt-4"><ChroniquesAdmin /></TabsContent>
        <TabsContent value="magazines" className="mt-4"><MagazinesAdmin /></TabsContent>
        <TabsContent value="reports" className="mt-4"><ReportsAdmin /></TabsContent>
        <TabsContent value="emails" className="mt-4"><EmailStatusPanel /></TabsContent>
        <TabsContent value="deploy" className="mt-4"><DeployCheckPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function MagazinesAdmin() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: entries = [] } = useQuery({
    queryKey: ["admin-magazine-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("magazine_entries")
        .select("*")
        .order("pinned_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("magazine_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Article supprimé");
      qc.invalidateQueries({ queryKey: ["admin-magazine-entries"] });
      qc.invalidateQueries({ queryKey: ["magazine-entries"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Magazine Indi Art Culture</h3>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>Nouvel article</Button>
        )}
      </div>

      {creating && (
        <div className="pt-4">
          <MagazineEntryEditor
            onDone={() => {
              setCreating(false);
              qc.invalidateQueries({ queryKey: ["admin-magazine-entries"] });
            }}
          />
        </div>
      )}

      {entries.length === 0 && !creating && (
        <div className="card-brut p-4 text-center text-sm text-muted-foreground">
          Aucun article pour l'instant.
        </div>
      )}

      <ul className="space-y-2">
        {entries.map((e) => {
          if (editingId === e.id) {
            const draft: MagazineEntryDraft = {
              id: e.id,
              title: e.title,
              body: e.body,
              magazine_url: e.magazine_url,
              cover_url: e.cover_url,
            };
            return (
              <li key={e.id}>
                <MagazineEntryEditor
                  initial={draft}
                  onDone={() => {
                    setEditingId(null);
                    qc.invalidateQueries({ queryKey: ["admin-magazine-entries"] });
                  }}
                />
              </li>
            );
          }
          return (
            <li key={e.id} className="card-brut flex items-start gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{e.title}</div>
                <a
                  href={e.magazine_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-1 text-xs text-muted-foreground underline"
                >
                  {e.magazine_url}
                </a>
                {e.body && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{e.body}</p>}
              </div>
              <Button size="icon" variant="outline" onClick={() => setEditingId(e.id)} aria-label="Modifier">
                <Pencil className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                onClick={() => { if (confirm("Supprimer cet article ?")) remove.mutate(e.id); }}
                aria-label="Supprimer"
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function UserAdmin() {
  const [q, setQ] = useState("");
  const qc = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles", q],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50);
      if (q.trim()) query = query.ilike("pseudo", `%${q.trim()}%`);
      const { data } = await query;
      return data ?? [];
    },
  });

  const fetchEmails = useServerFn(listUserEmails);
  const profileIds = profiles.map((p) => p.id);
  const { data: emailsMap = {} } = useQuery({
    queryKey: ["admin-user-emails", profileIds],
    queryFn: async () => {
      if (profileIds.length === 0) return {} as Record<string, string | null>;
      return await fetchEmails({ data: { userIds: profileIds } });
    },
    enabled: profileIds.length > 0,
    staleTime: 60_000,
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "auditeur" | "artiste" | "animateur" | "admin" }) => {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rôle mis à jour"); qc.invalidateQueries({ queryKey: ["admin-profiles"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleCert = useMutation({
    mutationFn: async ({ id, is_certified }: { id: string; is_certified: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_certified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Certification mise à jour"); qc.invalidateQueries({ queryKey: ["admin-profiles"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleTeamIndi = useMutation({
    mutationFn: async ({ id, is_team_indi }: { id: string; is_team_indi: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_team_indi }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Badge Team Indi mis à jour"); qc.invalidateQueries({ queryKey: ["admin-profiles"] }); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const updateBadges = useMutation({
    mutationFn: async ({ id, badges }: { id: string; badges: string[] }) => {
      const { error } = await supabase.from("profiles").update({ badges }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Badges mis à jour"); qc.invalidateQueries({ queryKey: ["admin-profiles"] }); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const [banTarget, setBanTarget] = useState<{ id: string; pseudo: string } | null>(null);
  const [quarantineTarget, setQuarantineTarget] = useState<{ id: string; pseudo: string } | null>(null);

  const release = useServerFn(releaseUser);
  const releaseMut = useMutation({
    mutationFn: async (id: string) => release({ data: { userId: id } }),
    onSuccess: () => { toast.success("Compte réactivé"); qc.invalidateQueries({ queryKey: ["admin-profiles"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-3">
      <Input placeholder="Rechercher un pseudo…" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="space-y-2">
        {profiles.map((p) => {
          const isQuarantined = !!(p as any).quarantined_at;
          return (
          <li key={p.id} className={`card-brut space-y-2 p-3 ${isQuarantined ? "border-destructive/60 bg-destructive/5" : ""}`}>
            <UserBadge profile={p} className="text-sm" />
            {emailsMap[p.id] && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Email :</span>{" "}
                <a href={`mailto:${emailsMap[p.id]}`} className="underline">
                  {emailsMap[p.id]}
                </a>
              </div>
            )}
            {isQuarantined && (
              <div className="flex items-start gap-2 rounded-sm border border-destructive/40 bg-destructive/10 p-2 text-xs">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-destructive">En quarantaine</div>
                  {(p as any).quarantine_reason && (
                    <div className="mt-1 whitespace-pre-wrap text-muted-foreground">
                      {(p as any).quarantine_reason}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={p.role} onValueChange={(v) => updateRole.mutate({ id: p.id, role: v as any })}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auditeur">Auditeur</SelectItem>
                  <SelectItem value="artiste">Artiste</SelectItem>
                  <SelectItem value="animateur">Animateur</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <label className="ml-2 flex items-center gap-2 text-xs">
                <Switch checked={p.is_certified} onCheckedChange={(v) => toggleCert.mutate({ id: p.id, is_certified: v })} />
                Certifié
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={!!p.is_team_indi} onCheckedChange={(v) => toggleTeamIndi.mutate({ id: p.id, is_team_indi: v })} />
                Team Indi
              </label>
              <span className="ml-auto text-xs text-muted-foreground">{p.points} pts · Niv. {p.level}</span>
              {isQuarantined ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => releaseMut.mutate(p.id)}
                    disabled={releaseMut.isPending}
                    title="Lever la quarantaine"
                  >
                    <Undo2 className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setBanTarget({ id: p.id, pseudo: p.pseudo })}
                    title="Supprimer définitivement"
                  >
                    <Ban className="size-4" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-orange-600 hover:bg-orange-500/10 hover:text-orange-600 dark:text-orange-400"
                  onClick={() => setQuarantineTarget({ id: p.id, pseudo: p.pseudo })}
                  title="Mettre en quarantaine"
                >
                  <ShieldOff className="size-4" />
                </Button>
              )}
            </div>
            <BadgeEditor
              badges={(p as any).badges ?? []}
              onChange={(badges) => updateBadges.mutate({ id: p.id, badges })}
            />
          </li>
          );
        })}
      </ul>
      <QuarantineDialog
        target={quarantineTarget}
        onClose={() => setQuarantineTarget(null)}
        onDone={() => qc.invalidateQueries({ queryKey: ["admin-profiles"] })}
      />
      <BanUserDialog
        target={banTarget}
        onClose={() => setBanTarget(null)}
        onDone={() => qc.invalidateQueries({ queryKey: ["admin-profiles"] })}
      />
    </div>
  );
}

function QuarantineDialog({
  target,
  onClose,
  onDone,
}: {
  target: { id: string; pseudo: string } | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const quarantine = useServerFn(quarantineUser);

  const submit = async () => {
    if (!target) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("Merci d'expliquer le motif — il sera envoyé à l'utilisateur.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await quarantine({ data: { userId: target.id, reason: trimmed } });
      const suffix =
        res.emailStatus === "sent" ? " Email envoyé." :
        res.emailStatus === "suppressed" ? " (email bloqué par le serveur mail)" :
        res.emailStatus === "no_email" ? " (aucune adresse email)" :
        " (échec de l'envoi de l'email)";
      toast.success(`${target.pseudo} mis en quarantaine.${suffix}`);
      setReason("");
      onDone();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(open) => { if (!open) { setReason(""); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff className="size-5 text-orange-600 dark:text-orange-400" />
            Mettre {target?.pseudo} en quarantaine
          </DialogTitle>
          <DialogDescription>
            Le compte reste actif mais ses publications, commentaires, likes et
            dédicaces seront <strong>masqués et bloqués</strong>. Le message
            ci-dessous lui sera envoyé par email. La suppression définitive
            reste possible ensuite.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Expliquez le motif de la mise en quarantaine…"
          rows={6}
          maxLength={2000}
          autoFocus
        />
        <div className="text-right text-xs text-muted-foreground">{reason.length}/2000</div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Annuler</Button>
          <Button onClick={submit} disabled={submitting || !reason.trim()}
            className="bg-orange-600 text-white hover:bg-orange-700">
            {submitting ? "Envoi…" : "Mettre en quarantaine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BanUserDialog({
  target,
  onClose,
  onDone,
}: {
  target: { id: string; pseudo: string } | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const ban = useServerFn(banUser);

  const submit = async () => {
    if (!target) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("Merci d'expliquer le motif — il sera envoyé à l'utilisateur.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await ban({ data: { userId: target.id, reason: trimmed } });
      if (res.emailStatus === "sent") toast.success(`${target.pseudo} banni. Email envoyé.`);
      else if (res.emailStatus === "suppressed") toast.success(`${target.pseudo} banni (l'email a été bloqué par le serveur mail).`);
      else if (res.emailStatus === "no_email") toast.success(`${target.pseudo} banni (aucune adresse email).`);
      else toast.warning(`${target.pseudo} banni, mais l'envoi de l'email a échoué.`);
      setReason("");
      onDone();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(open) => { if (!open) { setReason(""); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="size-5 text-destructive" />
            Bannir {target?.pseudo}
          </DialogTitle>
          <DialogDescription>
            Le compte est déjà en quarantaine. Cette action le
            <strong> supprime définitivement</strong> et envoie le message
            ci-dessous par email pour expliquer la décision.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Expliquez le motif du bannissement (visible par l'utilisateur dans l'email)…"
          rows={6}
          maxLength={2000}
          autoFocus
        />
        <div className="text-xs text-muted-foreground text-right">{reason.length}/2000</div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Annuler</Button>
          <Button variant="destructive" onClick={submit} disabled={submitting || !reason.trim()}>
            {submitting ? "Bannissement…" : "Bannir et notifier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BadgeEditor({ badges, onChange }: { badges: string[]; onChange: (b: string[]) => void }) {
  const [value, setValue] = useState("");
  const add = () => {
    const v = value.trim();
    if (!v) return;
    if (badges.includes(v)) { setValue(""); return; }
    onChange([...badges, v]);
    setValue("");
  };
  const remove = (b: string) => onChange(badges.filter((x) => x !== b));
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Badges</span>
      {badges.map((b) => (
        <span key={b} className="inline-flex items-center gap-1 rounded-sm border border-primary/60 bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase text-primary">
          {b}
          <button onClick={() => remove(b)} aria-label={`Retirer ${b}`} className="text-primary/70 hover:text-destructive">×</button>
        </span>
      ))}
      <Input
        placeholder="Nouveau badge…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        className="h-7 w-40 text-xs"
      />
      <Button size="sm" variant="outline" onClick={add} disabled={!value.trim()}>Ajouter</Button>
    </div>
  );
}

function RequestsAdmin() {
  const qc = useQueryClient();
  const { data: requests = [] } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("requests")
        .select("id, track_requested, dedication_message, status, created_at, author:profiles!requests_author_id_fkey(pseudo,role,is_certified,is_team_indi,badges,level)")
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "played" | "rejected" }) => {
      const { error } = await supabase.from("requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-requests"] }); },
  });

  return (
    <ul className="space-y-2">
      {requests.length === 0 && <li className="card-brut p-4 text-center text-sm text-muted-foreground">Aucune demande.</li>}
      {requests.map((r) => (
        <li key={r.id} className="card-brut space-y-2 p-3">
          <UserBadge profile={r.author} className="text-xs" />
          {r.track_requested && <div className="text-sm font-semibold">🎵 {r.track_requested}</div>}
          {r.dedication_message && <p className="text-sm">{r.dedication_message}</p>}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase text-muted-foreground">{r.status}</span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: r.id, status: "rejected" })}>Rejeter</Button>
              <Button size="sm" onClick={() => setStatus.mutate({ id: r.id, status: "played" })}>Marquer joué</Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function NewsPublisher() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      if (!session) return;
      const { error } = await supabase.from("news_posts").insert({
        author_id: session.user.id, title, content, image_url: imageUrl || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Publié !"); setTitle(""); setContent(""); setImageUrl(""); qc.invalidateQueries({ queryKey: ["news-posts"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="card-brut space-y-2 p-3">
      <Input placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input placeholder="Image URL (optionnel)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      <Textarea rows={4} placeholder="Contenu…" value={content} onChange={(e) => setContent(e.target.value)} />
      <Button onClick={() => create.mutate()} disabled={!title || !content}>Publier sur Indi Rézo</Button>
    </div>
  );
}

function PodcastsAdmin() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", cover_url: "", external_url: "", duration_seconds: "" });

  const { data: podcasts = [] } = useQuery({
    queryKey: ["admin-podcasts"],
    queryFn: async () => {
      const { data } = await supabase.from("podcasts").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title) throw new Error("Titre requis");
      const { error } = await supabase.from("podcasts").insert({
        title: form.title,
        description: form.description || null,
        cover_url: form.cover_url || null,
        external_url: form.external_url || null,
        duration_seconds: parseDuration(form.duration_seconds),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Podcast créé"); setForm({ title: "", description: "", cover_url: "", external_url: "", duration_seconds: "" }); qc.invalidateQueries({ queryKey: ["admin-podcasts"] }); qc.invalidateQueries({ queryKey: ["podcasts"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("podcasts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["admin-podcasts"] }); qc.invalidateQueries({ queryKey: ["podcasts"] }); },
  });

  return (
    <div className="space-y-4">
      <div className="card-brut space-y-2 p-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Nouveau podcast</h3>
        <Input placeholder="Titre (ex : Indi'Legend)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Textarea rows={2} placeholder="Description (ex : Histoire d'une légende de la musique indé)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <ImageUploader value={form.cover_url} onChange={(v) => setForm({ ...form, cover_url: v })} folder="covers" label="Pochette" />
        <Input placeholder="Lien manager radio (optionnel)" value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} />
        <Input placeholder="Durée totale (mm:ss, optionnel)" value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} />
        <Button onClick={() => create.mutate()} disabled={!form.title}>Créer</Button>
      </div>

      <ul className="space-y-2">
        {podcasts.map((p) => (
          <li key={p.id} className="card-brut p-3">
            <div className="flex items-center gap-3">
              <div className="size-14 shrink-0 overflow-hidden rounded bg-muted">
                {p.cover_url ? <img src={p.cover_url} alt={p.title} className="size-full object-cover" /> : <div className="grid size-full place-items-center"><Headphones className="size-5 text-muted-foreground" /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{p.title}</div>
                {p.description && <div className="line-clamp-1 text-xs text-muted-foreground">{p.description}</div>}
              </div>
              <Button size="icon" variant="outline" onClick={() => setEditId(editId === p.id ? null : p.id)} aria-label="Modifier"><Pencil className="size-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => setOpenId(openId === p.id ? null : p.id)}>{openId === p.id ? "Fermer" : "Épisodes"}</Button>
              <Button size="icon" variant="destructive" onClick={() => { if (confirm("Supprimer ce podcast et ses épisodes ?")) remove.mutate(p.id); }}><Trash2 className="size-4" /></Button>
            </div>
            {editId === p.id && <PodcastEdit podcast={p as any} onDone={() => setEditId(null)} />}
            {openId === p.id && <EpisodesAdmin podcastId={p.id} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PodcastEdit({ podcast, onDone }: { podcast: { id: string; title: string; description: string | null; cover_url: string | null; external_url: string | null; duration_seconds: number | null }; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    title: podcast.title,
    description: podcast.description ?? "",
    cover_url: podcast.cover_url ?? "",
    external_url: podcast.external_url ?? "",
    duration_seconds: formatDuration(podcast.duration_seconds),
  });
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("podcasts").update({
        title: f.title,
        description: f.description || null,
        cover_url: f.cover_url || null,
        external_url: f.external_url || null,
        duration_seconds: parseDuration(f.duration_seconds),
      }).eq("id", podcast.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Podcast mis à jour"); qc.invalidateQueries({ queryKey: ["admin-podcasts"] }); qc.invalidateQueries({ queryKey: ["podcasts"] }); onDone(); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <Input placeholder="Titre" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <Textarea rows={2} placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <ImageUploader value={f.cover_url} onChange={(v) => setF({ ...f, cover_url: v })} folder="covers" label="Pochette" />
      <Input placeholder="Lien manager radio" value={f.external_url} onChange={(e) => setF({ ...f, external_url: e.target.value })} />
      <Input placeholder="Durée totale (mm:ss)" value={f.duration_seconds} onChange={(e) => setF({ ...f, duration_seconds: e.target.value })} />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => save.mutate()} disabled={!f.title}>Enregistrer</Button>
        <Button size="sm" variant="outline" onClick={onDone}>Annuler</Button>
      </div>
    </div>
  );
}

function EpisodesAdmin({ podcastId }: { podcastId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", description: "", audio_url: "", external_url: "", duration_seconds: "", cover_url: "" });
  const [editId, setEditId] = useState<string | null>(null);

  const { data: eps = [] } = useQuery({
    queryKey: ["admin-episodes", podcastId],
    queryFn: async () => {
      const { data } = await supabase.from("episodes").select("*").eq("podcast_id", podcastId).order("published_at", { ascending: false });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title) throw new Error("Titre requis");
      if (!form.audio_url && !form.external_url) throw new Error("URL audio ou lien externe requis");
      const { error } = await supabase.from("episodes").insert({
        podcast_id: podcastId,
        title: form.title,
        description: form.description || null,
        audio_url: form.audio_url || null,
        external_url: form.external_url || null,
        cover_url: form.cover_url || null,
        duration_seconds: parseDuration(form.duration_seconds),
        published_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Épisode ajouté"); setForm({ title: "", description: "", audio_url: "", external_url: "", duration_seconds: "", cover_url: "" }); qc.invalidateQueries({ queryKey: ["admin-episodes", podcastId] }); qc.invalidateQueries({ queryKey: ["episodes", podcastId] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("episodes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-episodes", podcastId] }); qc.invalidateQueries({ queryKey: ["episodes", podcastId] }); },
  });

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      <div className="space-y-2">
        <Input placeholder="Titre de l'épisode" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Textarea rows={2} placeholder="Description (optionnel)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Input placeholder="URL audio du flux (mp3/aac direct)" value={form.audio_url} onChange={(e) => setForm({ ...form, audio_url: e.target.value })} />
        <Input placeholder="Lien externe manager radio (optionnel)" value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} />
        <div className="flex gap-2">
          <Input placeholder="Durée (mm:ss)" value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} />
          <ImageUploader value={form.cover_url} onChange={(v) => setForm({ ...form, cover_url: v })} folder="covers" label="Pochette" />
        </div>
        <Button size="sm" onClick={() => create.mutate()}>Ajouter l'épisode</Button>
      </div>
      <ul className="space-y-1">
        {eps.map((e) => (
          <li key={e.id} className="rounded border border-border p-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 truncate">{e.title}</div>
              <Button size="icon" variant="ghost" onClick={() => setEditId(editId === e.id ? null : e.id)} aria-label="Modifier"><Pencil className="size-3" /></Button>
              <Button size="icon" variant="ghost" onClick={() => { if (confirm("Supprimer ?")) remove.mutate(e.id); }}><Trash2 className="size-3" /></Button>
            </div>
            {editId === e.id && <EpisodeEdit episode={e as any} invalidateKeys={[["admin-episodes", podcastId], ["episodes", podcastId]]} onDone={() => setEditId(null)} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EpisodeEdit({ episode, invalidateKeys, onDone }: {
  episode: { id: string; title: string; description: string | null; audio_url: string | null; external_url: string | null; duration_seconds: number | null; cover_url: string | null };
  invalidateKeys: (readonly unknown[])[];
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    title: episode.title,
    description: episode.description ?? "",
    audio_url: episode.audio_url ?? "",
    external_url: episode.external_url ?? "",
    duration_seconds: formatDuration(episode.duration_seconds),
    cover_url: episode.cover_url ?? "",
  });
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("episodes").update({
        title: f.title,
        description: f.description || null,
        audio_url: f.audio_url || null,
        external_url: f.external_url || null,
        cover_url: f.cover_url || null,
        duration_seconds: parseDuration(f.duration_seconds),
      }).eq("id", episode.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Épisode mis à jour"); invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k })); onDone(); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="mt-2 space-y-2 border-t border-border pt-2">
      <Input placeholder="Titre" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <Textarea rows={2} placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <Input placeholder="URL audio" value={f.audio_url} onChange={(e) => setF({ ...f, audio_url: e.target.value })} />
      <Input placeholder="Lien externe" value={f.external_url} onChange={(e) => setF({ ...f, external_url: e.target.value })} />
      <div className="flex gap-2">
        <Input placeholder="Durée (mm:ss)" value={f.duration_seconds} onChange={(e) => setF({ ...f, duration_seconds: e.target.value })} />
        <ImageUploader value={f.cover_url} onChange={(v) => setF({ ...f, cover_url: v })} folder="covers" label="Pochette" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => save.mutate()} disabled={!f.title}>Enregistrer</Button>
        <Button size="sm" variant="outline" onClick={onDone}>Annuler</Button>
      </div>
    </div>
  );
}

function ShowsAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState<{ type: "emission" | "chronique" | "animateur"; title: string; description: string; schedule: string; host: string; cover_url: string; duration_seconds: string }>({ type: "emission", title: "", description: "", schedule: "", host: "", cover_url: "", duration_seconds: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: shows = [] } = useQuery({
    queryKey: ["admin-shows"],
    queryFn: async () => {
      const { data } = await supabase.from("shows").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title) throw new Error("Titre requis");
      const { error } = await supabase.from("shows").insert({
        type: form.type,
        title: form.title,
        description: form.description || null,
        schedule: form.schedule || null,
        host: form.host || null,
        cover_url: form.cover_url || null,
        duration_seconds: parseDuration(form.duration_seconds),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ajouté"); setForm({ type: form.type, title: "", description: "", schedule: "", host: "", cover_url: "", duration_seconds: "" }); qc.invalidateQueries({ queryKey: ["admin-shows"] }); qc.invalidateQueries({ queryKey: ["shows"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-shows"] }); qc.invalidateQueries({ queryKey: ["shows"] }); },
  });

  return (
    <div className="space-y-4">
      <div className="card-brut space-y-2 p-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Nouvelle entrée</h3>
        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="emission">Émission</SelectItem>
            <SelectItem value="chronique">Chronique</SelectItem>
            <SelectItem value="animateur">Animateur</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Titre (ex : IndiPlanet')" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Textarea rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Input placeholder="Horaire (ex : Tous les matins 6h-9h)" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} />
        <Input placeholder="Animateur·rice·s (ex : Melody, Alex, Patrick)" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
        <ImageUploader value={form.cover_url} onChange={(v) => setForm({ ...form, cover_url: v })} folder="covers" label="Pochette" />
        <Input placeholder="Durée (mm:ss, optionnel)" value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} />
        <Button onClick={() => create.mutate()} disabled={!form.title}>Ajouter</Button>
      </div>

      <ul className="space-y-2">
        {shows.map((s) => (
          <li key={s.id} className="card-brut p-3">
            <div className="flex items-center gap-3">
              <div className="size-14 shrink-0 overflow-hidden rounded bg-muted">
                {s.cover_url ? <img src={s.cover_url} alt={s.title} className="size-full object-cover" /> : <div className="grid size-full place-items-center"><Mic2 className="size-5 text-muted-foreground" /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-widest text-primary">{s.type}</div>
                <div className="truncate text-sm font-bold">{s.title}</div>
                <div className="truncate text-xs text-muted-foreground">{[s.schedule, (s as any).host].filter(Boolean).join(" · ")}</div>
              </div>
              <Button size="icon" variant="outline" onClick={() => setEditId(editId === s.id ? null : s.id)} aria-label="Modifier"><Pencil className="size-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => setOpenId(openId === s.id ? null : s.id)}>{openId === s.id ? "Fermer" : "Replays"}</Button>
              <Button size="icon" variant="destructive" onClick={() => { if (confirm("Supprimer ?")) remove.mutate(s.id); }}><Trash2 className="size-4" /></Button>
            </div>
            {editId === s.id && <ShowEdit show={s as any} onDone={() => setEditId(null)} />}
            {openId === s.id && <ShowEpisodesAdmin showId={s.id} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ShowEdit({ show, onDone }: { show: { id: string; type: "emission" | "chronique" | "animateur"; title: string; description: string | null; schedule: string | null; host: string | null; cover_url: string | null; duration_seconds: number | null }; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    type: show.type,
    title: show.title,
    description: show.description ?? "",
    schedule: show.schedule ?? "",
    host: show.host ?? "",
    cover_url: show.cover_url ?? "",
    duration_seconds: formatDuration(show.duration_seconds),
  });
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("shows").update({
        type: f.type,
        title: f.title,
        description: f.description || null,
        schedule: f.schedule || null,
        host: f.host || null,
        cover_url: f.cover_url || null,
        duration_seconds: parseDuration(f.duration_seconds),
      }).eq("id", show.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Émission mise à jour"); qc.invalidateQueries({ queryKey: ["admin-shows"] }); qc.invalidateQueries({ queryKey: ["shows"] }); onDone(); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v as any })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="emission">Émission</SelectItem>
          <SelectItem value="chronique">Chronique</SelectItem>
          <SelectItem value="animateur">Animateur</SelectItem>
        </SelectContent>
      </Select>
      <Input placeholder="Titre" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <Textarea rows={2} placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <Input placeholder="Horaire" value={f.schedule} onChange={(e) => setF({ ...f, schedule: e.target.value })} />
      <Input placeholder="Animateur·rice·s" value={f.host} onChange={(e) => setF({ ...f, host: e.target.value })} />
      <ImageUploader value={f.cover_url} onChange={(v) => setF({ ...f, cover_url: v })} folder="covers" label="Pochette" />
      <Input placeholder="Durée (mm:ss)" value={f.duration_seconds} onChange={(e) => setF({ ...f, duration_seconds: e.target.value })} />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => save.mutate()} disabled={!f.title}>Enregistrer</Button>
        <Button size="sm" variant="outline" onClick={onDone}>Annuler</Button>
      </div>
    </div>
  );
}

function ShowEpisodesAdmin({ showId }: { showId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", description: "", audio_url: "", external_url: "", duration_seconds: "", cover_url: "" });
  const [editId, setEditId] = useState<string | null>(null);

  const { data: eps = [] } = useQuery({
    queryKey: ["admin-show-episodes", showId],
    queryFn: async () => {
      const { data } = await supabase.from("episodes").select("*").eq("show_id", showId).order("published_at", { ascending: false });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title) throw new Error("Titre requis");
      if (!form.audio_url && !form.external_url) throw new Error("URL audio ou lien externe requis");
      const { error } = await supabase.from("episodes").insert({
        show_id: showId,
        podcast_id: null,
        title: form.title,
        description: form.description || null,
        audio_url: form.audio_url || null,
        external_url: form.external_url || null,
        cover_url: form.cover_url || null,
        duration_seconds: parseDuration(form.duration_seconds),
        published_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Replay ajouté"); setForm({ title: "", description: "", audio_url: "", external_url: "", duration_seconds: "", cover_url: "" }); qc.invalidateQueries({ queryKey: ["admin-show-episodes", showId] }); qc.invalidateQueries({ queryKey: ["show-episodes", showId] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("episodes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-show-episodes", showId] }); qc.invalidateQueries({ queryKey: ["show-episodes", showId] }); },
  });

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      <div className="space-y-2">
        <Input placeholder="Titre du replay" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Textarea rows={2} placeholder="Résumé (optionnel)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Input placeholder="URL audio (mp3/aac direct)" value={form.audio_url} onChange={(e) => setForm({ ...form, audio_url: e.target.value })} />
        <Input placeholder="Lien externe manager radio (optionnel)" value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} />
        <div className="flex gap-2">
          <Input placeholder="Durée (mm:ss)" value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} />
          <ImageUploader value={form.cover_url} onChange={(v) => setForm({ ...form, cover_url: v })} folder="covers" label="Pochette" />
        </div>
        <Button size="sm" onClick={() => create.mutate()}>Ajouter le replay</Button>
      </div>
      <ul className="space-y-1">
        {eps.map((e) => (
          <li key={e.id} className="rounded border border-border p-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 truncate">{e.title}</div>
              <Button size="icon" variant="ghost" onClick={() => setEditId(editId === e.id ? null : e.id)} aria-label="Modifier"><Pencil className="size-3" /></Button>
              <Button size="icon" variant="ghost" onClick={() => { if (confirm("Supprimer ?")) remove.mutate(e.id); }}><Trash2 className="size-3" /></Button>
            </div>
            {editId === e.id && <EpisodeEdit episode={e as any} invalidateKeys={[["admin-show-episodes", showId], ["show-episodes", showId]]} onDone={() => setEditId(null)} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

type ReviewRow = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  label: string | null;
  cover_url: string | null;
  release_date: string | null;
  rating: number | null;
  excerpt: string | null;
  content: string;
  spotify_url: string | null;
  bandcamp_url: string | null;
  youtube_url: string | null;
  soundcloud_url: string | null;
  apple_music_url: string | null;
  social_links: SocialLinks | null;
  published: boolean;
};

const EMPTY_REVIEW = {
  slug: "", title: "", artist: "", label: "", cover_url: "", release_date: "",
  rating: "", excerpt: "", content: "",
  spotify_url: "", bandcamp_url: "", youtube_url: "", soundcloud_url: "", apple_music_url: "",
  published: true,
};

function ChroniquesAdmin() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [form, setForm] = useState(EMPTY_REVIEW);
  const [socialDraft, setSocialDraft] = useState<SocialLinks>({});
  const [editId, setEditId] = useState<string | null>(null);

  const { data: reviews = [] } = useQuery({
    queryKey: ["admin-album-reviews"],
    queryFn: async () => {
      const { data } = await supabase.from("album_reviews").select("*").order("created_at", { ascending: false });
      return (data ?? []) as ReviewRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Non authentifié");
      if (!form.title || !form.artist || !form.content) throw new Error("Titre, artiste et chronique requis");
      const slug = (form.slug || slugify(`${form.artist}-${form.title}`)) || slugify(form.title);
      const { error } = await supabase.from("album_reviews").insert({
        slug,
        title: form.title,
        artist: form.artist,
        label: form.label || null,
        cover_url: form.cover_url || null,
        release_date: form.release_date || null,
        rating: form.rating ? Number(form.rating) : null,
        excerpt: form.excerpt || null,
        content: form.content,
        spotify_url: form.spotify_url || null,
        bandcamp_url: form.bandcamp_url || null,
        youtube_url: form.youtube_url || null,
        soundcloud_url: form.soundcloud_url || null,
        apple_music_url: form.apple_music_url || null,
        social_links: sanitizeLinks(socialDraft),
        published: form.published,
        author_id: session.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chronique publiée");
      setForm(EMPTY_REVIEW);
      setSocialDraft({});
      qc.invalidateQueries({ queryKey: ["admin-album-reviews"] });
      qc.invalidateQueries({ queryKey: ["album-reviews"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("album_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supprimée");
      qc.invalidateQueries({ queryKey: ["admin-album-reviews"] });
      qc.invalidateQueries({ queryKey: ["album-reviews"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="card-brut space-y-2 p-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Nouvelle chronique</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input placeholder="Titre de l'album *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input placeholder="Artiste *" value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} />
          <Input placeholder="Label (optionnel)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <Input type="date" placeholder="Date de sortie" value={form.release_date} onChange={(e) => setForm({ ...form, release_date: e.target.value })} />
          <Input placeholder="Slug URL (auto si vide)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <Input type="number" step="0.1" min="0" max="5" placeholder="Note /5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
          <ImageUploader value={form.cover_url} onChange={(v) => setForm({ ...form, cover_url: v })} folder="covers" label="Pochette" />
        </div>
        <Textarea rows={2} placeholder="Extrait / résumé court" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
        <Textarea rows={6} placeholder="Chronique complète *" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input placeholder="Spotify URL" value={form.spotify_url} onChange={(e) => setForm({ ...form, spotify_url: e.target.value })} />
          <Input placeholder="Bandcamp URL" value={form.bandcamp_url} onChange={(e) => setForm({ ...form, bandcamp_url: e.target.value })} />
          <Input placeholder="YouTube URL" value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} />
          <Input placeholder="SoundCloud URL" value={form.soundcloud_url} onChange={(e) => setForm({ ...form, soundcloud_url: e.target.value })} />
          <Input placeholder="Apple Music URL" value={form.apple_music_url} onChange={(e) => setForm({ ...form, apple_music_url: e.target.value })} />
        </div>
        <SocialLinksEditor value={socialDraft} onChange={setSocialDraft} />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
            Publier immédiatement
          </label>
          <Button size="sm" onClick={() => create.mutate()} disabled={!form.title || !form.artist || !form.content || create.isPending}>
            {create.isPending ? "Publication…" : "Publier la chronique"}
          </Button>
        </div>
      </div>

      <ul className="space-y-2">
        {reviews.map((r) => (
          <li key={r.id} className="card-brut p-3">
            <div className="flex items-center gap-3">
              <div className="size-14 shrink-0 overflow-hidden rounded bg-muted">
                {r.cover_url ? <img src={r.cover_url} alt={r.title} className="size-full object-cover" /> : <div className="grid size-full place-items-center"><Disc3 className="size-5 text-muted-foreground" /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{r.title} <span className="font-normal text-muted-foreground">— {r.artist}</span></div>
                <div className="truncate text-xs text-muted-foreground">
                  /{r.slug} · {r.published ? "publiée" : "brouillon"}
                  {r.rating != null ? ` · ${Number(r.rating).toFixed(1)}/5` : ""}
                </div>
              </div>
              <Button size="icon" variant="outline" onClick={() => setEditId(editId === r.id ? null : r.id)} aria-label="Modifier"><Pencil className="size-4" /></Button>
              <Button size="icon" variant="destructive" onClick={() => { if (confirm("Supprimer cette chronique ?")) remove.mutate(r.id); }} aria-label="Supprimer"><Trash2 className="size-4" /></Button>
            </div>
            {editId === r.id && <ChroniqueEdit review={r} onDone={() => setEditId(null)} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChroniqueEdit({ review, onDone }: { review: ReviewRow; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    slug: review.slug,
    title: review.title,
    artist: review.artist,
    label: review.label ?? "",
    cover_url: review.cover_url ?? "",
    release_date: review.release_date ?? "",
    rating: review.rating != null ? String(review.rating) : "",
    excerpt: review.excerpt ?? "",
    content: review.content,
    spotify_url: review.spotify_url ?? "",
    bandcamp_url: review.bandcamp_url ?? "",
    youtube_url: review.youtube_url ?? "",
    soundcloud_url: review.soundcloud_url ?? "",
    apple_music_url: review.apple_music_url ?? "",
    published: review.published,
  });
  const [social, setSocial] = useState<SocialLinks>((review.social_links as SocialLinks | null) ?? {});
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("album_reviews").update({
        slug: f.slug || slugify(f.title),
        title: f.title,
        artist: f.artist,
        label: f.label || null,
        cover_url: f.cover_url || null,
        release_date: f.release_date || null,
        rating: f.rating ? Number(f.rating) : null,
        excerpt: f.excerpt || null,
        content: f.content,
        spotify_url: f.spotify_url || null,
        bandcamp_url: f.bandcamp_url || null,
        youtube_url: f.youtube_url || null,
        soundcloud_url: f.soundcloud_url || null,
        apple_music_url: f.apple_music_url || null,
        social_links: sanitizeLinks(social),
        published: f.published,
      }).eq("id", review.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chronique mise à jour");
      qc.invalidateQueries({ queryKey: ["admin-album-reviews"] });
      qc.invalidateQueries({ queryKey: ["album-reviews"] });
      onDone();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input placeholder="Titre" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <Input placeholder="Artiste" value={f.artist} onChange={(e) => setF({ ...f, artist: e.target.value })} />
        <Input placeholder="Label" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
        <Input type="date" placeholder="Sortie" value={f.release_date} onChange={(e) => setF({ ...f, release_date: e.target.value })} />
        <Input placeholder="Slug" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} />
        <Input type="number" step="0.1" min="0" max="5" placeholder="Note /5" value={f.rating} onChange={(e) => setF({ ...f, rating: e.target.value })} />
        <ImageUploader value={f.cover_url} onChange={(v) => setF({ ...f, cover_url: v })} folder="covers" label="Pochette" />
      </div>
      <Textarea rows={2} placeholder="Extrait" value={f.excerpt} onChange={(e) => setF({ ...f, excerpt: e.target.value })} />
      <Textarea rows={6} placeholder="Chronique" value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input placeholder="Spotify" value={f.spotify_url} onChange={(e) => setF({ ...f, spotify_url: e.target.value })} />
        <Input placeholder="Bandcamp" value={f.bandcamp_url} onChange={(e) => setF({ ...f, bandcamp_url: e.target.value })} />
        <Input placeholder="YouTube" value={f.youtube_url} onChange={(e) => setF({ ...f, youtube_url: e.target.value })} />
        <Input placeholder="SoundCloud" value={f.soundcloud_url} onChange={(e) => setF({ ...f, soundcloud_url: e.target.value })} />
        <Input placeholder="Apple Music" value={f.apple_music_url} onChange={(e) => setF({ ...f, apple_music_url: e.target.value })} />
      </div>
      <SocialLinksEditor value={social} onChange={setSocial} />
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs">
          <Switch checked={f.published} onCheckedChange={(v) => setF({ ...f, published: v })} />
          Publiée
        </label>
        <Button size="sm" onClick={() => save.mutate()} disabled={!f.title || !f.artist || !f.content}>Enregistrer</Button>
        <Button size="sm" variant="outline" onClick={onDone}>Annuler</Button>
      </div>
    </div>
  );
}
function ReportsAdmin() {
  const [kind, setKind] = useState<"comments" | "images" | "albums">("comments");
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(["comments", "images", "albums"] as const).map((k) => (
          <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>
            {k === "comments" ? "Commentaires" : k === "images" ? "Photos" : "Albums"}
          </Button>
        ))}
      </div>
      {kind === "comments" ? <CommentReportsAdmin /> : kind === "images" ? <ImageReportsAdmin /> : <AlbumReportsAdmin />}
    </div>
  );
}

function CommentReportsAdmin() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [status, setStatus] = useState<"pending" | "resolved" | "dismissed">("pending");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-comment-reports", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comment_reports")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch comment bodies + reporter pseudos
  const { data: enriched = [] } = useQuery({
    queryKey: ["admin-comment-reports-enriched", reports.map((r) => r.id).join("|")],
    enabled: reports.length > 0,
    queryFn: async () => {
      const byType: Record<string, string[]> = { content_comment: [], news_comment: [], post_comment: [] };
      for (const r of reports) byType[r.comment_type]?.push(r.comment_id);
      const [cc, nc, pc] = await Promise.all([
        byType.content_comment.length
          ? supabase.from("content_comments").select("id, body, author_id, content_type, content_id").in("id", byType.content_comment)
          : Promise.resolve({ data: [] as any[] }),
        byType.news_comment.length
          ? supabase.from("news_comments").select("id, content, author_id, news_post_id").in("id", byType.news_comment)
          : Promise.resolve({ data: [] as any[] }),
        byType.post_comment.length
          ? supabase.from("post_comments").select("id, content, author_id, post_id").in("id", byType.post_comment)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const map = new Map<string, any>();
      (cc.data ?? []).forEach((c: any) => map.set(`content_comment:${c.id}`, { body: c.body, author_id: c.author_id, context: `${c.content_type}/${c.content_id}` }));
      (nc.data ?? []).forEach((c: any) => map.set(`news_comment:${c.id}`, { body: c.content, author_id: c.author_id, context: `actu/${c.news_post_id}` }));
      (pc.data ?? []).forEach((c: any) => map.set(`post_comment:${c.id}`, { body: c.content, author_id: c.author_id, context: `post/${c.post_id}` }));
      const uids = Array.from(new Set([...reports.map((r) => r.reporter_id), ...Array.from(map.values()).map((v: any) => v.author_id)].filter(Boolean)));
      let profs: Record<string, string> = {};
      if (uids.length) {
        const { data: p } = await supabase.from("profiles").select("id, pseudo").in("id", uids);
        profs = Object.fromEntries((p ?? []).map((x: any) => [x.id, x.pseudo]));
      }
      return reports.map((r) => {
        const c = map.get(`${r.comment_type}:${r.comment_id}`);
        return {
          ...r,
          comment_body: c?.body ?? "(commentaire supprimé)",
          comment_author: c?.author_id ? profs[c.author_id] ?? "auditeur" : null,
          comment_context: c?.context ?? "",
          reporter_pseudo: profs[r.reporter_id] ?? "auditeur",
        };
      });
    },
  });

  const setStatusMut = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: "resolved" | "dismissed" }) => {
      const { error } = await supabase
        .from("comment_reports")
        .update({ status: next, resolved_at: new Date().toISOString(), resolved_by: session?.user.id ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Signalement traité");
      qc.invalidateQueries({ queryKey: ["admin-comment-reports"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteComment = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      const table = type === "news_comment" ? "news_comments" : type === "post_comment" ? "post_comments" : "content_comments";
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Commentaire supprimé");
      qc.invalidateQueries({ queryKey: ["admin-comment-reports"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(["pending", "resolved", "dismissed"] as const).map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
            {s === "pending" ? "En attente" : s === "resolved" ? "Résolus" : "Rejetés"}
          </Button>
        ))}
      </div>
      {isLoading && <div className="card-brut p-3 text-sm text-muted-foreground">Chargement…</div>}
      {!isLoading && enriched.length === 0 && (
        <div className="card-brut p-4 text-sm text-muted-foreground">Aucun signalement.</div>
      )}
      <ul className="space-y-2">
        {enriched.map((r: any) => (
          <li key={r.id} className="card-brut space-y-2 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{r.comment_type}</span>
                <span className="ml-2 text-muted-foreground">{r.comment_context}</span>
              </div>
              <span className="text-muted-foreground">
                Signalé par <b>{r.reporter_pseudo}</b> · {new Date(r.created_at).toLocaleString("fr-FR")}
              </span>
            </div>
            <div className="rounded border border-border bg-muted/40 p-2 text-sm">
              <div className="mb-1 text-[11px] text-muted-foreground">Auteur : {r.comment_author ?? "—"}</div>
              <p className="whitespace-pre-wrap">{r.comment_body}</p>
            </div>
            <div className="text-xs">
              <span className="font-semibold">Motif :</span> {r.reason}
            </div>
            {status === "pending" && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="destructive" onClick={() => { if (confirm("Supprimer le commentaire ?")) { deleteComment.mutate({ type: r.comment_type, id: r.comment_id }); setStatusMut.mutate({ id: r.id, next: "resolved" }); } }}>
                  <Trash2 className="mr-1 size-3" /> Supprimer & résoudre
                </Button>
                <Button size="sm" variant="outline" onClick={() => setStatusMut.mutate({ id: r.id, next: "resolved" })}>Marquer résolu</Button>
                <Button size="sm" variant="ghost" onClick={() => setStatusMut.mutate({ id: r.id, next: "dismissed" })}>Rejeter</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ImageReportsAdmin() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [status, setStatus] = useState<"pending" | "resolved" | "dismissed">("pending");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-image-reports", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_reports")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: enriched = [] } = useQuery({
    queryKey: ["admin-image-reports-enriched", reports.map((r) => r.id).join("|")],
    enabled: reports.length > 0,
    queryFn: async () => {
      const postIds = Array.from(new Set(reports.map((r) => r.post_id)));
      const uids = Array.from(new Set(reports.map((r) => r.reporter_id)));
      const [postsRes, profRes] = await Promise.all([
        postIds.length
          ? supabase.from("posts").select("id, author_id, content, image_url, image_urls").in("id", postIds)
          : Promise.resolve({ data: [] as any[] }),
        uids.length
          ? supabase.from("profiles").select("id, pseudo").in("id", uids)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const posts = new Map<string, any>((postsRes.data ?? []).map((p: any) => [p.id, p]));
      const authorIds = Array.from(new Set(Array.from(posts.values()).map((p: any) => p.author_id))).filter(Boolean);
      let authorMap: Record<string, string> = {};
      if (authorIds.length) {
        const { data: a } = await supabase.from("profiles").select("id, pseudo").in("id", authorIds);
        authorMap = Object.fromEntries((a ?? []).map((x: any) => [x.id, x.pseudo]));
      }
      const profs = Object.fromEntries((profRes.data ?? []).map((x: any) => [x.id, x.pseudo]));
      return reports.map((r) => {
        const p = posts.get(r.post_id);
        return {
          ...r,
          post_author: p?.author_id ? authorMap[p.author_id] ?? "auditeur" : null,
          post_author_id: p?.author_id ?? null,
          post_excerpt: (p?.content ?? "").slice(0, 160),
          reporter_pseudo: profs[r.reporter_id] ?? "auditeur",
        };
      });
    },
  });

  const setStatusMut = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: "resolved" | "dismissed" }) => {
      const { error } = await supabase
        .from("image_reports")
        .update({ status: next, resolved_at: new Date().toISOString(), resolved_by: session?.user.id ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Signalement traité");
      qc.invalidateQueries({ queryKey: ["admin-image-reports"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const removeImage = useMutation({
    mutationFn: async ({ post_id, image_url }: { post_id: string; image_url: string }) => {
      const { data: post, error: e1 } = await supabase.from("posts").select("image_url, image_urls").eq("id", post_id).maybeSingle();
      if (e1) throw e1;
      if (!post) return;
      const nextUrls = (post.image_urls ?? []).filter((u: string) => u !== image_url);
      const nextMain = post.image_url === image_url ? (nextUrls[0] ?? null) : post.image_url;
      const { error } = await supabase.from("posts").update({ image_url: nextMain, image_urls: nextUrls }).eq("id", post_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Photo retirée de la publication");
      qc.invalidateQueries({ queryKey: ["admin-image-reports"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(["pending", "resolved", "dismissed"] as const).map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
            {s === "pending" ? "En attente" : s === "resolved" ? "Résolus" : "Rejetés"}
          </Button>
        ))}
      </div>
      {isLoading && <div className="card-brut p-3 text-sm text-muted-foreground">Chargement…</div>}
      {!isLoading && enriched.length === 0 && (
        <div className="card-brut p-4 text-sm text-muted-foreground">Aucun signalement.</div>
      )}
      <ul className="space-y-2">
        {enriched.map((r: any) => (
          <li key={r.id} className="card-brut space-y-2 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">post/{r.post_id.slice(0, 8)}</span>
              <span className="text-muted-foreground">
                Signalé par <b>{r.reporter_pseudo}</b> · {new Date(r.created_at).toLocaleString("fr-FR")}
              </span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative overflow-hidden rounded border border-border bg-muted sm:w-64" style={{ aspectRatio: "16/9" }}>
                <img src={r.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 space-y-1 text-sm">
                <div className="text-[11px] text-muted-foreground">Auteur : {r.post_author ?? "—"}</div>
                {r.post_excerpt && <p className="whitespace-pre-wrap text-muted-foreground">{r.post_excerpt}</p>}
                <div className="text-xs"><span className="font-semibold">Motif :</span> {r.reason}</div>
                <a href={r.image_url} target="_blank" rel="noreferrer" className="inline-block text-[11px] underline">Ouvrir la photo</a>
              </div>
            </div>
            {status === "pending" && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="destructive" onClick={() => { if (confirm("Retirer cette photo de la publication ?")) { removeImage.mutate({ post_id: r.post_id, image_url: r.image_url }); setStatusMut.mutate({ id: r.id, next: "resolved" }); } }}>
                  <Trash2 className="mr-1 size-3" /> Retirer & résoudre
                </Button>
                <Button size="sm" variant="outline" onClick={() => setStatusMut.mutate({ id: r.id, next: "resolved" })}>Marquer résolu</Button>
                <Button size="sm" variant="ghost" onClick={() => setStatusMut.mutate({ id: r.id, next: "dismissed" })}>Rejeter</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlbumReportsAdmin() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [status, setStatus] = useState<"pending" | "resolved" | "dismissed">("pending");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-album-reports", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("album_reports")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: enriched = [] } = useQuery({
    queryKey: ["admin-album-reports-enriched", reports.map((r: any) => r.id).join("|")],
    enabled: reports.length > 0,
    queryFn: async () => {
      const albumIds = Array.from(new Set(reports.map((r: any) => r.album_id)));
      const uids = Array.from(new Set(reports.map((r: any) => r.reporter_id)));
      const [albumsRes, profRes] = await Promise.all([
        albumIds.length
          ? supabase.from("photo_albums").select("id, owner_id, title, description, cover_url").in("id", albumIds)
          : Promise.resolve({ data: [] as any[] }),
        uids.length
          ? supabase.from("profiles").select("id, pseudo").in("id", uids)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const albums = new Map<string, any>((albumsRes.data ?? []).map((a: any) => [a.id, a]));
      const ownerIds = Array.from(new Set(Array.from(albums.values()).map((a: any) => a.owner_id))).filter(Boolean);
      let ownerMap: Record<string, string> = {};
      if (ownerIds.length) {
        const { data: o } = await supabase.from("profiles").select("id, pseudo").in("id", ownerIds);
        ownerMap = Object.fromEntries((o ?? []).map((x: any) => [x.id, x.pseudo]));
      }
      const profs = Object.fromEntries((profRes.data ?? []).map((x: any) => [x.id, x.pseudo]));
      return reports.map((r: any) => {
        const a = albums.get(r.album_id);
        return {
          ...r,
          album_title: a?.title ?? "(album supprimé)",
          album_description: a?.description ?? "",
          album_cover: a?.cover_url ?? null,
          owner_pseudo: a?.owner_id ? ownerMap[a.owner_id] ?? "auditeur" : null,
          reporter_pseudo: profs[r.reporter_id] ?? "auditeur",
        };
      });
    },
  });

  const setStatusMut = useMutation({
    mutationFn: async ({ id, next, actionTaken }: { id: string; next: "resolved" | "dismissed"; actionTaken?: string }) => {
      const { error } = await supabase
        .from("album_reports")
        .update({ status: next, resolved_at: new Date().toISOString(), resolved_by: session?.user.id ?? null })
        .eq("id", id);
      if (error) throw error;
      const { notifyAdminAlbumReportResolved } = await import("@/lib/album-report-email.functions");
      notifyAdminAlbumReportResolved({ data: { reportId: id, outcome: next, actionTaken } }).catch(() => {});
    },
    onSuccess: () => {
      toast.success("Signalement traité");
      qc.invalidateQueries({ queryKey: ["admin-album-reports"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteAlbum = useMutation({
    mutationFn: async ({ album_id }: { album_id: string }) => {
      const { error } = await supabase.from("photo_albums").delete().eq("id", album_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Album supprimé");
      qc.invalidateQueries({ queryKey: ["admin-album-reports"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(["pending", "resolved", "dismissed"] as const).map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
            {s === "pending" ? "En attente" : s === "resolved" ? "Résolus" : "Rejetés"}
          </Button>
        ))}
      </div>
      {isLoading && <div className="card-brut p-3 text-sm text-muted-foreground">Chargement…</div>}
      {!isLoading && enriched.length === 0 && (
        <div className="card-brut p-4 text-sm text-muted-foreground">Aucun signalement.</div>
      )}
      <ul className="space-y-2">
        {enriched.map((r: any) => (
          <li key={r.id} className="card-brut space-y-2 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">album/{r.album_id.slice(0, 8)}</span>
              <span className="text-muted-foreground">
                Signalé par <b>{r.reporter_pseudo}</b> · {new Date(r.created_at).toLocaleString("fr-FR")}
              </span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative overflow-hidden rounded border border-border bg-muted sm:w-64" style={{ aspectRatio: "16/9" }}>
                {r.album_cover ? (
                  <img src={r.album_cover} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">Pas de couverture</div>
                )}
              </div>
              <div className="flex-1 space-y-1 text-sm">
                <div className="font-bold">{r.album_title}</div>
                <div className="text-[11px] text-muted-foreground">Auteur : {r.owner_pseudo ?? "—"}</div>
                {r.album_description && <p className="whitespace-pre-wrap text-muted-foreground">{r.album_description}</p>}
                <div className="text-xs"><span className="font-semibold">Motif :</span> {r.reason}</div>
                {r.owner_pseudo && (
                  <a href={`/u/${r.owner_pseudo}/albums/${r.album_id}`} target="_blank" rel="noreferrer" className="inline-block text-[11px] underline">
                    Ouvrir l'album
                  </a>
                )}
              </div>
            </div>
            {status === "pending" && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="destructive" onClick={() => { if (confirm("Supprimer définitivement l'album ?")) { deleteAlbum.mutate({ album_id: r.album_id }); setStatusMut.mutate({ id: r.id, next: "resolved", actionTaken: "Album supprimé." }); } }}>
                  <Trash2 className="mr-1 size-3" /> Supprimer l'album & résoudre
                </Button>
                <Button size="sm" variant="outline" onClick={() => setStatusMut.mutate({ id: r.id, next: "resolved" })}>Marquer résolu</Button>
                <Button size="sm" variant="ghost" onClick={() => setStatusMut.mutate({ id: r.id, next: "dismissed" })}>Rejeter</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
