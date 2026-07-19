import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runDeployCheck, type DeployCheckResult } from "@/lib/deploy-check.functions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Rocket, RefreshCw } from "lucide-react";
import { toast } from "@/lib/toast";

type Report = {
  baseUrl: string;
  checkedAt: string;
  ok: boolean;
  failed: number;
  total: number;
  results: DeployCheckResult[];
};

export function DeployCheckPanel() {
  const runCheck = useServerFn(runDeployCheck);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  async function doCheck() {
    setLoading(true);
    try {
      const r = (await runCheck()) as Report;
      setReport(r);
      if (r.ok) toast.success(`Déploiement OK — ${r.total}/${r.total}`);
      else toast.error(`${r.failed} vérification(s) en échec`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de la vérification");
    } finally {
      setLoading(false);
    }
  }

  function publishAndVerify() {
    // Trigger the Lovable publish flow via URL scheme used by the editor overlay.
    // Falls back to a manual instruction if the parent editor is not present.
    try {
      window.parent?.postMessage({ type: "lovable:publish" }, "*");
    } catch {
      // ignore — the check will still run after countdown
    }
    toast.info("Publication déclenchée — vérification dans 60s");
    let s = 60;
    setCountdown(s);
    const iv = setInterval(() => {
      s -= 1;
      setCountdown(s);
      if (s <= 0) {
        clearInterval(iv);
        setCountdown(null);
        void doCheck();
      }
    }, 1000);
  }

  return (
    <div className="card-brut space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Vérification déploiement</h2>
          <p className="text-xs text-muted-foreground">
            Teste le SSR et les endpoints publics sur <span className="font-mono">radio.indi-art-culture.com</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={publishAndVerify}
            disabled={loading || countdown !== null}
            className="gap-2"
          >
            <Rocket className="size-4" />
            {countdown !== null ? `Vérif dans ${countdown}s` : "Publier et vérifier"}
          </Button>
          <Button variant="outline" onClick={doCheck} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Vérifier maintenant
          </Button>
        </div>
      </div>

      {countdown !== null && (
        <p className="text-xs text-muted-foreground">
          Clique sur <strong>Publier</strong> (en haut à droite de l'éditeur) si la fenêtre ne s'est pas ouverte.
          La vérification se lance automatiquement.
        </p>
      )}

      {report && (
        <div className="space-y-2">
          <div
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${
              report.ok
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            {report.ok ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
            {report.ok
              ? `Tout est vert — ${report.total}/${report.total} endpoints OK`
              : `${report.failed} échec(s) sur ${report.total}`}
            <span className="ml-auto text-xs font-normal opacity-70">
              {new Date(report.checkedAt).toLocaleTimeString()}
            </span>
          </div>
          <ul className="space-y-1">
            {report.results.map((r) => (
              <li
                key={r.path}
                className={`flex flex-col gap-1 rounded-md border px-3 py-2 text-sm ${
                  r.ok
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-destructive/30 bg-destructive/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  {r.ok ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <XCircle className="size-4 text-destructive" />
                  )}
                  <span className="font-medium">{r.label}</span>
                  <span className="text-xs text-muted-foreground">{r.path}</span>
                  <span className="ml-auto font-mono text-xs">
                    {r.status || "—"} · {r.ms}ms
                  </span>
                </div>
                {!r.ok && (
                  <ul className="ml-6 list-disc text-xs text-destructive">
                    {r.problems.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}