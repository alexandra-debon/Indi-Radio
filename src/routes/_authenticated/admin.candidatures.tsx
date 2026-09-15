import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { reviewRoleRequest } from "@/lib/role-request.functions";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { ShieldAlert, Check, X, Loader2, Newspaper, Mic2 } from "lucide-react";
import { SocialLinksBar, type SocialLinks } from "@/components/social/SocialLinksBar";

export const Route = createFileRoute("/_authenticated/admin/candidatures")({
  head: () => ({
    meta: [{ title: "Candidatures — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminApplicationsPage,
});

type Candidate = {
  id: string;
  pseudo: string;
  stage_name: string | null;
  avatar_url: string | null;
  punchline: string | null;
  bio: string | null;
  social_links: SocialLinks | null;
  role_requested: string | null;
  role_request_note: string | null;
  role_request_submitted_at: string | null;
};

function AdminApplicationsPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const review = useServerFn(reviewRoleRequest);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select(
        "id, pseudo, stage_name, avatar_url, punchline, bio, social_links, role_requested, role_request_note, role_request_submitted_at",
      )
      .eq("role_request_status", "pending")
      .order("role_request_submitted_at", { ascending: true });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data ?? []) as Candidate[]);
  }

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin]);

  async function decide(userId: string, decision: "approved" | "rejected") {
    setBusy(userId);
    try {
      await review({ data: { userId, decision } });
      setRows((r) => r.filter((x) => x.id !== userId));
      toast.success(decision === "approved" ? "Candidature approuvée." : "Candidature refusée.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ShieldAlert className="mx-auto mb-3 size-10 text-destructive" />
        <p className="text-muted-foreground">Cette page est réservée aux administrateurs.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-black">Candidatures</h1>
      <p className="mt-1 text-muted-foreground">
        Demandes de statut Artiste et Média en attente de validation.
      </p>

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-10 rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
          Aucune candidature en attente.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((c) => (
            <li key={c.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-3">
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt="" className="size-10 rounded-full object-cover" />
                ) : (
                  <div className="size-10 rounded-full bg-muted" />
                )}
                <div className="min-w-0">
                  <div className="font-bold">
                    {c.stage_name || c.pseudo}{" "}
                    <span className="text-sm font-normal text-muted-foreground">@{c.pseudo}</span>
                  </div>
                  {c.punchline && <div className="text-sm text-muted-foreground">{c.punchline}</div>}
                </div>
                <span className="ml-auto inline-flex items-center gap-1 rounded-sm border border-primary px-2 py-0.5 text-[11px] uppercase text-primary">
                  {c.role_requested === "media" ? <Newspaper className="size-3" /> : <Mic2 className="size-3" />}
                  {c.role_requested === "media" ? "Média" : "Artiste"}
                </span>
              </div>

              {c.role_request_note && (
                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">
                  {c.role_request_note}
                </p>
              )}
              {c.social_links && Object.keys(c.social_links).length > 0 && (
                <div className="mt-3">
                  <SocialLinksBar links={c.social_links} />
                </div>
              )}
              {c.role_request_submitted_at && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Soumise le {new Date(c.role_request_submitted_at).toLocaleString("fr-FR")}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" disabled={busy === c.id} onClick={() => decide(c.id, "approved")}>
                  <Check className="mr-1 size-4" /> Approuver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === c.id}
                  onClick={() => decide(c.id, "rejected")}
                >
                  <X className="mr-1 size-4" /> Refuser
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
