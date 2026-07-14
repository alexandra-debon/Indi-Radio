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
import { ShieldAlert, Users, Send, Newspaper } from "lucide-react";
import { z } from "zod";

const adminSearchSchema = z.object({
  tab: z.enum(["users", "requests", "news"]).catch("users"),
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
  ];
  return (
    <div className="space-y-4">
      <h1 className="section-title">Panneau admin</h1>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v as "users" | "requests" | "news" } })}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="users">Profils</TabsTrigger>
          <TabsTrigger value="requests">Dédicaces</TabsTrigger>
          <TabsTrigger value="news">Publier</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4"><UserAdmin /></TabsContent>
        <TabsContent value="requests" className="mt-4"><RequestsAdmin /></TabsContent>
        <TabsContent value="news" className="mt-4"><NewsPublisher /></TabsContent>
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
              <span className="ml-auto text-xs text-muted-foreground">{p.points} pts · Niv. {p.level}</span>
            </div>
          </li>
        ))}
      </ul>
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
        .select("id, track_requested, dedication_message, status, created_at, author:profiles!requests_author_id_fkey(pseudo,role,is_certified,level)")
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