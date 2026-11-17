import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useLang } from "@/lib/i18n";
import { chapterIndexAt, type PodcastEpisode } from "@/lib/jovanna-podcast";
import { getOffline, openOfflineUrl, removeOffline, renewOffline, saveOffline, type OfflineMeta } from "@/lib/offline-audio";
import { Pause, Play, RotateCcw, RotateCw, WifiOff, Trash2, RefreshCw, Loader2 } from "lucide-react";

const TXT = {
  fr: {
    play: "Lecture", pause: "Pause", back: "Reculer de 15 secondes", fwd: "Avancer de 15 secondes", speed: "Vitesse",
    offline: "Écouter hors ligne", saving: "Préparation hors ligne…", cancel: "Annuler", ready: "Disponible hors ligne",
    until: "jusqu’au", renew: "Prolonger 30 jours", remove: "Retirer", playingOffline: "Lecture hors ligne protégée",
    error: "La préparation hors ligne a échoué. Vérifiez votre connexion et l’espace disponible.",
    needOnline: "Connexion requise pour prolonger.", progress: "Progression", chapters: "Chapitres", opening: "Ouverture", goTo: "Aller au chapitre",
    notice: "Écoute hors ligne disponible dans l'application InDi(E) HuB. Les épisodes restent protégés dans l'application : aucun fichier audio n'est enregistré sur votre appareil. Toute copie ou rediffusion des titres musicaux est interdite. Soutenez les artistes : achetez leurs disques chez les disquaires indépendants.",
  },
  en: {
    play: "Play", pause: "Pause", back: "Back 15 seconds", fwd: "Forward 15 seconds", speed: "Speed",
    offline: "Listen offline", saving: "Preparing offline…", cancel: "Cancel", ready: "Available offline",
    until: "until", renew: "Extend 30 days", remove: "Remove", playingOffline: "Protected offline playback",
    error: "Offline preparation failed. Check your connection and available storage.",
    needOnline: "Connection required to extend.", progress: "Progress", chapters: "Chapters", opening: "Opening", goTo: "Go to chapter",
    notice: "Offline listening available in the InDi(E) HuB app. Episodes stay protected inside the app: no audio file is saved to your device. Copying or redistributing the music is prohibited. Support the artists: buy their records from independent record shops.",
  },
} as const;

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function fmtTime(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

export function InAppPodcastPlayer({ episode, showChapters = false }: { episode: PodcastEpisode; showChapters?: boolean }) {
  const { lang } = useLang();
  const t = TXT[lang === "en" ? "en" : "fr"];
  const audio = useRef<HTMLAudioElement>(null);
  const blobUrl = useRef<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(episode.durationSeconds);
  const [speed, setSpeed] = useState(1);
  const [offline, setOffline] = useState<OfflineMeta | undefined>();
  const [saving, setSaving] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [usingOffline, setUsingOffline] = useState(false);

  const revoke = useCallback(() => {
    if (blobUrl.current) { URL.revokeObjectURL(blobUrl.current); blobUrl.current = null; }
    setUsingOffline(false);
  }, []);

  useEffect(() => {
    getOffline(episode.slug).then(setOffline).catch(() => {});
    const onChange = () => getOffline(episode.slug).then(setOffline).catch(() => {});
    window.addEventListener("indi-offline-changed", onChange);
    return () => { window.removeEventListener("indi-offline-changed", onChange); abort.current?.abort(); revoke(); };
  }, [episode.slug, revoke]);

  const toggle = async () => {
    const a = audio.current;
    if (!a) return;
    if (!a.paused) { a.pause(); return; }
    if (!a.src) {
      if (offline) {
        try { blobUrl.current = await openOfflineUrl(episode.slug); a.src = blobUrl.current; setUsingOffline(true); }
        catch { a.src = episode.audioUrl; }
      } else a.src = episode.audioUrl;
      a.playbackRate = speed;
    }
    await a.play().catch(() => {});
  };

  const stop = () => {
    const a = audio.current;
    if (a && blobUrl.current) { a.removeAttribute("src"); a.load(); revoke(); }
  };

  const chapters = showChapters ? episode.chapters ?? [] : [];
  const current = chapterIndexAt(chapters, time);
  const jump = async (start: number) => {
    const a = audio.current;
    if (!a) return;
    if (!a.src) await toggle();
    setTime(start);
    if (a.readyState >= 1) a.currentTime = start;
    else a.addEventListener("loadedmetadata", () => { a.currentTime = start; }, { once: true });
    if (a.paused) await a.play().catch(() => {});
  };
  const chapterTitle = (c: { title: string }) => (c.title === "Ouverture" ? t.opening : c.title);

  const seek = (d: number) => { const a = audio.current; if (a && a.src) a.currentTime = Math.max(0, Math.min(duration, a.currentTime + d)); };
  const changeSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next); if (audio.current) audio.current.playbackRate = next;
  };

  const notify = () => window.dispatchEvent(new Event("indi-offline-changed"));

  const startSave = async () => {
    setMsg(null); setSaving(0);
    abort.current = new AbortController();
    try {
      const m = await saveOffline(
        { id: episode.slug, title: `${episode.title} · ${episode.host} #${episode.episode}`, url: episode.audioUrl, mime: episode.audioType },
        (d, tot) => setSaving(tot ? Math.round((d / tot) * 100) : 0),
        abort.current.signal,
      );
      setOffline(m); notify();
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMsg(t.error);
    } finally { setSaving(null); abort.current = null; }
  };

  const renew = async () => {
    setMsg(null);
    if (!navigator.onLine) { setMsg(t.needOnline); return; }
    try { await renewOffline(episode.slug, episode.audioUrl); notify(); } catch { setMsg(t.needOnline); }
  };

  const remove = async () => { stop(); await removeOffline(episode.slug); setOffline(undefined); notify(); };

  const locale = lang === "en" ? "en-GB" : "fr-FR";

  return (
    <div className="card-brut select-none space-y-3 p-4" onContextMenu={(e) => e.preventDefault()}>
      <audio
        ref={audio}
        preload="none"
        controlsList="nodownload noplaybackrate"
        onContextMenu={(e) => e.preventDefault()}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); stop(); }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        className="hidden"
      />
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" onClick={() => seek(-15)} aria-label={t.back}><RotateCcw /></Button>
        <Button size="icon" onClick={toggle} aria-label={playing ? t.pause : t.play}>{playing ? <Pause /> : <Play />}</Button>
        <Button size="icon" variant="outline" onClick={() => seek(15)} aria-label={t.fwd}><RotateCw /></Button>
        <Button variant="outline" size="sm" onClick={changeSpeed} aria-label={t.speed}>{speed}×</Button>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{fmtTime(time)} / {fmtTime(duration)}</span>
      </div>
      <div className="relative">
        <Slider aria-label={t.progress} value={[time]} max={duration || 1} step={1}
          onValueChange={([v]) => { const a = audio.current; if (a && a.src) a.currentTime = v; setTime(v); }} />
        {chapters.slice(1).map((c) => (
          <span key={c.start} aria-hidden className="pointer-events-none absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-foreground/60"
            style={{ left: `${(c.start / (duration || 1)) * 100}%` }} />
        ))}
      </div>
      {current >= 0 && (
        <p className="truncate text-xs font-semibold">
          <span className="text-primary">{current + 1}/{chapters.length}</span> · {chapterTitle(chapters[current])}
          {chapters[current].artist && <span className="font-normal text-muted-foreground"> — {chapters[current].artist}</span>}
        </p>
      )}
      {chapters.length > 0 && (
        <div className="border-t pt-3">
          <p className="mb-2 text-xs font-bold uppercase">{t.chapters}</p>
          <ol className="space-y-0.5">
            {chapters.map((c, i) => {
              const end = chapters[i + 1]?.start ?? duration;
              const pct = i === current ? Math.min(100, ((time - c.start) / Math.max(1, end - c.start)) * 100) : i < current ? 100 : 0;
              return (
                <li key={c.start}>
                  <button type="button" onClick={() => jump(c.start)} aria-label={`${t.goTo} ${i + 1} : ${chapterTitle(c)}`}
                    aria-current={i === current ? "true" : undefined}
                    className={`relative w-full overflow-hidden rounded px-2 py-1.5 text-left text-sm hover:bg-muted ${i === current ? "bg-muted font-semibold" : ""}`}>
                    <span className="flex items-baseline gap-2">
                      <span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground">{fmtTime(c.start)}</span>
                      <span className="min-w-0 flex-1 truncate">{chapterTitle(c)}{c.artist && <span className="font-normal text-muted-foreground"> — {c.artist}</span>}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fmtTime(end - c.start)}</span>
                    </span>
                    <span aria-hidden className="absolute bottom-0 left-0 h-0.5 bg-primary" style={{ width: `${pct}%` }} />
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {usingOffline && <p className="flex items-center gap-1 text-xs text-primary"><WifiOff className="h-3 w-3" /> {t.playingOffline}</p>}

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        {saving !== null ? (
          <div className="flex w-full items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">{t.saving} {saving} %</span>
            <Progress value={saving} className="h-2 flex-1" />
            <Button size="sm" variant="ghost" onClick={() => abort.current?.abort()}>{t.cancel}</Button>
          </div>
        ) : offline ? (
          <>
            <span className="text-xs font-semibold text-primary">
              {t.ready} {t.until} {new Date(offline.expiresAt).toLocaleDateString(locale)}
            </span>
            <Button size="sm" variant="outline" onClick={renew}><RefreshCw /> {t.renew}</Button>
            <Button size="sm" variant="ghost" onClick={remove}><Trash2 /> {t.remove}</Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={startSave}><WifiOff /> {t.offline}</Button>
        )}
        {msg && <p className="w-full text-xs text-destructive">{msg}</p>}
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">{t.notice}</p>
    </div>
  );
}
