import { Rss } from "lucide-react";
import { TranslatedText } from "@/components/i18n/TranslatedText";

const FEEDS = [
  {
    href: "/rss.xml",
    label: "Toutes les nouveautés",
    desc: "Magazine, chroniques, coups de cœur, actus, clips, émissions et épisodes réunis dans un seul flux.",
  },
  {
    href: "/rss-magazine.xml",
    label: "Magazine InDi Art Culture",
    desc: "Chaque nouveau numéro du magazine interactif.",
  },
  {
    href: "/rss-chroniques.xml",
    label: "Chroniques d'albums",
    desc: "Chaque nouvelle chronique d'album publiée sur InDi RaDio.",
  },
  {
    href: "/rss-coups-de-coeur.xml",
    label: "Coups de cœur",
    desc: "Les coups de cœur de la rédaction d'InDi RaDio.",
  },
  {
    href: "/rss-actus.xml",
    label: "Actus",
    desc: "Les actualités de la scène indépendante.",
  },
  {
    href: "/rss-clips.xml",
    label: "Clip Addict",
    desc: "Les clips et playlists vidéo sélectionnés par la rédaction.",
  },
  {
    href: "/podcast.xml",
    label: "Émissions & Podcasts",
    desc: "Flux au format podcast, compatible Apple Podcasts, Spotify et Podcast Index.",
  },
] as const;

export function RssFeedsSection() {
  return (
    <section className="space-y-3">
      <h2 className="section-title inline-flex items-center gap-2">
        <Rss className="size-4" />
        <TranslatedText
          entityType="static"
          entityKey="about.rss.title"
          field="title"
          text="Flux RSS — s'abonner"
          as="span"
        />
      </h2>
      <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
        <TranslatedText
          entityType="static"
          entityKey="about.rss.intro"
          field="body"
          text="Un flux RSS est une liste automatique des dernières publications. Copie l'adresse d'un flux dans ton lecteur (Feedly, Inoreader, Thunderbird…) ou ton application de podcasts pour recevoir les nouveautés sans revenir sur le site."
          as="p"
        />
        <ul className="space-y-2">
          {FEEDS.map((f) => (
            <li key={f.href} className="flex flex-col gap-0.5">
              <a
                href={f.href}
                className="inline-flex items-center gap-2 font-semibold underline"
              >
                <Rss className="size-3.5 text-primary" />
                <TranslatedText
                  entityType="static"
                  entityKey={`about.rss.${f.href}.label`}
                  field="label"
                  text={f.label}
                  as="span"
                />
              </a>
              <TranslatedText
                entityType="static"
                entityKey={`about.rss.${f.href}.desc`}
                field="desc"
                text={f.desc}
                as="span"
                className="text-xs text-muted-foreground"
              />
              <code className="break-all text-[11px] text-muted-foreground/80">
                https://www.radio.indi-art-culture.com{f.href}
              </code>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
