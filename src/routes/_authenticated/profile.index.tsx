import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { UserBadge } from "@/components/UserBadge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LogOut, AtSign, Trash2, Pencil, Trophy, Eye, UserCircle2 } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { parseNotifUrl } from "@/lib/notif-navigate";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { deleteMyAccount } from "@/lib/account.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/_authenticated/profile/")({
  head: () => ({ meta: [{ title: "Mon profil — Indi Radio" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

const LEVEL_THRESHOLDS = [0, 20, 60, 150, 300];

function ProfilePage() {
  const { profile, signOut, isAdmin, session } = useAuth();
  const qc = useQueryClient();
  const deleteFn = useServerFn(deleteMyAccount);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const { data: mentions = [] } = useQuery({
    queryKey: ["profile-mentions", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, message, url, read_at, created_at")
        .eq("type", "mention")
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`profile-mentions-${session.user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${session.user.id}` },
        () => qc.invalidateQueries({ queryKey: ["profile-mentions", session.user.id] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, qc]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile-mentions", session?.user.id] }),
  });

  if (!profile) return <div className="p-4">Chargement…</div>;

  const nextThreshold = LEVEL_THRESHOLDS[profile.level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const prev = LEVEL_THRESHOLDS[profile.level - 1] ?? 0;
  const progress = profile.level >= 5 ? 100 : Math.min(100, ((profile.points - prev) / (nextThreshold - prev)) * 100);

  return (
    <div className="space-y-4">
      <h1 className="section-title">Mon profil</h1>
      <div className="card-brut space-y-3 p-4">
        <UserBadge profile={profile} className="text-base" />
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Niveau {profile.level}</span>
            <span className="text-sm font-bold">{profile.points} pts</span>
          </div>
          <Progress value={progress} className="mt-1" />
          {profile.level < 5 && (
            <div className="mt-1 text-[10px] text-muted-foreground">
              Prochain palier : {nextThreshold} pts
            </div>
          )}
        </div>
        <Link
          to="/profile/edit"
          className="mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-border bg-background px-3 py-2 text-xs font-black uppercase tracking-widest hover:bg-muted"
        >
          <Pencil className="size-4" /> Modifier mon profil
        </Link>
        {profile.pseudo && (
          <Link
            to="/u/$pseudo"
            params={{ pseudo: profile.pseudo }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-border bg-background px-3 py-2 text-xs font-black uppercase tracking-widest hover:bg-muted"
          >
            <Eye className="size-4" /> Voir mon profil public
          </Link>
        )}
        <Link
          to="/profile/badges"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-border bg-primary px-3 py-2 text-xs font-black uppercase tracking-widest text-primary-foreground hover:opacity-90"
        >
          <Trophy className="size-4" /> Mes badges & succès
        </Link>
      </div>

      <section className="card-brut p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-widest">
          <UserCircle2 className="size-4" /> Ma présentation
        </h2>
        {profile.bio ? (
          <p className="whitespace-pre-wrap text-sm text-foreground">{profile.bio}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Tu n'as pas encore rédigé de présentation. Ajoute quelques lignes pour te
            présenter à la communauté — elles apparaîtront sur ton profil public.
          </p>
        )}
        <Link
          to="/profile/edit"
          className="mt-3 inline-flex items-center gap-2 rounded-md border-2 border-border bg-background px-3 py-1.5 text-[11px] font-black uppercase tracking-widest hover:bg-muted"
        >
          <Pencil className="size-3.5" /> {profile.bio ? "Modifier" : "Rédiger ma présentation"}
        </Link>
      </section>

      {isAdmin && (
        <Link to="/admin" className="card-brut block p-3 text-center text-sm font-semibold text-destructive">
          → Panneau admin
        </Link>
      )}

      <section className="card-brut p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest">
          <AtSign className="size-4" /> Mentions
          {mentions.some((m) => !m.read_at) && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
              {mentions.filter((m) => !m.read_at).length}
            </span>
          )}
        </h2>
        {mentions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune mention pour l'instant.</p>
        ) : (
          <ul className="space-y-2">
            {mentions.map((m) => {
              const t = parseNotifUrl(m.url);
              const content = (
                <>
                  <span className="font-semibold">{m.message}</span>
                  <span className="ml-2 text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: fr })}
                  </span>
                </>
              );
              return (
                <li key={m.id} className={cn("rounded-md border border-border p-2 text-xs", !m.read_at && "border-primary/50 bg-primary/5")}>
                  {t ? (
                    <Link to={t.to} hash={t.hash} onClick={() => markRead.mutate(m.id)} className="block hover:underline">
                      {content}
                    </Link>
                  ) : (
                    <button onClick={() => markRead.mutate(m.id)} className="block w-full text-left">{content}</button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Button variant="outline" className="w-full" onClick={signOut}>
        <LogOut className="size-4" /> Déconnexion
      </Button>

      <section className="card-brut border-destructive/40 p-4">
        <h2 className="mb-2 text-sm font-black uppercase tracking-widest text-destructive">
          Zone dangereuse
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Supprimer ton compte efface définitivement ton profil, tes commentaires,
          tes likes, tes notes et tes notifications. Cette action est irréversible.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="size-4" /> Supprimer mon compte
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Suppression définitive du compte</AlertDialogTitle>
              <AlertDialogDescription>
                Toutes tes données seront supprimées et ne pourront pas être récupérées.
                Tape <strong>SUPPRIMER</strong> ci-dessous pour confirmer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="SUPPRIMER"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmText("")}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                disabled={confirmText !== "SUPPRIMER" || deleting}
                onClick={async (e) => {
                  e.preventDefault();
                  setDeleting(true);
                  try {
                    await deleteFn();
                    toast.success("Compte supprimé.");
                    await signOut();
                    window.location.href = "/";
                  } catch (err: any) {
                    toast.error(err?.message ?? "Erreur lors de la suppression.");
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? "Suppression…" : "Supprimer définitivement"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}