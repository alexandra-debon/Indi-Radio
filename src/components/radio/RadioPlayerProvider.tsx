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
  toggle: () => void;
  currentTrack: CurrentTrack | null;
  loadingTrack: boolean;
}

const RadioContext = createContext<RadioContextValue | null>(null);

export function RadioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const queryClient = useQueryClient();

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
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      el.pause();
      el.src = ""; // stop network usage
      setPlaying(false);
    }
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, []);

  return (
    <RadioContext.Provider value={{ playing, toggle, currentTrack, loadingTrack }}>
      {/* Persistent audio element — never re-mounts across route changes */}
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