import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLang } from "@/lib/i18n";

const STORAGE_KEY = "indi.playlists.spotify-notice-dismissed";

const TEXT_FR = [
  "InDi ArT CulTuRe et InDi RaDio, ainsi que la Société à Mission Whisper&Map fondée par Melody Alex. Patrick, sont en profond désaccord avec les pratiques commerciales et la redistribution des royalties envers les artistes indépendants. Nous sommes par ailleurs particulièrement indignés par les investissements dans l'armement privé de nouvelles générations et technologies, ouvertement pratiqués et assumés par le dirigeant de la plateforme.",
  "Nous ne souhaitons en aucune manière émettre de jugement sur les audiences de cette plateforme, pas plus que sur les artistes qui y déposent leur musique afin qu'elle soit entendue par le plus grand nombre. Nous savons pertinemment qu'un besoin de visibilité leur est indispensable et ne nous permettrons jamais de remettre leurs choix en question.",
  "Cependant, il est de notre responsabilité d'affirmer notre ressenti le plus profond, sans pour autant pénaliser le moindre utilisateur, artiste comme auditeur, sur la plateforme InDi RaDio.",
  "Ainsi, cette page playlists se compose de deux lecteurs proposant une playlist identique : « Spotify » et « Apple Music ».",
  "InDi ArT CulTuRe et InDi RaDio ne peuvent cacher que leur passion pour la musique indé et la protection des droits des artistes qui la font vivre oriente très naturellement leurs choix vers des plateformes telles que Deezer, Apple Music, Tidal, Qobuz ou Bandcamp, qui rémunèrent plus équitablement les artistes.",
  "Nous vous souhaitons de profiter des artistes comme il se doit, quelle que soit la plateforme que vous utilisez, et nous vous remercions de nous avoir laissés exprimer notre vision au travers de ce message.",
];

const TEXT_EN = [
  "InDi ArT CulTuRe and InDi RaDio, together with the mission-driven company Whisper&Map founded by Melody Alex. Patrick, deeply disagree with the platform's commercial practices and with the way royalties are redistributed to independent artists. We are also particularly outraged by the investments in next-generation private weaponry and technologies, openly made and claimed by the platform's leader.",
  "We in no way wish to pass judgement on the platform's listeners, nor on the artists who upload their music there so it can reach as many people as possible. We know full well that visibility is essential to them, and we would never question their choices.",
  "It is however our responsibility to state how we truly feel, without penalising any user — artist or listener — on the InDi RaDio platform.",
  "This playlists page therefore features two players offering the very same playlist: \"Spotify\" and \"Apple Music\".",
  "InDi ArT CulTuRe and InDi RaDio cannot hide that their passion for independent music and for protecting the rights of the artists who keep it alive naturally steers their choices towards platforms such as Deezer, Apple Music, Tidal, Qobuz or Bandcamp, which pay artists more fairly.",
  "We wish you a great listen, whichever platform you use, and we thank you for letting us share our vision through this message.",
];

export function useSpotifyNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  return { open, setOpen };
}

export function SpotifyNotice({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { lang } = useLang();
  const [dontShow, setDontShow] = useState(false);
  const paragraphs = lang === "en" ? TEXT_EN : TEXT_FR;

  const close = () => {
    if (dontShow) {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* noop */ }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-primary">
            {lang === "en" ? "A word about Spotify" : "Un mot au sujet de Spotify"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          {paragraphs.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
        <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={dontShow} onCheckedChange={(v) => setDontShow(v === true)} />
            {lang === "en" ? "Don't show me again" : "Ne plus afficher ce message"}
          </label>
          <Button size="sm" onClick={close}>
            {lang === "en" ? "I understand" : "J'ai compris"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}