import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Pause, Unlock, Radio as RadioIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRadio } from "@/components/radio/RadioPlayerProvider";
import { SolarOrb } from "@/components/radio/SolarOrb";
import { VolumeControl } from "@/components/radio/VolumeControl";
import { useArtwork } from "@/hooks/use-artwork";
import { useT } from "@/lib/i18n";
import indiRadioLogoAsset from "@/assets/indi-radio-logo.png.asset.json";

const indiRadioLogo = indiRadioLogoAsset.url;

export const Route = createFileRoute("/radio-mode")({
  head: () => ({
    meta: [
      { title: "Radio Mode — InDi RaDio, écran radio plein écran" },
      {
        name: "description",
        content:
          "Écran radio verrouillé d'InDi RaDio : pochette, artiste en cours, éruptions solaires réactives au son et derniers titres joués.",
      },
      { property: "og:title", content: "Radio Mode — InDi RaDio" },
      {
        property: "og:description",
        content: "L'écran radio plein écran d'InDi RaDio : musique indé, sans pub ni info.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RadioModePage,
});

interface TrackRow {
  id: string;
  title: string;
  artist: string;
  played_at: string;
}

function RadioModePage() {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { playing, loading, toggle, currentTrack } = useRadio();
  const { data: artwork } = useArtwork(currentTrack?.artist, currentTrack?.title);
  const [imgError, setImgError] = useState(false);
  useEffect(() => setImgError(false), [artwork]);

  // Sortie clavier (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigate({ to: "/" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  // Garde l'écran allumé pendant la lecture, si le navigateur le permet.
  useEffect(() => {
    if (!playing || typeof navigator === "undefined") return;
    let sentinel: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    const wl = (navigator as unknown as {
      wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
    }).wakeLock;
    if (!wl) return;
    wl.request("screen")
      .then((s) => {
        if (cancelled) void s.release();
        else sentinel = s;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      void sentinel?.release().catch(() => {});
    };
  }, [playing]);

  const { data: history = [] } = useQuery<TrackRow[]>({
    queryKey: ["radio-mode-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("track_history")
        .select("id,title,artist,played_at")
        .order("played_at", { ascending: false })
        .limit(12);
      const rows = (data ?? []) as TrackRow[];
      const deduped = rows.filter((r, i) => {
        const prev = rows[i - 1];
        return !prev || prev.title !== r.title || prev.artist !== r.artist;
      });
      // On saute le morceau en cours : on veut les trois précédents.
      return deduped.slice(1, 4);
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("radio-mode-history")
      .on("postgres_changes", { event: "*", schema: "public", table: "track_history" }, () => {
        queryClient.invalidateQueries({ queryKey: ["radio-mode-history"] });
        queryClient.invalidateQueries({ queryKey: ["current-track"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [queryClient]);

  const showImg = artwork && !imgError;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-black text-neutral-200">
      {/* Nappe sombre + lueur jaune très diffuse */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_10%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_60%)]"
      />

      <div className="safe-top relative z-10 flex items-center justify-center px-4 pt-6">
        <img
          src={indiRadioLogo}
          alt="InDi RaDio"
          className="h-10 w-auto opacity-90"
          loading="eager"
          decoding="async"
        />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 pb-10 pt-4">
        {/* Orbe solaire + pochette */}
        <div className="relative mt-4 aspect-square w-full max-w-[19rem]">
          <SolarOrb />
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid size-[62%] place-items-center overflow-hidden rounded-full border-2 border-primary/70 bg-neutral-950 shadow-[0_0_60px_-10px_color-mix(in_oklab,var(--primary)_60%,transparent)]">
              {showImg ? (
                <img
                  src={artwork}
                  alt={currentTrack ? `${currentTrack.artist} — ${currentTrack.title}` : ""}
                  className="size-full object-cover"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                />
              ) : (
                <RadioIcon className="size-10 text-primary" aria-hidden />
              )}
            </div>
          </div>
        </div>

        {/* Titre en cours */}
        <div className="mt-7 w-full text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
            {playing ? t("live.onAir") : t("radio.nowPlaying")}
          </div>
          <h1 className="mt-2 truncate text-xl font-black tracking-tight text-neutral-50">
            {currentTrack?.title ?? t("live.defaultTitle")}
          </h1>
          <p className="mt-1 truncate text-sm text-neutral-400">
            {currentTrack?.artist ?? t("live.defaultArtist")}
          </p>
        </div>

        {/* Play / Pause */}
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="mt-8 grid size-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_50px_-8px_color-mix(in_oklab,var(--primary)_75%,transparent)] transition active:scale-95 disabled:opacity-70"
        >
          {playing ? (
            <Pause className="size-8" aria-hidden />
          ) : (
            <Play className="size-8 translate-x-[2px]" aria-hidden />
          )}
        </button>
        {loading && (
          <span className="mt-2 text-[11px] uppercase tracking-widest text-neutral-500">
            {t("live.connecting")}
          </span>
        )}

        {/* Volume + mute */}
        <div className="mt-6">
          <VolumeControl />
        </div>

        {/* Trois derniers titres */}
        <section className="mt-9 w-full">
          <h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-neutral-500">
            {t("radio.recent")}
          </h2>
          <ul className="space-y-2">
            {history.map((row) => (
              <HistoryItem key={row.id} row={row} />
            ))}
          </ul>
        </section>

        {/* Déverrouillage */}
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="safe-bottom mt-10 inline-flex items-center gap-2 rounded-full border-2 border-primary/70 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-primary transition hover:bg-primary hover:text-primary-foreground"
        >
          <Unlock className="size-4" aria-hidden />
          {t("radio.unlock")}
        </button>
      </main>
    </div>
  );
}

function HistoryItem({ row }: { row: TrackRow }) {
  const { data: art } = useArtwork(row.artist, row.title);
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [art]);
  const time = new Date(row.played_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-2">
      <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-md bg-neutral-900">
        {art && !err ? (
          <img
            src={art}
            alt={`${row.artist} — ${row.title}`}
            className="size-full object-cover"
            loading="lazy"
            decoding="async"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={() => setErr(true)}
          />
        ) : (
          <RadioIcon className="size-4 text-primary/70" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-neutral-100">{row.title}</div>
        <div className="truncate text-xs text-neutral-500">{row.artist}</div>
      </div>
      <span className="shrink-0 text-[11px] tabular-nums text-neutral-600">{time}</span>
    </li>
  );
}
