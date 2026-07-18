import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
}

const RadioContext = createContext<RadioContextValue | null>(null);

export function RadioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
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
      const Ctx =
        (window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext) as typeof AudioContext | undefined;
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
    return /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS 13+ reports as Mac; detect touch to disambiguate
      (ua.includes("Macintosh") && "ontouchend" in document);
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
      const audioIsAdvancing = !!el && !el.paused && el.readyState > 1 && el.currentTime !== lastAudioTimeRef.current;
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
    return () => { cancelled = true; clearInterval(id); };
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
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("error", onError);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("error", onError);
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