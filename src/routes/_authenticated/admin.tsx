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
import { toast } from "sonner";
import { ShieldAlert, Users, Send, Newspaper, Headphones, Mic2, Trash2 } from "lucide-react";
import { z } from "zod";

const adminSearchSchema = z.object({
  tab: z.enum(["users", "requests", "news", "podcasts", "shows"]).catch("users"),
});

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Panneau admin — Indi Radio" }, { name: "robots", content: "noindex" }] }),
  validateSearch: adminSearchSchema,
  component: AdminPage,
});

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
  ];
  return (
    <div className="space-y-4">
      <h1 className="section-title">Panneau admin</h1>
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
        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="users">Profils</TabsTrigger>
          <TabsTrigger value="requests">Dédicaces</TabsTrigger>
          <TabsTrigger value="news">Publier</TabsTrigger>
          <TabsTrigger value="podcasts">Podcasts</TabsTrigger>
          <TabsTrigger value="shows">Émissions</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4"><UserAdmin /></TabsContent>
        <TabsContent value="requests" className="mt-4"><RequestsAdmin /></TabsContent>
        <TabsContent value="news" className="mt-4"><NewsPublisher /></TabsContent>
        <TabsContent value="podcasts" className="mt-4"><PodcastsAdmin /></TabsContent>
        <TabsContent value="shows" className="mt-4"><ShowsAdmin /></TabsContent>
      </Tabs>
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

  return (
    <div className="space-y-3">
      <Input placeholder="Rechercher un pseudo…" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="space-y-2">
        {profiles.map((p) => (
          <li key={p.id} className="card-brut space-y-2 p-3">
            <UserBadge profile={p} className="text-sm" />
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
            </div>
            <BadgeEditor
              badges={(p as any).badges ?? []}
              onChange={(badges) => updateBadges.mutate({ id: p.id, badges })}
            />
          </li>
        ))}
      </ul>
    </div>
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
  const [form, setForm] = useState({ title: "", description: "", cover_url: "", external_url: "" });

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
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Podcast créé"); setForm({ title: "", description: "", cover_url: "", external_url: "" }); qc.invalidateQueries({ queryKey: ["admin-podcasts"] }); qc.invalidateQueries({ queryKey: ["podcasts"] }); },
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
        <Input placeholder="URL pochette carrée (https://…)" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
        <Input placeholder="Lien manager radio (optionnel)" value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} />
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
              <Button size="sm" variant="outline" onClick={() => setOpenId(openId === p.id ? null : p.id)}>{openId === p.id ? "Fermer" : "Épisodes"}</Button>
              <Button size="icon" variant="destructive" onClick={() => { if (confirm("Supprimer ce podcast et ses épisodes ?")) remove.mutate(p.id); }}><Trash2 className="size-4" /></Button>
            </div>
            {openId === p.id && <EpisodesAdmin podcastId={p.id} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EpisodesAdmin({ podcastId }: { podcastId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", description: "", audio_url: "", external_url: "", duration_seconds: "", cover_url: "" });

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
        duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : null,
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
          <Input type="number" placeholder="Durée (sec)" value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} />
          <Input placeholder="Pochette épisode (URL, optionnel)" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
        </div>
        <Button size="sm" onClick={() => create.mutate()}>Ajouter l'épisode</Button>
      </div>
      <ul className="space-y-1">
        {eps.map((e) => (
          <li key={e.id} className="flex items-center gap-2 rounded border border-border p-2 text-xs">
            <div className="min-w-0 flex-1 truncate">{e.title}</div>
            <Button size="icon" variant="ghost" onClick={() => { if (confirm("Supprimer ?")) remove.mutate(e.id); }}><Trash2 className="size-3" /></Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ShowsAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState<{ type: "emission" | "chronique" | "animateur"; title: string; description: string; schedule: string; host: string; cover_url: string }>({ type: "emission", title: "", description: "", schedule: "", host: "", cover_url: "" });

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
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ajouté"); setForm({ type: form.type, title: "", description: "", schedule: "", host: "", cover_url: "" }); qc.invalidateQueries({ queryKey: ["admin-shows"] }); qc.invalidateQueries({ queryKey: ["shows"] }); },
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
        <Input placeholder="URL pochette carrée" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
        <Button onClick={() => create.mutate()} disabled={!form.title}>Ajouter</Button>
      </div>

      <ul className="space-y-2">
        {shows.map((s) => (
          <li key={s.id} className="card-brut flex items-center gap-3 p-3">
            <div className="size-14 shrink-0 overflow-hidden rounded bg-muted">
              {s.cover_url ? <img src={s.cover_url} alt={s.title} className="size-full object-cover" /> : <div className="grid size-full place-items-center"><Mic2 className="size-5 text-muted-foreground" /></div>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-widest text-primary">{s.type}</div>
              <div className="truncate text-sm font-bold">{s.title}</div>
              <div className="truncate text-xs text-muted-foreground">{[s.schedule, (s as any).host].filter(Boolean).join(" · ")}</div>
            </div>
            <Button size="icon" variant="destructive" onClick={() => { if (confirm("Supprimer ?")) remove.mutate(s.id); }}><Trash2 className="size-4" /></Button>
          </li>
        ))}
      </ul>
    </div>
  );
}