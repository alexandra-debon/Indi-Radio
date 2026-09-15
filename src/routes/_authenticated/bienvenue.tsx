import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { submitRoleRequest } from "@/lib/role-request.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Mic2, Headphones, Newspaper, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SocialLinksEditor,
  sanitizeLinks,
  type SocialLinks,
} from "@/components/social/SocialLinksBar";

type RoleChoice = "auditeur" | "artiste" | "media";

export const PENDING_ROLE_KEY = "indi.pendingRole";

export const Route = createFileRoute("/_authenticated/bienvenue")({
  validateSearch: (s: Record<string, unknown>) => ({
    role: (["auditeur", "artiste", "media"].includes(String(s.role)) ? String(s.role) : "") as
      | RoleChoice
      | "",
  }),
  head: () => ({
    meta: [
      { title: "Bienvenue — Indi Radio" },
      { name: "description", content: "Complète ton profil InDi RaDio." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WelcomePage,
});

function WelcomePage() {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const submit = useServerFn(submitRoleRequest);

  const [choice, setChoice] = useState<RoleChoice>("auditeur");
  const [stageName, setStageName] = useState("");
  const [punchline, setPunchline] = useState("");
  const [bio, setBio] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [links, setLinks] = useState<SocialLinks>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const stored =
      typeof window === "undefined" ? null : window.localStorage.getItem(PENDING_ROLE_KEY);
    const initial = (search.role || stored || "auditeur") as RoleChoice;
    if (["auditeur", "artiste", "media"].includes(initial)) setChoice(initial);
  }, [search.role]);

  useEffect(() => {
    if (!profile) return;
    setPunchline((p) => p || (profile as any).punchline || "");
    setBio((b) => b || profile.bio || "");
    setStageName((s) => s || profile.stage_name || "");
    setWebsite((w) => w || profile.website || "");
    setLinks((l) =>
      Object.keys(l).length ? l : ((profile.social_links as SocialLinks) ?? {}),
    );
  }, [profile]);

  const pendingAlready = (profile as any)?.role_request_status === "pending";

  async function saveListener() {
    if (!session) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ punchline: punchline.trim() || null, bio: bio.trim() || null } as any)
      .eq("id", session.user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.localStorage.removeItem(PENDING_ROLE_KEY);
    armStatusTour();
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Profil enregistré, bienvenue sur InDi RaDio !");
    navigate({ to: "/" });
  }

  async function sendApplication() {
    const isMedia = choice === "media";
    if (stageName.trim().length < 2) {
      toast.error(isMedia ? "Indique le nom de ton média." : "Indique ton nom d'artiste.");
      return;
    }
    const clean = sanitizeLinks(links) as SocialLinks;
    const hasSocial = Object.entries(clean).some(
      ([k, v]) => !k.startsWith("__") && typeof v === "string" && v.trim().length > 0,
    );
    if (isMedia && !hasSocial && !website.trim()) {
      toast.error("Renseigne au moins un lien professionnel ou ton site web.");
      return;
    }
    setSaving(true);
    try {
      await submit({
        data: {
          role: isMedia ? "media" : "artiste",
          stageName: stageName.trim(),
          punchline: punchline.trim(),
          note: note.trim(),
          website: website.trim(),
          socialLinks: clean as Record<string, unknown>,
        },
      });
      window.localStorage.removeItem(PENDING_ROLE_KEY);
      armStatusTour();
      qc.invalidateQueries({ queryKey: ["profile"] });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (done || pendingAlready) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-xl border border-primary/40 bg-card p-6 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-10 text-primary" />
          <h1 className="text-2xl font-black">Candidature envoyée</h1>
          <p className="mt-2 text-muted-foreground">
            Notre équipe l'étudie. En attendant, ton compte fonctionne normalement : tu peux
            écouter, poster, liker et commenter. Tu recevras une notification dès la validation.
          </p>
          <Button className="mt-5" onClick={() => navigate({ to: "/" })}>
            Explorer InDi RaDio
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-black">Bienvenue{profile?.pseudo ? `, ${profile.pseudo}` : ""} !</h1>
      <p className="mt-1 text-muted-foreground">Dis-nous qui tu es pour finaliser ton profil.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {(
          [
            { k: "auditeur", label: "Auditeur-Lecteur", icon: Headphones, hint: "Écouter, réagir, commenter" },
            { k: "artiste", label: "Artiste", icon: Mic2, hint: "Diffuser ma musique" },
            { k: "media", label: "Média", icon: Newspaper, hint: "Presse, blog, radio" },
          ] as const
        ).map((o) => (
          <button
            key={o.k}
            type="button"
            onClick={() => setChoice(o.k)}
            className={cn(
              "rounded-xl border p-4 text-left transition",
              choice === o.k ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
            )}
          >
            <o.icon className="mb-2 size-5 text-primary" />
            <div className="font-bold">{o.label}</div>
            <div className="text-xs text-muted-foreground">{o.hint}</div>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4 rounded-xl border border-border bg-card p-5">
        {choice !== "auditeur" && (
          <div>
            <Label htmlFor="stage">{choice === "media" ? "Nom du média" : "Nom de scène"}</Label>
            <Input id="stage" value={stageName} onChange={(e) => setStageName(e.target.value)} maxLength={80} />
          </div>
        )}
        <div>
          <Label htmlFor="punchline">Punchline (courte phrase d'accroche)</Label>
          <Input
            id="punchline"
            value={punchline}
            onChange={(e) => setPunchline(e.target.value)}
            maxLength={160}
            placeholder="Ex : du rock indé fait maison, à Lyon."
          />
        </div>

        {choice === "auditeur" ? (
          <>
            <div>
              <Label htmlFor="bio">Bio (facultatif)</Label>
              <Textarea id="bio" rows={5} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={saveListener} disabled={saving}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Enregistrer
              </Button>
              <Button variant="ghost" onClick={() => navigate({ to: "/" })}>
                Plus tard
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="note">Ta présentation / ton pitch</Label>
              <Textarea
                id="note"
                rows={6}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={2000}
                placeholder="Parle-nous de ton projet, de ton actualité, de ce que tu aimerais partager sur InDi RaDio…"
              />
              <p className="mt-1 text-xs text-muted-foreground">{note.length}/2000 — 30 caractères minimum.</p>
            </div>
            <div>
              <Label>Liens réseaux sociaux</Label>
              <SocialLinksEditor value={links} onChange={setLinks} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={sendApplication} disabled={saving}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Envoyer ma candidature
              </Button>
              <Button variant="ghost" onClick={() => navigate({ to: "/" })}>
                Plus tard
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ton compte reste actif en tant qu'auditeur pendant l'examen de ta candidature.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
