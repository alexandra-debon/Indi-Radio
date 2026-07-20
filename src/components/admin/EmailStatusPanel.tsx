import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { sendTestEmail, listRecentEmailEvents } from "@/lib/email-diagnostics.functions";
import { checkEmailDns } from "@/lib/dns-check.functions";
import { CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { Download, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SENDER = "notify.radio.indi-art-culture.com";
const ROOT = "radio.indi-art-culture.com";

const DNS_RECORDS: Array<{ type: string; host: string; value: string }> = [
  { type: "TXT", host: `_lovable-email.${ROOT}`, value: "lovable_email_verify=… (voir Cloud → Emails)" },
  { type: "NS", host: SENDER, value: "ns5.lovable.cloud" },
  { type: "NS", host: SENDER, value: "ns6.lovable.cloud" },
];

export function EmailStatusPanel() {
  const [to, setTo] = useState("");
  const [lastResult, setLastResult] = useState<any>(null);

  const runTest = useServerFn(sendTestEmail);
  const fetchEvents = useServerFn(listRecentEmailEvents);
  const runDnsCheck = useServerFn(checkEmailDns);

  const subsQuery = useQuery({
    queryKey: ["admin-newsletter-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("email, subscribed_at, source, gdpr_consent_at")
        .order("subscribed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchOnWindowFocus: false,
  });

  const exportSubscribersCsv = () => {
    const rows = subsQuery.data ?? [];
    if (rows.length === 0) {
      toast.error("Aucun abonné à exporter");
      return;
    }
    const escape = (v: string | null | undefined) =>
      v == null ? "" : `"${String(v).replace(/"/g, '""')}"`;
    const csv = [
      "email,subscribed_at,source,consent_rgpd",
      ...rows.map((r: any) =>
        [
          escape(r.email),
          escape(r.subscribed_at ?? ""),
          escape(r.source ?? ""),
          escape(r.gdpr_consent_at ?? ""),
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `newsletter-subscribers-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} abonné(s) exporté(s)`);
  };

  const dnsQuery = useQuery({
    queryKey: ["admin-email-dns"],
    queryFn: () => runDnsCheck(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const eventsQuery = useQuery({
    queryKey: ["admin-email-events"],
    queryFn: () => fetchEvents(),
    refetchOnWindowFocus: false,
  });

  const testMut = useMutation({
    mutationFn: (email: string) => runTest({ data: { to: email } }),
    onSuccess: (res) => {
      setLastResult(res);
      if (res.ok) toast.success("Test envoyé ✓ Vérifiez la boîte de réception.");
      else toast.error(`Échec : ${res.code}`);
      eventsQuery.refetch();
    },
    onError: (e: any) => {
      setLastResult({ ok: false, code: "client_error", message: e?.message });
      toast.error(e?.message || "Erreur lors de l'envoi");
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📧 Statut du domaine d'envoi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="font-medium">Sous-domaine :</span>{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded">{SENDER}</code>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">État propagation DNS :</span>{" "}
            {dnsQuery.isLoading || dnsQuery.isFetching ? (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Vérification…
              </Badge>
            ) : dnsQuery.data?.allOk ? (
              <Badge className="bg-green-600 hover:bg-green-600 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Vérifié
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" /> En attente
              </Badge>
            )}
            <Button size="sm" variant="ghost" onClick={() => dnsQuery.refetch()} className="h-6 px-2">
              <RefreshCw className="h-3 w-3 mr-1" /> Revérifier
            </Button>
            {dnsQuery.data?.checkedAt && (
              <span className="text-xs text-muted-foreground">
                MAJ {new Date(dnsQuery.data.checkedAt).toLocaleTimeString("fr-FR")}
              </span>
            )}
          </div>
          {dnsQuery.data && (
            <div className="rounded border p-2 space-y-1 text-xs">
              <div className="flex items-center gap-2">
                {dnsQuery.data.ns.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">NS {dnsQuery.data.sender}</span>
                <span className="text-muted-foreground">
                  attendu : {dnsQuery.data.ns.expected.join(", ")}
                </span>
              </div>
              <div className="pl-6 text-muted-foreground">
                trouvé : {dnsQuery.data.ns.found.length ? dnsQuery.data.ns.found.join(", ") : "aucun"}
              </div>
              <div className="flex items-center gap-2 pt-1">
                {dnsQuery.data.txt.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">TXT {dnsQuery.data.txt.host}</span>
              </div>
              <div className="pl-6 text-muted-foreground break-all">
                trouvé : {dnsQuery.data.txt.found.length ? dnsQuery.data.txt.found.join(" | ") : "aucun"}
              </div>
            </div>
          )}
          <div className="pt-2">
            <p className="font-medium mb-2">Enregistrements DNS attendus (chez votre registrar) :</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Hôte</th>
                    <th className="text-left p-2">Valeur</th>
                  </tr>
                </thead>
                <tbody>
                  {DNS_RECORDS.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2"><Badge>{r.type}</Badge></td>
                      <td className="p-2 font-mono">{r.host}</td>
                      <td className="p-2 font-mono break-all">{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              La valeur exacte du TXT est visible dans <strong>Cloud → Emails</strong>.
              La propagation DNS peut prendre jusqu'à 72h.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🧪 Test d'envoi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="votre@email.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <Button
              onClick={() => testMut.mutate(to)}
              disabled={!to || testMut.isPending}
            >
              {testMut.isPending ? "Envoi…" : "Envoyer un test"}
            </Button>
          </div>
          {lastResult && (
            <div
              className={`rounded-md border p-3 text-sm ${
                lastResult.ok
                  ? "bg-green-50 border-green-300 text-green-900 dark:bg-green-950 dark:text-green-100"
                  : "bg-red-50 border-red-300 text-red-900 dark:bg-red-950 dark:text-red-100"
              }`}
            >
              {lastResult.ok ? (
                <p>✅ Email envoyé avec succès. Vérifiez la boîte (et les spams).</p>
              ) : (
                <div className="space-y-1">
                  <p>❌ <strong>Échec :</strong> {lastResult.code}</p>
                  {lastResult.message && <p className="text-xs opacity-80">{lastResult.message}</p>}
                  {lastResult.code === "domain_not_verified" && (
                    <p className="text-xs">→ La configuration DNS n'est pas encore validée. Vérifiez les enregistrements NS/TXT chez votre registrar.</p>
                  )}
                  {lastResult.code === "emails_disabled" && (
                    <p className="text-xs">→ L'envoi d'emails est désactivé pour ce projet.</p>
                  )}
                  {lastResult.status === 429 && (
                    <p className="text-xs">→ Trop d'envois. Réessayez dans {lastResult.retryAfterSeconds ?? 60}s.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>📬 Événements récents</span>
            <Button size="sm" variant="outline" onClick={() => eventsQuery.refetch()}>
              Rafraîchir
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : !eventsQuery.data?.supported ? (
            <p className="text-sm text-muted-foreground">
              Historique non disponible ici. Consultez <strong>Cloud → Emails</strong> pour l'historique complet.
            </p>
          ) : eventsQuery.data.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun événement récent.</p>
          ) : (
            <ul className="divide-y text-sm">
              {eventsQuery.data.events.map((ev: any, i: number) => (
                <li key={i} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-xs">{ev.recipient || ev.to || "—"}</span>
                    {ev.label && <span className="ml-2 text-xs text-muted-foreground">({ev.label})</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline">{ev.type || ev.event || "?"}</Badge>
                    {ev.status && <span className="text-muted-foreground">{ev.status}</span>}
                    {ev.created_at && (
                      <span className="text-muted-foreground">
                        {new Date(ev.created_at).toLocaleString("fr-FR")}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Abonnés newsletter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            {subsQuery.isLoading
              ? "Chargement…"
              : `${subsQuery.data?.length ?? 0} abonné(s) inscrit(s).`}
          </p>
          <div className="flex gap-2">
            <Button
              onClick={exportSubscribersCsv}
              disabled={subsQuery.isLoading || (subsQuery.data?.length ?? 0) === 0}
            >
              <Download className="h-4 w-4 mr-2" /> Exporter en CSV
            </Button>
            <Button variant="outline" onClick={() => subsQuery.refetch()}>
              Rafraîchir
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Le fichier CSV contient l'email et la date d'inscription. Compatible Excel / Google Sheets.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}