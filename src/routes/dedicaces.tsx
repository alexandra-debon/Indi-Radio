import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";

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
    else { toast.success("Envoyé ! +1 pt"); setTrack(""); setMsg(""); }
  }

  return (
    <div className="space-y-4">
      <h1 className="section-title">Musique à la demande & dédicaces</h1>
      <form onSubmit={submit} className="card-brut space-y-3 p-4">
        <Input placeholder="Morceau demandé (artiste – titre)" value={track} onChange={(e) => setTrack(e.target.value)} />
        <Textarea placeholder="Ton message / ta dédicace…" rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} />
        <Button className="w-full" disabled={loading || (!track && !msg)}>
          Envoyer
        </Button>
      </form>
      {!session && (
        <p className="text-center text-xs text-muted-foreground">
          Il faut être connecté pour envoyer une dédicace.
        </p>
      )}
    </div>
  );
}