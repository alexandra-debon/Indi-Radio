import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { RADIO_CONFIG } from "@/config/radio";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { scrapeCurrentTrack } from "@/lib/track-scrape.functions";

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
  const queryClient = useQueryClient();

  // Web Audio graph for the analyser (built lazily on first play)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);
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
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      sourceRef.current = source;
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      /* CORS or unsupported: leave analyser null → RadioWave falls back */
    }
  }, []);

  const startLevelLoop = useCallback(() => {
    if (rafRef.current != null) return;
    const tick = () => {
      const analyser = analyserRef.current;
      const data = dataRef.current;
      if (analyser && data) {
        analyser.getByteFrequencyData(data as unknown as Uint8Array<ArrayBuffer>);
        // RMS over the low/mid bins gives a musical-feeling level
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length) / 255;
        listenersRef.current.forEach((cb) => cb(rms));
      }
      rafRef.current = requestAnimationFrame(tick);
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
      // Force re-load to reset the stream buffer
      el.src = RADIO_CONFIG.streamUrl;
      el.load();
      setLoading(true);
      ensureAnalyser();
      // Some browsers create AudioContext suspended until a user gesture
      audioCtxRef.current?.resume().catch(() => {});
      el.play()
        .then(() => {
          setPlaying(true);
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
  }, [ensureAnalyser, startLevelLoop, stopLevelLoop]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
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
  }, []);

  return (
    <RadioContext.Provider
      value={{ playing, loading, toggle, currentTrack, loadingTrack, subscribeLevel }}
    >
      {/* Persistent audio element — never re-mounts across route changes */}
      {/* crossOrigin is required so MediaElementAudioSourceNode can read samples */}
      <audio ref={audioRef} preload="none" crossOrigin="anonymous" />
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("useRadio must be inside <RadioPlayerProvider>");
  return ctx;
}