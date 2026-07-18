import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { RADIO_CONFIG } from "@/config/radio";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { scrapeCurrentTrack } from "@/lib/track-scrape.functions";
import { useArtwork } from "@/hooks/use-artwork";

interface CurrentTrack {
  id: string;
  title: string;
  artist: string;
  played_at: string;
}

interface RadioContextValue {
  playing: boolean;
  loading: boolean;
  toggle: () => void;
  currentTrack: CurrentTrack | null;
  loadingTrack: boolean;
  volume: number;
  muted: boolean;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  /**
   * Subscribe to the live audio level (0..1). Callback fires on each
   * animation frame while the stream is playing. Returns an unsubscribe fn.
   */
  subscribeLevel: (cb: (level: number) => void) => () => void;
  /**
   * Duration reported by the <audio> element. For a live stream this is
   * Infinity / NaN, which means the progress bar must be hidden and a simple
   * "live" indicator shown instead.
   */
  duration: number | null;
  /**
   * True when the browser reports a finite, positive duration (i.e. a file
   * with a known length). For the live radio stream this is always false.
   */
  durationKnown: boolean;
}

const RadioContext = createContext<RadioContextValue | null>(null);

export function RadioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  // Duration of the <audio> element: Infinity/NaN for the live stream.
  const [duration, setDuration] = useState<number | null>(null);
  const durationKnown = typeof duration === "number" && Number.isFinite(duration) && duration > 0;
  // SSR-safe defaults; persisted values are loaded post-mount to avoid
  // hydration mismatches on the volume slider label / fill.
  const [volume, setVolumeState] = useState<number>(0.8);
  const [muted, setMuted] = useState<boolean>(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("indi-radio:volume");
      const parsed = raw ? Number(raw) : NaN;
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
        setVolumeState(parsed);
      }
      if (window.localStorage.getItem("indi-radio:muted") === "1") {
        setMuted(true);
      }
    } catch {
      /* storage unavailable */
    }
  }, []);
  const queryClient = useQueryClient();

  // Web Audio graph for the analyser (built lazily on first play)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const fallbackPhaseRef = useRef(0);
  const lastAudioTimeRef = useRef(0);
  const lastLiveLevelRef = useRef(0);
  const listenersRef = useRef<Set<(l: number) => void>>(new Set());

  const ensureAnalyser = useCallback(() => {
    const el = audioRef.current;
    if (!el || analyserRef.current) return;
    try {
      const Ctx = (window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as
        | typeof AudioContext
        | undefined;
      if (!Ctx) return;
      const ctx = new Ctx();
      const source = ctx.createMediaElementSource(el);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      const gain = ctx.createGain();
      gain.gain.value = muted ? 0 : volume;
      source.connect(analyser);
      analyser.connect(gain);
      gain.connect(ctx.destination);
      audioCtxRef.current = ctx;
      sourceRef.current = source;
      analyserRef.current = analyser;
      gainRef.current = gain;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      /* CORS or unsupported: leave analyser null → RadioWave falls back */
    }
  }, [muted, volume]);

  // iOS Safari specifics:
  // 1. AudioContext is created in the "suspended" state and can only be
  //    resumed synchronously from within a user-gesture handler (touch/click).
  // 2. `createMediaElementSource` MUST be called *before* the first play()
  //    on that element, and only once per element — otherwise iOS silently
  //    routes the audio directly to the speaker and the analyser stays flat.
  // 3. Even after resume(), iOS sometimes leaves the context in "interrupted"
  //    state after backgrounding; we re-resume on every subsequent play.
  const isIOS = useCallback(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    return (
      /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS 13+ reports as Mac; detect touch to disambiguate
      (ua.includes("Macintosh") && "ontouchend" in document)
    );
  }, []);

  // Must be invoked *synchronously* inside the user-gesture handler on iOS.
  const primeAudioForIOS = useCallback(() => {
    ensureAnalyser();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state !== "running") {
      // Fire-and-forget: the resume() promise must be created inside the
      // gesture; awaiting it later is fine.
      ctx.resume().catch(() => {});
    }
    // Unlock the underlying HTMLAudioElement by playing a muted no-op tick.
    // Some iOS versions refuse to output through Web Audio until the media
    // element itself has been "played" at least once in a gesture.
    const el = audioRef.current;
    if (el && isIOS()) {
      try {
        const wasMuted = el.muted;
        el.muted = true;
        const p = el.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            el.pause();
            el.muted = wasMuted;
          }).catch(() => {
            el.muted = wasMuted;
          });
        }
      } catch {
        /* ignore */
      }
    }
  }, [ensureAnalyser, isIOS]);

  const startLevelLoop = useCallback(() => {
    if (rafRef.current != null) return;
    // Cap the visual refresh at ~30fps: the wave doesn't need 120Hz on
    // ProMotion devices, and skipping every other frame roughly halves
    // the analyser + listener CPU cost.
    const MIN_FRAME_MS = 1000 / 30;
    let lastFrame = 0;
    let lastPushed = -1;
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      // Pause work entirely while the tab is hidden — the browser already
      // throttles rAF to ~1Hz but the callbacks still touch the DOM.
      if (typeof document !== "undefined" && document.hidden) return;
      const now = performance.now();
      if (now - lastFrame < MIN_FRAME_MS) return;
      lastFrame = now;
      const analyser = analyserRef.current;
      const data = dataRef.current;
      const el = audioRef.current;
      let level = 0;
      if (analyser && data) {
        analyser.getByteTimeDomainData(data as unknown as Uint8Array<ArrayBuffer>);
        // RMS on the waveform follows the real loudness more reliably than
        // frequency bins for streamed radio audio.
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const centered = (data[i] - 128) / 128;
          sum += centered * centered;
        }
        level = Math.sqrt(sum / data.length);
        if (level > 0.006) lastLiveLevelRef.current = level;
      }

      // If the browser refuses to expose analyser samples for the stream, keep
      // the wave alive while playback time is progressing instead of freezing.
      const audioIsAdvancing =
        !!el && !el.paused && el.readyState > 1 && el.currentTime !== lastAudioTimeRef.current;
      lastAudioTimeRef.current = el?.currentTime ?? 0;
      if (level <= 0.006 && audioIsAdvancing) {
        fallbackPhaseRef.current += 0.18;
        const pulse =
          0.05 +
          Math.abs(Math.sin(fallbackPhaseRef.current)) * 0.08 +
          Math.abs(Math.sin(fallbackPhaseRef.current * 0.43)) * 0.05;
        level = Math.max(lastLiveLevelRef.current * 0.6, pulse);
      }
      const clamped = Math.min(1, level);
      // Skip broadcasting when the value hasn't meaningfully changed —
      // avoids waking up every subscriber (and their DOM writes) for noise.
      if (Math.abs(clamped - lastPushed) < 0.003) return;
      lastPushed = clamped;
      listenersRef.current.forEach((cb) => cb(clamped));
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopLevelLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    listenersRef.current.forEach((cb) => cb(0));
  }, []);

  const subscribeLevel = useCallback((cb: (level: number) => void) => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  // Push volume/mute into the <audio> element and persist across sessions
  useEffect(() => {
    const el = audioRef.current;
    if (el) {
      el.volume = volume;
      el.muted = muted;
    }
    // iOS Safari ignores HTMLMediaElement.volume (always 1). When the Web
    // Audio graph is active, drive volume through the GainNode instead so
    // the slider works on every platform.
    const gain = gainRef.current;
    const ctx = audioCtxRef.current;
    if (gain && ctx) {
      const target = muted ? 0 : volume;
      try {
        gain.gain.setTargetAtTime(target, ctx.currentTime, 0.01);
      } catch {
        gain.gain.value = target;
      }
    }
    try {
      window.localStorage.setItem("indi-radio:volume", String(volume));
      window.localStorage.setItem("indi-radio:muted", muted ? "1" : "0");
    } catch {
      /* storage may be unavailable */
    }
  }, [volume, muted]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    if (clamped > 0) setMuted(false);
  }, []);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  // Latest track from DB (updated externally or by admin)
  const { data: currentTrack = null, isLoading: loadingTrack } = useQuery<CurrentTrack | null>({
    queryKey: ["current-track"],
    queryFn: async () => {
      const { data } = await supabase
        .from("track_history")
        .select("id,title,artist,played_at")
        .order("played_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    refetchInterval: 30_000,
  });

  // Pochette du morceau en cours (best-effort) pour l'affichage sur les
  // autoradios, écrans Bluetooth et écrans de verrouillage via Media Session.
  const { data: artworkUrl } = useArtwork(currentTrack?.artist, currentTrack?.title);

  // Media Session: expose titre + artiste (+ pochette si dispo) au système.
  // Les autoradios modernes, casques Bluetooth et écrans de verrouillage
  // lisent ces métadonnées automatiquement.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!currentTrack) {
      navigator.mediaSession.metadata = null;
      return;
    }
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title || "InDi Radio",
        artist: currentTrack.artist || "InDi Radio",
        album: "InDi Radio",
        artwork: artworkUrl
          ? [
              { src: artworkUrl, sizes: "512x512", type: "image/jpeg" },
              { src: artworkUrl, sizes: "256x256", type: "image/jpeg" },
              { src: artworkUrl, sizes: "128x128", type: "image/jpeg" },
            ]
          : [],
      });
    } catch {
      /* MediaMetadata indisponible */
    }
  }, [currentTrack, artworkUrl]);

  // Media Session: état de lecture + actions play/pause/stop pour les
  // télécommandes matérielles (volant, casque, écran de verrouillage).
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }, [playing]);

  // Compteur temps écoulé (affiché sur autoradio / lockscreen via
  // MediaSession.setPositionState). On repart de 0 uniquement :
  //   - au démarrage du flux
  //   - quand la piste courante est réellement un jingle
  //     (jingle Laurent Oleff, ou toute piste dont l'artiste/titre contient
  //     "jingle" — même règle que la pochette « J » côté serveur).
  // Duration=0 masque la barre de progression (le compteur affiché ne
  // "yoyote" plus car il est piloté par nous, plus par l'OS).
  // Seuil de similarité (0..1) au-dessus duquel un token est considéré
  // comme correspondant à "laurent" ou "oleff". Configurable via
  // localStorage("indi-radio:jingleThreshold") pour ajuster à chaud sans
  // redéploiement en cas de faux positifs / négatifs.
  const JINGLE_SIM_THRESHOLD = (() => {
    try {
      const raw = window.localStorage.getItem("indi-radio:jingleThreshold");
      const n = raw ? Number(raw) : NaN;
      if (Number.isFinite(n) && n > 0.5 && n <= 1) return n;
    } catch {
      /* ignore */
    }
    return 0.82;
  })();

  const normalize = (s?: string | null) =>
    (s ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  // Distance de Levenshtein compacte (O(n*m) temps, O(min) mémoire).
  const levenshtein = (a: string, b: string): number => {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    if (a.length < b.length) [a, b] = [b, a];
    let prev = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      let curr = [i];
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      prev = curr;
    }
    return prev[b.length];
  };

  const similarity = (a: string, b: string): number => {
    const max = Math.max(a.length, b.length);
    if (!max) return 1;
    return 1 - levenshtein(a, b) / max;
  };

  // Cherche le meilleur score de similarité entre `target` et chaque token
  // (mot) du texte donné. Ignore les tokens trop courts pour éviter les
  // matchs bruit ("le", "un", ...).
  const bestTokenSimilarity = (text: string, target: string): number => {
    let best = 0;
    for (const tok of text.split(" ")) {
      if (tok.length < Math.max(3, target.length - 2)) continue;
      const s = similarity(tok, target);
      if (s > best) best = s;
      if (best === 1) break;
    }
    return best;
  };

  const isJingleTrack = (t: CurrentTrack | null) => {
    if (!t) return false;
    const a = normalize(t.artist);
    const ti = normalize(t.title);
    // Match exact "jingle" — sans fuzzy pour éviter d'attraper "single",
    // "jungle", etc.
    const hay = `${a} ${ti}`;
    if (/\bjingle[s]?\b/.test(hay)) return true;
    // Fuzzy "laurent" + "oleff" : les deux tokens doivent dépasser le seuil
    // dans la même chaîne (artist OU title), sinon on rejette. Évite les
    // faux positifs sur "Laurent Voulzy" ou "Oleg ...".
    const check = (s: string) =>
      bestTokenSimilarity(s, "laurent") >= JINGLE_SIM_THRESHOLD &&
      bestTokenSimilarity(s, "oleff") >= JINGLE_SIM_THRESHOLD;
    return check(a) || check(ti);
  };
  const startedAtRef = useRef<number>(Date.now());
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    // Reset au (re)démarrage du flux
    if (playing && !wasPlayingRef.current) startedAtRef.current = Date.now();
    wasPlayingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    // Reset uniquement si la nouvelle piste est un jingle
    if (playing && isJingleTrack(currentTrack)) {
      startedAtRef.current = Date.now();
    }
  }, [currentTrack?.id, playing]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (typeof navigator.mediaSession.setPositionState !== "function") return;

    if (durationKnown) {
      // Known duration: a real progress bar is allowed. For this radio the
      // stream is live, so this branch is normally unused.
      try {
        navigator.mediaSession.setPositionState({
          duration,
          position: 0,
          playbackRate: 1,
        });
      } catch {
        /* ignore */
      }
      return;
    }

    // Flux live (durée inconnue / Infinity) : on efface explicitement
    // l'état de position pour masquer la barre de progression. Certains OS
    // (Android Auto, CarPlay, Bluetooth) affichent alors seulement un
    // indicateur "live" ou un compteur temps écoulé simple, sans jauge
    // trompeuse qui yoyote.
    try {
      navigator.mediaSession.setPositionState!();
    } catch {
      /* certains OS refusent l'appel sans argument */
    }
  }, [playing, currentTrack?.id, duration, durationKnown]);

  // Scrape Icecast metadata every 30s and upsert into track_history.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await scrapeCurrentTrack();
        if (!cancelled && res?.changed) {
          queryClient.invalidateQueries({ queryKey: ["current-track"] });
          queryClient.invalidateQueries({ queryKey: ["track-history"] });
        }
      } catch {
        /* ignore transient failures */
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [queryClient]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      // iOS Safari: prime the AudioContext + media element synchronously
      // inside this gesture BEFORE assigning src / calling load(). If we
      // wait until after load(), the gesture is considered consumed and
      // resume() stays pending forever → analyser reads all zeros.
      primeAudioForIOS();
      // Force re-load to reset the stream buffer
      el.src = RADIO_CONFIG.streamUrl;
      el.load();
      setLoading(true);
      el.play()
        .then(() => {
          setPlaying(true);
          // Belt-and-suspenders re-resume: iOS sometimes drops the context
          // back to "interrupted" between the gesture and play() resolving.
          audioCtxRef.current?.resume().catch(() => {});
          startLevelLoop();
        })
        .catch(() => setPlaying(false))
        .finally(() => setLoading(false));
    } else {
      el.pause();
      el.src = ""; // stop network usage
      setPlaying(false);
      setLoading(false);
      stopLevelLoop();
    }
  }, [primeAudioForIOS, startLevelLoop, stopLevelLoop]);

  // Bind Media Session action handlers (play / pause / stop) → togglent le flux.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const doToggle = () => toggle();
    try {
      ms.setActionHandler("play", doToggle);
      ms.setActionHandler("pause", doToggle);
      ms.setActionHandler("stop", doToggle);
      // Le flux est en direct : désactiver seek / prev / next pour éviter
      // que l'autoradio affiche des contrôles inopérants.
      ms.setActionHandler("seekbackward", null);
      ms.setActionHandler("seekforward", null);
      ms.setActionHandler("previoustrack", null);
      ms.setActionHandler("nexttrack", null);
    } catch {
      /* certains handlers non supportés */
    }
    return () => {
      try {
        ms.setActionHandler("play", null);
        ms.setActionHandler("pause", null);
        ms.setActionHandler("stop", null);
      } catch {
        /* ignore */
      }
    };
  }, [toggle]);

  // iOS: when the tab goes to the background, the AudioContext transitions
  // to "interrupted". Resume it as soon as the user comes back so the wave
  // doesn't stay frozen after unlocking the phone.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        audioCtxRef.current?.resume().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => {
      setPlaying(true);
      // Belt-and-suspenders: also ensure the analyser + level loop are up
      // (covers cases where play() didn't resolve through our toggle path,
      // e.g. resume from media-session controls).
      ensureAnalyser();
      audioCtxRef.current?.resume().catch(() => {});
      startLevelLoop();
    };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => {
      setLoading(false);
      startLevelLoop();
    };
    const onCanPlay = () => setLoading(false);
    const onError = () => setLoading(false);
    const onDurationChange = () => {
      // For a live Icecast stream the duration stays Infinity/NaN.
      // We expose it so the UI + MediaSession can hide the progress bar.
      setDuration(Number.isFinite(el.duration) && el.duration > 0 ? el.duration : null);
    };
    const onLoadedMetadata = () => {
      setDuration(Number.isFinite(el.duration) && el.duration > 0 ? el.duration : null);
    };
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("error", onError);
    el.addEventListener("durationchange", onDurationChange);
    el.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("error", onError);
      el.removeEventListener("durationchange", onDurationChange);
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [ensureAnalyser, startLevelLoop]);

  return (
    <RadioContext.Provider
      value={{
        playing,
        loading,
        toggle,
        currentTrack,
        loadingTrack,
        volume,
        muted,
        setVolume,
        toggleMute,
        subscribeLevel,
        duration,
        durationKnown,
      }}
    >
      {/* Persistent audio element — never re-mounts across route changes.
          Stream is served through a same-origin proxy so no crossOrigin
          attribute is needed — and adding one triggers a CORS preflight
          Icecast doesn't answer, which silently zeroes the analyser. */}
      <audio ref={audioRef} preload="none" />
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("useRadio must be inside <RadioPlayerProvider>");
  return ctx;
}
