import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2, UserPlus, ShieldCheck, Mail, Send, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBlogAuthors } from "@/hooks/use-blog-authors";
import { createBlogInvite } from "@/lib/blog-invites.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Gestion (admin only) des personnes autorisées à publier sur le
 * Blog InDi ArT CulTuRe. L'administrateur peut toujours publier.
 */
export function BlogAuthorsManager() {
  const { session, isAdmin } = useAuth();
  const qc = useQueryClient();
  const { data: authors = [] } = useBlogAuthors();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const sendInvite = useServerFn(createBlogInvite);

  const { data: invites = [] } = useQuery({
    queryKey: ["blog-invites"],
    enabled: isAdmin && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_author_invites")
        .select("id,email,status,expires_at,accepted_at,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const invite = useMutation({
    mutationFn: async (email: string) => sendInvite({ data: { email } }),
    onSuccess: (res) => {
      toast.success(res.sent ? "Invitation envoyée par email" : "Invitation créée (email non délivré — copie le lien)");
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ["blog-invites"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blog_author_invites")
        .update({ status: "revoked" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitation révoquée");
      qc.invalidateQueries({ queryKey: ["blog-invites"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const { data: results = [] } = useQuery({
    queryKey: ["blog-authors-search", search],
    enabled: isAdmin && search.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,pseudo,role")
        .ilike("pseudo", `%${search.trim()}%`)
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("blog_authors")
        .insert({ user_id: userId, granted_by: session?.user.id ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Auteur ajouté au blog");
      setSearch("");
      qc.invalidateQueries({ queryKey: ["blog-authors"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("blog_authors").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Auteur retiré");
      qc.invalidateQueries({ queryKey: ["blog-authors"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!isAdmin) return null;

  return (
    <div className="card-brut p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-left"
      >
        <span className="flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">Auteurs autorisés du blog ({authors.length})</span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Seul l'admin et les personnes de cette liste peuvent publier ou modifier des articles.
            Les likes, commentaires et partages restent ouverts à tous les utilisateurs connectés.
          </p>

          <div className="space-y-1.5">
            <Input
              lang="fr"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher un pseudo à autoriser…"
              className="text-xs"
            />
            {results.length > 0 && (
              <ul className="divide-y divide-border rounded-md border-2 border-border">
                {results
                  .filter((r) => !authors.some((a) => a.user_id === r.id))
                  .map((r) => (
                    <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-2">
                      <span className="min-w-0 truncate text-xs font-semibold">
                        {r.pseudo ?? "—"} <span className="text-muted-foreground">· {r.role}</span>
                      </span>
                      <Button size="sm" className="shrink-0" onClick={() => add.mutate(r.id)} disabled={add.isPending}>
                        <UserPlus className="h-3.5 w-3.5" /> Autoriser
                      </Button>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="space-y-1.5 rounded-md border-2 border-primary/40 p-2">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              <Mail className="h-3.5 w-3.5" /> Inviter un auteur par email
            </p>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input
                type="email"
                inputMode="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="adresse@email.com"
                className="text-xs"
              />
              <Button
                size="sm"
                className="shrink-0"
                disabled={!/^\S+@\S+\.\S+$/.test(inviteEmail.trim()) || invite.isPending}
                onClick={() => invite.mutate(inviteEmail.trim())}
              >
                <Send className="h-3.5 w-3.5" /> Inviter
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              L'invité·e reçoit un lien : l'accès n'est accordé qu'après son acceptation, connecté·e
              avec cette même adresse.
            </p>
            {invites.length > 0 && (
              <ul className="divide-y divide-border rounded-md border border-border">
                {invites.map((i) => (
                  <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-2">
                    <span className="min-w-0 truncate text-[11px]">
                      <span className="font-semibold">{i.email}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        ·{" "}
                        {i.status === "pending"
                          ? "en attente"
                          : i.status === "accepted"
                            ? "acceptée"
                            : "révoquée"}
                      </span>
                    </span>
                    {i.status === "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        onClick={() => revokeInvite.mutate(i.id)}
                        disabled={revokeInvite.isPending}
                      >
                        <Ban className="h-3.5 w-3.5" /> Révoquer
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>


          {authors.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Aucun auteur ajouté — seul l'admin publie.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border-2 border-border">
              {authors.map((a) => (
                <li key={a.user_id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-2">
                  <span className="min-w-0 truncate text-xs font-semibold">
                    {a.profile?.pseudo ?? a.user_id.slice(0, 8)}
                    {a.profile?.role && <span className="text-muted-foreground"> · {a.profile.role}</span>}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => remove.mutate(a.user_id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Retirer
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
