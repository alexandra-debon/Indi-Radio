import { createFileRoute } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { Coffee, Handshake, ShieldCheck, MessageSquare, Flag, Pause, Sparkles, AlertTriangle, Award, Mic, PenLine, Star } from "lucide-react";

export const Route = createFileRoute("/moderation")({
  head: () => ({
    meta: [
      { title: "Modération & valeurs — InDi RaDio" },
      {
        name: "description",
        content:
          "Notre approche de la modération, nos valeurs de dialogue et la pause hors réseau que nous privilégions avant toute sanction.",
      },
      { property: "og:title", content: "Modération & valeurs — InDi RaDio" },
      {
        property: "og:description",
        content:
          "Comment nous modérons la communauté InDi : dialogue d'abord, sanctions ensuite. La pause hors réseau pour se comprendre.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://radio.indi-art-culture.com/moderation" },
    ],
    links: [{ rel: "canonical", href: "https://radio.indi-art-culture.com/moderation" }],
  }),
  component: ModerationPage,
});

type Lang = "fr" | "en";

const COPY: Record<Lang, {
  title: string;
  intro: string;
  valuesTitle: string;
  values: { icon: "handshake" | "sparkles" | "shield" | "message"; title: string; body: string }[];
  systemTitle: string;
  systemIntro: string;
  levels: { badge: string; title: string; body: string }[];
  pauseTitle: string;
  pauseLead: string;
  pauseBody: string[];
  pauseQuote: string;
  reportTitle: string;
  reportBody: string;
  contactTitle: string;
  contactBody: string;
  contactCta: string;
  rewardsTitle: string;
  rewardsIntro: string;
  rewards: { icon: "award" | "star" | "mic" | "pen"; title: string; body: string }[];
  rewardsFoot: string;
}> = {
  fr: {
    title: "Modération, valeurs & dialogue",
    intro:
      "InDi RaDio est une radio communautaire portée par l'amour de la musique indépendante. Ce qu'on protège en priorité, ce n'est pas une règle abstraite : c'est la possibilité pour chacun — auditeur, artiste, animateur — de se sentir chez soi et de parler librement, sans crainte et sans mépris.",
    valuesTitle: "Nos valeurs",
    values: [
      {
        icon: "handshake",
        title: "Respect avant tout",
        body: "On peut ne pas être d'accord sur un morceau, un genre, une opinion — jamais sur la dignité de l'autre. Insultes, harcèlement, propos racistes, sexistes, homophobes ou haineux n'ont aucune place ici.",
      },
      {
        icon: "sparkles",
        title: "Curiosité & découverte",
        body: "On célèbre les artistes encore méconnus, on partage, on recommande. On critique la musique avec honnêteté, jamais les personnes.",
      },
      {
        icon: "shield",
        title: "Protection des plus fragiles",
        body: "Les artistes qui débutent, les auditeurs qui postent pour la première fois, les personnes ciblées : notre parti pris est de les protéger d'abord.",
      },
      {
        icon: "message",
        title: "Dialogue, pas escalade",
        body: "Une remarque maladroite n'est pas un crime. On préfère parler, expliquer, comprendre — plutôt que sanctionner par réflexe.",
      },
    ],
    systemTitle: "Comment fonctionne la modération",
    systemIntro:
      "La modération est assurée par l'équipe d'InDi ArT CulTuRe et par la communauté via les signalements. Voici les paliers, du plus léger au plus strict.",
    levels: [
      {
        badge: "1",
        title: "Signalement communautaire",
        body: "N'importe quel membre peut signaler un commentaire, une publication, une photo ou un profil via l'icône « drapeau ». Le contenu remonte immédiatement à l'équipe.",
      },
      {
        badge: "2",
        title: "Revue par l'équipe",
        body: "Un modérateur relit le contenu dans son contexte (fil complet, historique de la personne). On ne juge jamais sur une phrase sortie de son échange.",
      },
      {
        badge: "3",
        title: "Pause & dialogue hors réseau",
        body: "Avant toute sanction visible, on privilégie une pause : on prend contact en privé (message, email) pour expliquer ce qui a posé problème et écouter la personne. C'est le cœur de notre approche.",
      },
      {
        badge: "4",
        title: "Retrait ou masquage du contenu",
        body: "Si le contenu dépasse clairement nos valeurs (haine, harcèlement, contenu illégal), il est retiré. La personne est informée du motif.",
      },
      {
        badge: "5",
        title: "Quarantaine temporaire",
        body: "En cas de récidive, le compte passe en quarantaine : lecture possible, publication et commentaires suspendus pendant une durée limitée.",
      },
      {
        badge: "6",
        title: "Bannissement",
        body: "Réservé aux cas graves ou aux récidives après dialogue : haine, harcèlement ciblé, atteinte à la sécurité d'autrui. Toujours documenté, jamais impulsif.",
      },
    ],
    pauseTitle: "La pause hors réseau : pourquoi on y tient",
    pauseLead:
      "Un écran, un fil de commentaires, une notification qui s'empile — c'est le pire endroit pour se comprendre. On y répond à chaud, on lit de travers, on prend un ton qu'on n'aurait jamais eu en face.",
    pauseBody: [
      "Quand une tension monte, notre premier réflexe n'est pas de sanctionner : c'est d'inviter à respirer. On contacte la personne en privé, hors du fil public, pour lui expliquer calmement ce qui a été perçu et lui demander sa version.",
      "Neuf fois sur dix, c'est un malentendu, une fatigue, un humour qui n'est pas passé. Un simple échange règle tout et personne n'est humilié publiquement.",
      "Cette pause protège aussi la personne qui s'est sentie blessée : elle sait que sa parole a été entendue, examinée, et qu'une réponse humaine — pas un algorithme — a été apportée.",
      "Sanctionner sans parler, c'est facile. Prendre le temps du dialogue, c'est ce qui fait la différence entre une plateforme et une communauté.",
    ],
    pauseQuote:
      "Une pause vaut mieux qu'un bannissement. Un échange vaut mieux qu'un procès.",
    reportTitle: "Signaler un contenu",
    reportBody:
      "Sur chaque publication, commentaire, photo ou profil, une icône de signalement est disponible. Décris brièvement ce qui te pose problème — l'équipe reçoit l'alerte et applique la démarche ci-dessus.",
    contactTitle: "Nous contacter",
    contactBody:
      "Pour toute question sur la modération, un désaccord sur une décision, ou pour signaler une situation grave hors de la plateforme, écris-nous directement.",
    contactCta: "Aller à la page Contact",
    rewardsTitle: "Récompenses & progression",
    rewardsIntro:
      "InDi RaDio n'est pas qu'une communauté à modérer : c'est une communauté qu'on encourage. Plus tu participes avec bienveillance, plus tu débloques de badges — et certains ouvrent de véritables portes.",
    rewards: [
      {
        icon: "award",
        title: "Badges & niveaux",
        body: "Écoutes, likes, commentaires constructifs, découvertes partagées : chaque geste rapporte des points et fait progresser ton niveau. Les badges apparaissent sur ton profil public.",
      },
      {
        icon: "star",
        title: "Contenus & émissions exclusifs",
        body: "Certains badges donnent accès à des émissions, playlists et coulisses réservés — invitations, previews, sessions inédites de nos artistes.",
      },
      {
        icon: "pen",
        title: "Galons de critique musicale certifié·e",
        body: "En gravissant les niveaux, tu peux obtenir un galon officiel « Critique musicale certifié·e InDi ArT CulTuRe » et publier de véritables articles / chroniques sur l'application.",
      },
      {
        icon: "mic",
        title: "Interviews de tes artistes préférés",
        body: "Les membres les plus engagés peuvent mener leurs propres interviews d'artistes indépendants, diffusées sur InDi RaDio et relayées par le magazine InDi ArT CulTuRe.",
      },
    ],
    rewardsFoot:
      "La progression est ouverte à tous : elle ne récompense pas le bruit, mais la qualité de la présence — l'écoute, la curiosité, le respect.",
  },
  en: {
    title: "Moderation, values & dialogue",
    intro:
      "InDi RaDio is a community-driven radio built on love for independent music. What we protect first isn't an abstract rule — it's the ability for every listener, artist and host to feel at home and speak freely, without fear or contempt.",
    valuesTitle: "Our values",
    values: [
      {
        icon: "handshake",
        title: "Respect above all",
        body: "We can disagree on a track, a genre, an opinion — never on someone's dignity. Insults, harassment, racist, sexist, homophobic or hateful speech have no place here.",
      },
      {
        icon: "sparkles",
        title: "Curiosity & discovery",
        body: "We celebrate lesser-known artists, share, recommend. We critique music honestly, never the people behind it.",
      },
      {
        icon: "shield",
        title: "Protecting the most fragile",
        body: "Emerging artists, first-time posters, people being targeted: our default is to protect them first.",
      },
      {
        icon: "message",
        title: "Dialogue, not escalation",
        body: "A clumsy remark isn't a crime. We'd rather talk, explain, understand — than sanction on reflex.",
      },
    ],
    systemTitle: "How moderation works",
    systemIntro:
      "Moderation is handled by the InDi ArT CulTuRe team and by the community through reports. Here are the levels, from lightest to strictest.",
    levels: [
      {
        badge: "1",
        title: "Community reporting",
        body: "Any member can report a comment, post, photo or profile using the flag icon. The content is immediately routed to the team.",
      },
      {
        badge: "2",
        title: "Team review",
        body: "A moderator reads the content in context (full thread, person's history). We never judge on a single line pulled out of a conversation.",
      },
      {
        badge: "3",
        title: "Pause & off-network dialogue",
        body: "Before any visible sanction, we prefer to pause: we reach out privately (message, email) to explain what caused concern and listen to the person. This is the heart of our approach.",
      },
      {
        badge: "4",
        title: "Content removal or hiding",
        body: "If the content clearly crosses our values (hate, harassment, illegal content), it's removed. The person is informed of the reason.",
      },
      {
        badge: "5",
        title: "Temporary quarantine",
        body: "For repeat cases, the account is quarantined: reading is still allowed, but posting and commenting are suspended for a limited time.",
      },
      {
        badge: "6",
        title: "Ban",
        body: "Reserved for severe cases or repeat offenses after dialogue: hate, targeted harassment, threats to someone's safety. Always documented, never impulsive.",
      },
    ],
    pauseTitle: "The off-network pause: why it matters",
    pauseLead:
      "A screen, a thread of comments, a stack of notifications — that's the worst place to understand each other. People react hot, misread, take a tone they'd never use face to face.",
    pauseBody: [
      "When tension rises, our first reflex isn't to sanction: it's to invite a breath. We reach out privately, off the public thread, to calmly explain what was perceived and ask for the person's own version.",
      "Nine times out of ten it's a misunderstanding, tiredness, or humor that didn't land. A single exchange sorts it out and no one is publicly humiliated.",
      "This pause also protects the person who felt hurt: they know their voice was heard, examined, and that a human response — not an algorithm — was given.",
      "Sanctioning without talking is easy. Taking time for dialogue is what turns a platform into a community.",
    ],
    pauseQuote:
      "A pause beats a ban. A conversation beats a verdict.",
    reportTitle: "Report content",
    reportBody:
      "Every post, comment, photo and profile carries a report icon. Briefly describe what bothers you — the team gets the alert and follows the process above.",
    contactTitle: "Contact us",
    contactBody:
      "For any moderation question, a disagreement with a decision, or to report a serious situation outside the platform, write to us directly.",
    contactCta: "Go to Contact page",
    rewardsTitle: "Rewards & progression",
    rewardsIntro:
      "InDi RaDio isn't only a community to moderate — it's a community we lift up. The more you take part with care, the more badges you unlock, and some open real doors.",
    rewards: [
      {
        icon: "award",
        title: "Badges & levels",
        body: "Listens, likes, thoughtful comments, shared discoveries: every gesture earns points and raises your level. Badges show on your public profile.",
      },
      {
        icon: "star",
        title: "Exclusive shows & content",
        body: "Some badges unlock members-only shows, playlists and behind-the-scenes — invites, previews, unreleased sessions from our artists.",
      },
      {
        icon: "pen",
        title: "Certified music-critic stripes",
        body: "As you level up, you can earn an official « Certified InDi ArT CulTuRe Music Critic » stripe and publish real articles / reviews on the app.",
      },
      {
        icon: "mic",
        title: "Interview your favorite artists",
        body: "The most engaged members can run their own interviews with independent artists, aired on InDi RaDio and relayed by the InDi ArT CulTuRe magazine.",
      },
    ],
    rewardsFoot:
      "Progression is open to everyone: it doesn't reward noise, but the quality of your presence — listening, curiosity, respect.",
  },
};

const ICONS = {
  handshake: Handshake,
  sparkles: Sparkles,
  shield: ShieldCheck,
  message: MessageSquare,
} as const;

const REWARD_ICONS = {
  award: Award,
  star: Star,
  mic: Mic,
  pen: PenLine,
} as const;

function ModerationPage() {
  const { lang } = useLang();
  const c = COPY[(lang as Lang) ?? "fr"];

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="section-title flex items-center gap-2">
          <Handshake className="size-6 text-primary" />
          {c.title}
        </h1>
        <div className="card-brut p-4 text-sm leading-relaxed">
          <p>{c.intro}</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">{c.valuesTitle}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {c.values.map((v) => {
            const Icon = ICONS[v.icon];
            return (
              <div key={v.title} className="card-brut space-y-2 p-4">
                <div className="flex items-center gap-2">
                  <Icon className="size-5 text-primary" />
                  <h3 className="font-black">{v.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">{v.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">{c.systemTitle}</h2>
        <p className="text-sm text-foreground/80">{c.systemIntro}</p>
        <ol className="space-y-2">
          {c.levels.map((lv) => (
            <li key={lv.badge} className="card-brut flex gap-3 p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-black bg-primary text-sm font-black text-black">
                {lv.badge}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold">{lv.title}</h3>
                <p className="mt-0.5 text-sm text-foreground/80">{lv.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="section-title flex items-center gap-2">
          <Pause className="size-6 text-primary" />
          {c.pauseTitle}
        </h2>
        <div className="card-brut space-y-3 border-primary/60 p-4 text-sm leading-relaxed">
          <div className="flex items-start gap-3">
            <Coffee className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="font-semibold">{c.pauseLead}</p>
          </div>
          {c.pauseBody.map((p, i) => (
            <p key={i} className="text-foreground/80">{p}</p>
          ))}
          <blockquote className="mt-2 border-l-4 border-primary bg-primary/10 px-3 py-2 text-sm font-bold italic">
            « {c.pauseQuote} »
          </blockquote>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="card-brut space-y-2 p-4">
          <h2 className="flex items-center gap-2 text-base font-black">
            <Flag className="size-5 text-primary" />
            {c.reportTitle}
          </h2>
          <p className="text-sm text-foreground/80">{c.reportBody}</p>
        </div>
        <div className="card-brut space-y-2 p-4">
          <h2 className="flex items-center gap-2 text-base font-black">
            <AlertTriangle className="size-5 text-primary" />
            {c.contactTitle}
          </h2>
          <p className="text-sm text-foreground/80">{c.contactBody}</p>
          <a
            href="/contact"
            className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-primary px-3 py-1.5 text-xs font-black text-black shadow-[2px_2px_0_0_#000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000]"
          >
            {c.contactCta} →
          </a>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title flex items-center gap-2">
          <Award className="size-6 text-primary" />
          {c.rewardsTitle}
        </h2>
        <p className="text-sm text-foreground/80">{c.rewardsIntro}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {c.rewards.map((r) => {
            const Icon = REWARD_ICONS[r.icon];
            return (
              <div key={r.title} className="card-brut space-y-2 p-4">
                <div className="flex items-center gap-2">
                  <Icon className="size-5 text-primary" />
                  <h3 className="font-black">{r.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">{r.body}</p>
              </div>
            );
          })}
        </div>
        <p className="text-xs italic text-foreground/70">{c.rewardsFoot}</p>
      </section>
    </div>
  );
}