import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { HeartHandshake, ChevronDown, ChevronUp } from "lucide-react";

/**
 * Mention « société à mission » affichée au bas des boutiques (page artiste
 * et boutique globale) : InDi ArT CulTuRe / Whisper and Map ne prennent
 * aucune commission sur les ventes des artistes.
 */
const TXT = {
  fr: {
    title: "Notre mission",
    promise: "Aucune retenue, aucun pourcentage : 100 % de vos achats est reversé à l'artiste.",
    open: "Lire notre manifeste",
    close: "Réduire",
    paragraphs: [
      "InDi ArT CulTuRe est une création de la société à mission « Whisper and Map », dont la raison d'être est de promouvoir la musique et la culture indépendante, tout comme la culture alternative, de favoriser l'accès à la diversité culturelle, de remettre en lien les artistes de la culture indé avec un public sincère et de favoriser une rémunération plus juste des artistes indépendants.",
      "Il est donc important pour vous de savoir qu'en achetant une œuvre d'un artiste — qu'il s'agisse d'un vinyle, d'un CD, d'une K7, de toute forme de merch habillé ou même d'une place de concert — InDi ArT CulTuRe, et donc la société à mission Whisper and Map, ne soustraient aucune retenue ni aucun pourcentage sur les ventes. Vos achats sont à 100 % reversés à l'artiste et il s'agit là du cœur même de notre mission.",
      "L'artiste donne par ailleurs, au travers de sa page artiste, les liens d'achat de ses œuvres et objets en tant que liens d'achat externes lui étant propres et sans rapport avec cette application, InDi ArT CulTuRe étant le bouquet culturel « InDi ArT CulTuRe » fondé par Whisper and Map, la société à mission fondatrice de cet écosystème.",
      "Quand vous achetez un disque, vous rémunérez à sa juste valeur le travail de l'artiste, et nous en sommes fiers.",
    ],
  },
  en: {
    title: "Our mission",
    promise: "No deduction, no commission: 100 % of your purchases goes straight to the artist.",
    open: "Read our manifesto",
    close: "Show less",
    paragraphs: [
      "InDi ArT CulTuRe was created by the mission-driven company « Whisper and Map », whose purpose is to promote independent music and independent culture — alternative culture included —, to foster access to cultural diversity, to reconnect underground artists with an honest audience, and to help secure fairer pay for independent artists.",
      "So it matters to us that you know this: when you buy an artist's work — be it a vinyl, a CD, a cassette, any piece of merch or even a concert ticket — InDi ArT CulTuRe, and therefore the mission-driven company Whisper and Map, take no deduction and no percentage on the sale. Your purchases are passed on 100 % to the artist, and that is the very heart of our mission.",
      "The artist also provides, from their artist page, the purchase links for their works and items as external links of their own, with no connection to this app: InDi ArT CulTuRe is the cultural bundle « InDi ArT CulTuRe » founded by Whisper and Map, the mission-driven company at the origin of this ecosystem.",
      "When you buy a record, you are paying an artist's work what it is worth — and we are proud of it.",
    ],
  },
} as const;

export function ShopMissionNote({ accent }: { accent?: string | null }) {
  const { lang } = useLang();
  const txt = TXT[lang === "en" ? "en" : "fr"];
  const [open, setOpen] = useState(false);

  return (
    <div
      className="mt-4 border-2 border-dashed border-border p-3"
      style={accent ? { borderColor: accent } : undefined}
    >
      <div className="flex items-start gap-2">
        <HeartHandshake
          className="mt-0.5 size-4 shrink-0"
          style={accent ? { color: accent } : undefined}
          aria-hidden
        />
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {txt.title}
          </div>
          <p className="mt-1 text-xs font-semibold leading-snug">{txt.promise}</p>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest underline-offset-2 hover:underline"
            style={accent ? { color: accent } : undefined}
          >
            {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {open ? txt.close : txt.open}
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-3 space-y-2 border-t-2 border-dashed border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
          {txt.paragraphs.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
      )}
    </div>
  );
}
