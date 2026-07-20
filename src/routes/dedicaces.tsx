import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/dedicaces")({
  head: () => ({
    meta: [
      { title: "Dédicaces & demandes — Indi Radio" },
      { name: "description", content: "Envoie ta demande musicale et ta dédicace en direct sur Indi Radio." },
      { property: "og:title", content: "Dédicaces — Indi Radio" },
      { property: "og:description", content: "Musique à la demande et dédicaces sur Indi Radio." },
    ],
  }),
  component: DedicacesPage,
});

function DedicacesPage() {
  const t = useT();
  const { session, openAuth } = useAuth();
  const [track, setTrack] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return openAuth();
    setLoading(true);
    const { error } = await supabase.from("requests").insert({
      author_id: session.user.id,
      track_requested: track || null,
      dedication_message: msg || null,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success(t("page.dedications.sent")); setTrack(""); setMsg(""); }
  }

  return (
    <div className="space-y-4">
      <h1 className="section-title">{t("page.dedications.title")}</h1>
      <form onSubmit={submit} className="card-brut space-y-3 p-4">
        <Input placeholder={t("page.dedications.trackPh")} value={track} onChange={(e) => setTrack(e.target.value)} />
        <Textarea placeholder={t("page.dedications.msgPh")} rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} />
        <Button className="w-full" disabled={loading || (!track && !msg)}>
          {t("page.dedications.send")}
        </Button>
      </form>
      {!session && (
        <p className="text-center text-xs text-muted-foreground">
          {t("page.dedications.needLogin")}
        </p>
      )}
    </div>
  );
}