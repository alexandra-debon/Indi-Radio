import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { UserBadge } from "@/components/UserBadge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, AtSign, Trash2, Pencil, Trophy, Eye, UserCircle2, Loader2, Compass, Heart, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { parseNotifUrl } from "@/lib/notif-navigate";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { deleteMyAccount } from "@/lib/account.functions";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { openOnboardingTour } from "@/components/onboarding/OnboardingTour";
import { useLang } from "@/lib/i18n";
import { enUS } from "date-fns/locale";
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
  const { lang, t } = useLang();
  const qc = useQueryClient();
  const deleteFn = useServerFn(deleteMyAccount);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [editingPseudo, setEditingPseudo] = useState(false);
  const [pseudoDraft, setPseudoDraft] = useState("");
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

  const saveBio = useMutation({
    mutationFn: async (newBio: string) => {
      const trimmed = newBio.trim();
      if (trimmed.length > 500) throw new Error(lang === "fr" ? "500 caractères max" : "500 characters max");
      const { error } = await supabase
        .from("profiles")
        .update({ bio: trimmed || null } as any)
        .eq("id", session!.user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile", session?.user.id] });
      toast.success(lang === "fr" ? "Bio enregistrée" : "Bio saved");
      setEditingBio(false);
    },
    onError: (err: any) => {
      toast.error(err?.message ?? (lang === "fr" ? "Erreur lors de la sauvegarde" : "Save failed"));
    },
  });

  const PSEUDO_RE = /^[\p{L}\p{N} _.\-]+$/u;
  const savePseudo = useMutation({
    mutationFn: async (newPseudo: string) => {
      const clean = newPseudo.trim();
      if (clean.length < 3 || clean.length > 30) {
        throw new Error(lang === "fr" ? "Pseudo : 3 à 30 caractères" : "Pseudo: 3 to 30 characters");
      }
      if (!PSEUDO_RE.test(clean)) {
        throw new Error(lang === "fr" ? "Lettres, chiffres, espaces, _ . - uniquement" : "Letters, digits, spaces, _ . - only");
      }
      if (clean.toLowerCase() !== (profile!.pseudo ?? "").toLowerCase()) {
        const { data: exists } = await supabase
          .from("profiles")
          .select("id")
          .ilike("pseudo", clean)
          .neq("id", session!.user.id)
          .maybeSingle();
        if (exists) throw new Error(lang === "fr" ? "Ce pseudo est déjà pris" : "This pseudo is already taken");
      }
      const { error } = await supabase
        .from("profiles")
        .update({ pseudo: clean } as any)
        .eq("id", session!.user.id);
      if (error) {
        const msg = error.message?.toLowerCase().includes("duplicate")
          ? (lang === "fr" ? "Ce pseudo est déjà pris" : "This pseudo is already taken")
          : error.message;
        throw new Error(msg);
      }
      return clean;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["profile", session?.user.id] }),
        qc.invalidateQueries(),
      ]);
      toast.success(lang === "fr" ? "Pseudo mis à jour" : "Pseudo updated");
      setEditingPseudo(false);
    },
    onError: (err: any) => toast.error(err?.message ?? "Erreur"),
  });

  if (!profile) return <div className="p-4">{t("profile.loading")}</div>;

  const nextThreshold = LEVEL_THRESHOLDS[profile.level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const prev = LEVEL_THRESHOLDS[profile.level - 1] ?? 0;
  const progress = profile.level >= 5 ? 100 : Math.min(100, ((profile.points - prev) / (nextThreshold - prev)) * 100);
  const dateLocale = lang === "fr" ? fr : enUS;
  const deleteKeyword = t("profile.deleteKeyword");

  return (
    <div className="space-y-4">
      <h1 className="section-title">{t("profile.title")}</h1>
      <div className="card-brut space-y-3 p-4">
        <UserBadge profile={profile} className="text-base" />
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">{t("profile.level")} {profile.level}</span>
            <span className="text-sm font-bold">{profile.points} {t("profile.pts")}</span>
          </div>
          <Progress value={progress} className="mt-1" />
          {profile.level < 5 && (
            <div className="mt-1 text-[10px] text-muted-foreground">
              {t("profile.nextTier")} : {nextThreshold} {t("profile.pts")}
            </div>
          )}
        </div>
        <Link
          to="/profile/edit"
          className="mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-border bg-background px-3 py-2 text-xs font-black uppercase tracking-widest hover:bg-muted"
        >
          <Pencil className="size-4" /> {t("profile.edit")}
        </Link>
        {profile.pseudo && (
          <Link
            to="/u/$pseudo"
            params={{ pseudo: profile.pseudo }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-border bg-background px-3 py-2 text-xs font-black uppercase tracking-widest hover:bg-muted"
          >
            <Eye className="size-4" /> {t("profile.viewPublic")}
          </Link>
        )}
        <Link
          to="/profile/badges"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-border bg-primary px-3 py-2 text-xs font-black uppercase tracking-widest text-primary-foreground hover:opacity-90"
        >
          <Trophy className="size-4" /> {t("profile.badges")}
        </Link>
        <Link
          to="/profile/albums"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-border bg-background px-3 py-2 text-xs font-black uppercase tracking-widest hover:bg-muted"
        >
          <Pencil className="size-4" /> {t("profile.albums")}
        </Link>
        <Link
          to="/profile/likes"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-border bg-background px-3 py-2 text-xs font-black uppercase tracking-widest hover:bg-muted"
        >
          <Heart className="size-4" /> Mes likes
        </Link>
      </div>

      <section className="card-brut p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-widest">
          <UserCircle2 className="size-4" /> {t("profile.presentation")}
        </h2>
        {editingBio ? (
          <div className="space-y-2">
            <Textarea
              value={bioDraft}
              onChange={(e) => setBioDraft(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder={t("profile.bioPlaceholder")}
              disabled={saveBio.isPending}
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{bioDraft.length}/500</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={saveBio.isPending}
                onClick={() => saveBio.mutate(bioDraft)}
                className="flex-1"
              >
                {saveBio.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("profile.save")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={saveBio.isPending}
                onClick={() => {
                  setEditingBio(false);
                  setBioDraft(profile.bio ?? "");
                }}
              >
                {t("profile.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {profile.bio ? (
              <TranslatedText
                as="p"
                className="whitespace-pre-wrap text-sm text-foreground"
                entityType="profile"
                entityKey={profile.id}
                field="bio"
                text={profile.bio}
                manual={false}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("profile.bioEmpty")}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3 inline-flex items-center gap-2"
              onClick={() => {
                setBioDraft(profile.bio ?? "");
                setEditingBio(true);
              }}
            >
              <Pencil className="size-3.5" /> {profile.bio ? t("profile.editBio") : t("profile.writeBio")}
            </Button>
          </>
        )}
      </section>

      {isAdmin && (
        <Link to="/admin" className="card-brut block p-3 text-center text-sm font-semibold text-destructive">
          {t("profile.adminPanel")}
        </Link>
      )}

      <section className="card-brut p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest">
          <AtSign className="size-4" /> {t("profile.mentions")}
          {mentions.some((m) => !m.read_at) && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
              {mentions.filter((m) => !m.read_at).length}
            </span>
          )}
        </h2>
        {mentions.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("profile.mentionsEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {mentions.map((m) => {
              const nt = parseNotifUrl(m.url);
              const content = (
                <>
                  <span className="font-semibold">{m.message}</span>
                  <span className="ml-2 text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: dateLocale })}
                  </span>
                </>
              );
              return (
                <li key={m.id} className={cn("rounded-md border border-border p-2 text-xs", !m.read_at && "border-primary/50 bg-primary/5")}>
                  {nt ? (
                    <Link to={nt.to} hash={nt.hash} onClick={() => markRead.mutate(m.id)} className="block hover:underline">
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

      <div className="space-y-2">
        <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          <Compass className="mr-1 inline size-3.5" /> {t("profile.replayTour")}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => openOnboardingTour("fr")}>
            {t("profile.replayFr")}
          </Button>
          <Button variant="outline" onClick={() => openOnboardingTour("en")}>
            {t("profile.replayEn")}
          </Button>
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={signOut}>
        <LogOut className="size-4" /> {t("action.logout")}
      </Button>

      <section className="card-brut border-destructive/40 p-4">
        <h2 className="mb-2 text-sm font-black uppercase tracking-widest text-destructive">
          {t("profile.dangerZone")}
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          {t("profile.deleteDesc")}
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="size-4" /> {t("profile.deleteAccount")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("profile.deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("profile.deleteConfirm")} <strong>{deleteKeyword}</strong> {t("profile.deleteConfirm2")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={deleteKeyword}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmText("")}>{t("profile.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                disabled={confirmText !== deleteKeyword || deleting}
                onClick={async (e) => {
                  e.preventDefault();
                  setDeleting(true);
                  try {
                    await deleteFn();
                    toast.success(lang === "fr" ? "Compte supprimé." : "Account deleted.");
                    await signOut();
                    window.location.href = "/";
                  } catch (err: any) {
                    toast.error(err?.message ?? (lang === "fr" ? "Erreur lors de la suppression." : "Deletion failed."));
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? t("profile.deleting") : t("profile.deleteForever")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}