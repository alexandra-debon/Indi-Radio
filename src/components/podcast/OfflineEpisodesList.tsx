import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { listOffline, removeOffline, type OfflineMeta } from "@/lib/offline-audio";
import { Trash2 } from "lucide-react";

const TXT = {
  fr: { title: "Mes épisodes hors ligne", total: "Espace occupé", until: "Expire le", remove: "Retirer" },
  en: { title: "My offline episodes", total: "Storage used", until: "Expires on", remove: "Remove" },
} as const;

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} Mo`;

export function OfflineEpisodesList() {
  const { lang } = useLang();
  const t = TXT[lang === "en" ? "en" : "fr"];
  const [items, setItems] = useState<OfflineMeta[]>([]);
  useEffect(() => {
    const load = () => listOffline().then(setItems).catch(() => setItems([]));
    load();
    window.addEventListener("indi-offline-changed", load);
    return () => window.removeEventListener("indi-offline-changed", load);
  }, []);
  if (!items.length) return null;
  const total = items.reduce((s, i) => s + i.size, 0);
  const unit = (s: string) => (lang === "en" ? s.replace("Mo", "MB") : s);
  return (
    <section className="card-brut space-y-2 p-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-primary">{t.title}</h2>
      <p className="text-xs text-muted-foreground">{t.total} : {unit(mb(total))}</p>
      <ul className="divide-y">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-2 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{i.title}</p>
              <p className="text-xs text-muted-foreground">{unit(mb(i.size))} · {t.until} {new Date(i.expiresAt).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR")}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={async () => { await removeOffline(i.id); window.dispatchEvent(new Event("indi-offline-changed")); }}>
              <Trash2 /> {t.remove}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
