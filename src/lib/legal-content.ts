/**
 * Contenu bilingue (FR/EN) des pages légales : confidentialité et CGU.
 * Le HTML est écrit à la main ici (aucune saisie utilisateur), il est donc sûr
 * de le rendre via dangerouslySetInnerHTML dans les pages correspondantes.
 */
export type LegalSection = { title: string; html: string };
export type LegalPage = { heading: string; intro: LegalSection; sections: LegalSection[] };

const MAIL = '<a class="font-semibold underline" href="mailto:radio@indi-art-culture.com">radio@indi-art-culture.com</a>';
const SITE = '<a class="font-semibold underline" href="https://radio.indi-art-culture.com" target="_blank" rel="noopener noreferrer">https://radio.indi-art-culture.com</a>';
const PARENT = "InDi ArT CulTuRe";

export const PRIVACY: Record<"fr" | "en", LegalPage> = {
  fr: {
    heading: "Politique de confidentialité",
    intro: {
      title: "",
      html: `<p class="text-muted-foreground">Cette page est maintenue par <strong>${PARENT}</strong> pour répondre aux questions de confidentialité et de protection des données sur l'application et le site Indi Radio.</p>
<p>Dernière mise à jour : <strong>10 août 2026</strong>.</p>`,
    },
    sections: [
      {
        title: "Qui sommes-nous ?",
        html: `<p><strong>Indi Radio</strong> est la radio en ligne de <strong>${PARENT}</strong>. L'application et le site web sont édités par la société à mission « Whisper and Map », fondée par Alexandra Debon (Melody Alex. Patrick).</p>
<p>Responsable du traitement : <strong>Alexandra Debon</strong>.<br/>Contact : ${MAIL}<br/>Site : ${SITE}</p>`,
      },
      {
        title: "Données collectées",
        html: `<p>Nous collectons uniquement les données nécessaires au fonctionnement de l'application et au service communautaire.</p>
<ul class="list-disc space-y-1 pl-5">
<li><strong>Compte utilisateur :</strong> adresse email, mot de passe hashé, nom d'affichage / pseudo, identifiant unique.</li>
<li><strong>Profil public :</strong> pseudo, avatar, bio, badges, niveau et points de présence.</li>
<li><strong>Contenu généré :</strong> commentaires, réponses, likes, votes, notes (étoiles), signalements, dédicaces et messages envoyés via les formulaires.</li>
<li><strong>Présence et écoute :</strong> historique de connexion quotidienne utilisé pour les points et les niveaux (pas d'historique détaillé des morceaux écoutés).</li>
<li><strong>Données techniques :</strong> type d'appareil, système d'exploitation, navigateur et adresse IP lors des connexions, pour la sécurité et le bon fonctionnement du service.</li>
</ul>
<p><strong>Écoute en direct :</strong> aucun compte n'est requis pour écouter la radio.</p>`,
      },
      {
        title: "Pourquoi utilisons-nous ces données ?",
        html: `<ul class="list-disc space-y-1 pl-5">
<li>Authentifier les utilisateurs et sécuriser les comptes.</li>
<li>Permettre les interactions communautaires (commentaires, likes, votes, réponses).</li>
<li>Envoyer les notifications choisies par l'utilisateur (mentions, réponses, likes).</li>
<li>Gérer les dédicaces et les soumissions artistes.</li>
<li>Assurer la modération et traiter les signalements.</li>
<li>Améliorer la stabilité et la sécurité de l'application.</li>
</ul>
<p>Le traitement repose sur l'exécution du contrat de service, l'intérêt légitime de modération et, le cas échéant, le consentement explicite.</p>`,
      },
      {
        title: "Notifications et marketing",
        html: `<p>Les notifications push et email sont envoyées <strong>uniquement</strong> selon les préférences activées dans votre profil : mentions, réponses dans un fil, réponses à vos messages, likes.</p>
<p>Vous pouvez modifier ces préférences à tout moment dans la section « Notifications » de votre profil. Aucun email marketing n'est envoyé sans consentement préalable.</p>`,
      },
      {
        title: "Cookies et stockage local",
        html: `<p>L'application utilise des cookies et le stockage local pour :</p>
<ul class="list-disc space-y-1 pl-5">
<li>Maintenir votre session de connexion de manière sécurisée.</li>
<li>Mémoriser vos préférences (lecture, notifications, langue).</li>
<li>Assurer le fonctionnement technique de l'interface (état du lecteur, etc.).</li>
</ul>
<p>Aucun cookie publicitaire ou de suivi comportemental à des fins publicitaires n'est utilisé.</p>`,
      },
      {
        title: "Mesure d'audience éthique : Plausible",
        html: `<p>Nous avons choisi <strong>Plausible Analytics</strong>, un outil de mesure d'audience <strong>éthique, open source et respectueux de la vie privée</strong>, plutôt que Google Analytics.</p>
<ul class="list-disc space-y-1 pl-5">
<li><strong>Aucun cookie publicitaire</strong> ni identifiant persistant : aucune empreinte de navigateur (« fingerprinting »).</li>
<li><strong>Aucune donnée personnelle</strong> collectée : les statistiques sont agrégées et anonymes (pages vues, provenance, type d'appareil).</li>
<li><strong>Aucun suivi entre sites</strong>, aucun profilage publicitaire, aucune revente de données.</li>
<li><strong>Hébergement en Europe</strong> et conformité RGPD, ePrivacy et CCPA.</li>
<li>La mesure n'est activée <strong>qu'après votre consentement explicite</strong> via le bandeau cookies ; un refus est respecté et aucune requête de suivi n'est envoyée.</li>
</ul>
<p>Nous n'utilisons ces statistiques que pour comprendre quelles émissions et chroniques vous intéressent, et pour détecter les erreurs techniques.</p>`,
      },
      {
        title: "Analytics et publicité",
        html: `<p>Indi Radio ne diffuse <strong>aucune publicité</strong> dans l'application et ne revend aucune donnée personnelle à des tiers.</p>
<p>La seule mesure d'audience utilisée est Plausible, décrite ci-dessus. Toute évolution sera signalée sur cette page.</p>`,
      },
      {
        title: "Hébergement et sous-traitants",
        html: `<p>L'application est hébergée sur une infrastructure cloud européenne. Les données sont stockées via notre backend sécurisé et chiffrées en transit (HTTPS/TLS).</p>
<p>Les sous-traitants techniques sont limités à l'hébergement, l'authentification, la mesure d'audience (Plausible) et l'envoi d'emails transactionnels. Chacun est soumis à des obligations de confidentialité et de sécurité.</p>`,
      },
      {
        title: "Conservation des données",
        html: `<p>Les données sont conservées aussi longtemps que nécessaire au fonctionnement du service ou jusqu'à la suppression du compte par l'utilisateur.</p>
<p>Les contenus publics restent visibles tant qu'ils ne sont pas supprimés par leur auteur ou modérés. Les données de session inactives peuvent être anonymisées après une période prolongée d'inactivité.</p>`,
      },
      {
        title: "Vos droits",
        html: `<p>Vous disposez des droits suivants : accès, rectification, effacement, limitation du traitement, portabilité et opposition.</p>
<p>Pour exercer ces droits ou poser une question : ${MAIL}</p>
<p>Vous pouvez également supprimer votre compte depuis votre profil. Cette action supprime vos données personnelles identifiables ; les contenus publics publiés peuvent être supprimés sur demande.</p>`,
      },
      {
        title: "Sécurité",
        html: `<p>Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données : chiffrement en transit, authentification sécurisée, contrôles d'accès et modération communautaire.</p>
<p>Aucune mesure n'est infaillible. En cas d'incident affectant vos données, nous vous informerons dans les meilleurs délais.</p>`,
      },
      {
        title: "Modifications de cette politique",
        html: `<p>Cette politique peut être mise à jour lors de l'évolution de l'application ou des réglementations. La date de dernière mise à jour figure en haut de page.</p>`,
      },
      {
        title: "Contact",
        html: `<p>Pour toute question concernant cette politique ou vos données personnelles :</p><p>${MAIL}<br/>Téléphone : +33 4 81 09 51 52</p>`,
      },
    ],
  },
  en: {
    heading: "Privacy Policy",
    intro: {
      title: "",
      html: `<p class="text-muted-foreground">This page is maintained by <strong>${PARENT}</strong> and answers privacy and data-protection questions about the Indi Radio app and website.</p>
<p>Last updated: <strong>10 August 2026</strong>.</p>`,
    },
    sections: [
      {
        title: "Who are we?",
        html: `<p><strong>Indi Radio</strong> is the online radio of <strong>${PARENT}</strong>. The app and website are published by the mission-driven company "Whisper and Map", founded by Alexandra Debon (Melody Alex. Patrick).</p>
<p>Data controller: <strong>Alexandra Debon</strong>.<br/>Contact: ${MAIL}<br/>Website: ${SITE}</p>`,
      },
      {
        title: "Data we collect",
        html: `<p>We only collect the data required to run the app and its community features.</p>
<ul class="list-disc space-y-1 pl-5">
<li><strong>User account:</strong> email address, hashed password, display name / handle, unique identifier.</li>
<li><strong>Public profile:</strong> handle, avatar, bio, badges, level and presence points.</li>
<li><strong>User-generated content:</strong> comments, replies, likes, votes, star ratings, reports, dedications and messages sent through our forms.</li>
<li><strong>Presence and listening:</strong> daily sign-in history used for points and levels (no detailed track-by-track listening history).</li>
<li><strong>Technical data:</strong> device type, operating system, browser and IP address at sign-in, used for security and service reliability.</li>
</ul>
<p><strong>Live listening:</strong> no account is required to listen to the radio.</p>`,
      },
      {
        title: "Why we use this data",
        html: `<ul class="list-disc space-y-1 pl-5">
<li>Authenticate users and secure accounts.</li>
<li>Enable community interactions (comments, likes, votes, replies).</li>
<li>Send the notifications you opted into (mentions, replies, likes).</li>
<li>Handle dedications and artist submissions.</li>
<li>Moderate content and process reports.</li>
<li>Improve app stability and security.</li>
</ul>
<p>Processing is based on performance of the service contract, our legitimate interest in moderation and, where applicable, your explicit consent.</p>`,
      },
      {
        title: "Notifications and marketing",
        html: `<p>Push and email notifications are sent <strong>only</strong> according to the preferences enabled in your profile: mentions, thread replies, replies to your messages, likes.</p>
<p>You can change these preferences at any time in the "Notifications" section of your profile. No marketing email is sent without prior consent.</p>`,
      },
      {
        title: "Cookies and local storage",
        html: `<p>The app uses cookies and local storage to:</p>
<ul class="list-disc space-y-1 pl-5">
<li>Keep your sign-in session secure.</li>
<li>Remember your preferences (playback, notifications, language).</li>
<li>Support the technical behaviour of the interface (player state, etc.).</li>
</ul>
<p>No advertising cookie and no behavioural advertising tracker is used.</p>`,
      },
      {
        title: "Ethical analytics: Plausible",
        html: `<p>We chose <strong>Plausible Analytics</strong>, an <strong>ethical, open-source and privacy-friendly</strong> analytics tool, instead of Google Analytics.</p>
<ul class="list-disc space-y-1 pl-5">
<li><strong>No advertising cookies</strong> and no persistent identifier: no browser fingerprinting.</li>
<li><strong>No personal data</strong> collected: statistics are aggregated and anonymous (page views, referrer, device type).</li>
<li><strong>No cross-site tracking</strong>, no ad profiling, no data resale.</li>
<li><strong>Hosted in Europe</strong> and compliant with GDPR, ePrivacy and CCPA.</li>
<li>Analytics only start <strong>after your explicit consent</strong> through the cookie banner; if you decline, no tracking request is ever sent.</li>
</ul>
<p>We use these statistics only to understand which shows and reviews interest you, and to detect technical errors.</p>`,
      },
      {
        title: "Analytics and advertising",
        html: `<p>Indi Radio shows <strong>no advertising</strong> in the app and never sells personal data to third parties.</p>
<p>Plausible, described above, is the only analytics tool in use. Any change will be reported on this page.</p>`,
      },
      {
        title: "Hosting and processors",
        html: `<p>The app runs on European cloud infrastructure. Data is stored in our secured backend and encrypted in transit (HTTPS/TLS).</p>
<p>Technical processors are limited to hosting, authentication, analytics (Plausible) and transactional email delivery. Each is bound by confidentiality and security obligations.</p>`,
      },
      {
        title: "Data retention",
        html: `<p>Data is kept as long as necessary to operate the service, or until you delete your account.</p>
<p>Public content stays visible until removed by its author or by moderation. Inactive session data may be anonymised after a long period of inactivity.</p>`,
      },
      {
        title: "Your rights",
        html: `<p>You have the right to access, rectify, erase, restrict, port and object to the processing of your personal data.</p>
<p>To exercise these rights or ask a privacy question: ${MAIL}</p>
<p>You can also delete your account from your profile. This removes your identifiable personal data; public content you posted can be deleted on request.</p>`,
      },
      {
        title: "Security",
        html: `<p>We apply technical and organisational safeguards: encryption in transit, secure authentication, access-control policies and community moderation.</p>
<p>No safeguard is infallible. Should an incident affect your data, we will inform you as quickly as possible.</p>`,
      },
      {
        title: "Changes to this policy",
        html: `<p>This policy may be updated as the app or regulations evolve. The last update date is shown at the top of the page.</p>`,
      },
      {
        title: "Contact",
        html: `<p>For any question about this policy or your personal data:</p><p>${MAIL}<br/>Phone: +33 4 81 09 51 52</p>`,
      },
    ],
  },
};

export const TERMS: Record<"fr" | "en", LegalPage> = {
  fr: {
    heading: "Conditions d'utilisation",
    intro: {
      title: "",
      html: `<p class="text-muted-foreground">Version applicable depuis le <strong>19 juillet 2026</strong>. Éditeur : <strong>${PARENT}</strong> — Whisper and Map. Contact : ${MAIL}.</p>
<p>En téléchargeant, installant ou utilisant l'application <strong>Indi Radio</strong> (ci-après « l'App ») ou le site ${SITE}, vous acceptez sans réserve les présentes Conditions Générales d'Utilisation (CGU). Si vous n'acceptez pas ces conditions, vous devez cesser toute utilisation.</p>`,
    },
    sections: [
      {
        title: "1. Service",
        html: `<p>Indi Radio propose : écoute d'une radio en direct 100 % musique indépendante, podcasts, chroniques d'albums, clips vidéo, magazine culturel, dédicaces à l'antenne, mur social communautaire (commentaires, likes, réponses), notifications personnalisables.</p>
<p>L'accès à la lecture radio et à la majorité des contenus est <strong>gratuit et sans publicité</strong>. La création de contenu (commentaire, note, dédicace, soumission artiste) requiert un compte.</p>`,
      },
      {
        title: "2. Compte utilisateur",
        html: `<p>La création d'un compte est réservée aux personnes de <strong>13 ans et plus</strong>. Les mineurs doivent obtenir l'accord de leur représentant légal. L'utilisateur garantit l'exactitude des informations fournies et la sécurité de son mot de passe.</p>
<p>L'utilisateur peut à tout moment supprimer son compte depuis <strong>Profil → Zone dangereuse</strong>. Cette action est irréversible et efface l'ensemble des données personnelles associées.</p>`,
      },
      {
        title: "3. Règles de contenu — tolérance zéro",
        html: `<p>Indi Radio applique une politique de <strong>tolérance zéro</strong> envers tout contenu ou comportement abusif. Sont strictement interdits, sans limitation :</p>
<ul class="ml-5 list-disc space-y-1">
<li>Contenus haineux, racistes, sexistes, homophobes, transphobes, discriminatoires</li>
<li>Harcèlement, menaces, intimidation, doxxing, incitation à la violence</li>
<li>Contenus sexuels explicites, nudité, pédopornographie</li>
<li>Contenus illégaux, apologie du terrorisme, désinformation dangereuse</li>
<li>Spam, publicité non autorisée, arnaques, contenus trompeurs</li>
<li>Usurpation d'identité, contrefaçon, violation de droits d'auteur</li>
<li>Toute violation des droits d'un tiers</li>
</ul>
<p>Ces règles s'appliquent à <strong>tous les contenus générés par les utilisateurs</strong> : commentaires, réponses, dédicaces, pseudo, photo de profil, soumissions.</p>`,
      },
      {
        title: "4. Modération",
        html: `<p>Chaque commentaire dispose d'un bouton <strong>Signaler</strong>. Les signalements sont traités par notre équipe sous <strong>24 heures</strong>. Un contenu jugé contraire aux présentes CGU est retiré immédiatement.</p>
<p>L'éditeur se réserve le droit, sans préavis, de : (a) supprimer un contenu, (b) mettre en quarantaine un utilisateur, (c) <strong>bannir définitivement</strong> un utilisateur abusif, (d) transmettre les éléments aux autorités compétentes.</p>`,
      },
      {
        title: "5. Propriété intellectuelle",
        html: `<p>L'ensemble des éléments de l'App (logos, chartes, textes éditoriaux, jingles) sont la propriété d'InDi ArT CulTuRe / Whisper and Map. Les œuvres musicales diffusées restent la propriété de leurs ayants droit ; leur diffusion est déclarée à la <strong>SACEM</strong>.</p>
<p>En publiant un contenu, vous accordez à Indi Radio une licence non exclusive, mondiale et gratuite d'utilisation dans le cadre strict du service et de sa promotion.</p>`,
      },
      {
        title: "6. Suspension & résiliation",
        html: `<p>L'éditeur peut suspendre ou résilier l'accès de tout compte contrevenant aux présentes CGU, sans indemnité. L'utilisateur peut résilier son compte à tout moment depuis son profil.</p>`,
      },
      {
        title: "7. Responsabilité",
        html: `<p>Indi Radio est fournie « en l'état ». L'éditeur met en œuvre les moyens raisonnables pour garantir la disponibilité du service mais ne saurait garantir une continuité absolue.</p>
<p>L'éditeur ne peut être tenu responsable des contenus publiés par les utilisateurs. Toute réclamation peut être adressée à ${MAIL}.</p>`,
      },
      {
        title: "8. Loi applicable",
        html: `<p>Les présentes CGU sont soumises au droit français. Tout litige non résolu à l'amiable relève de la compétence des tribunaux français.</p>`,
      },
      {
        title: "9. Contact",
        html: `<p>Toute question relative aux présentes conditions : ${MAIL} — Téléphone : +33 4 81 09 51 52.</p>`,
      },
    ],
  },
  en: {
    heading: "Terms of Use",
    intro: {
      title: "",
      html: `<p class="text-muted-foreground">Version in force since <strong>19 July 2026</strong>. Publisher: <strong>${PARENT}</strong> — Whisper and Map. Contact: ${MAIL}.</p>
<p>By downloading, installing or using the <strong>Indi Radio</strong> app (the "App") or the website ${SITE}, you fully accept these Terms of Use. If you do not accept them, you must stop using the service.</p>`,
    },
    sections: [
      {
        title: "1. Service",
        html: `<p>Indi Radio offers: a live radio stream of 100% independent music, podcasts, album reviews, music videos, a cultural magazine, on-air dedications, a community social wall (comments, likes, replies) and customisable notifications.</p>
<p>Listening to the radio and most content is <strong>free and ad-free</strong>. Creating content (comment, rating, dedication, artist submission) requires an account.</p>`,
      },
      {
        title: "2. User account",
        html: `<p>Accounts are reserved for people aged <strong>13 and over</strong>. Minors must obtain their legal guardian's consent. Users warrant the accuracy of the information provided and the security of their password.</p>
<p>You may delete your account at any time from <strong>Profile → Danger zone</strong>. This is irreversible and erases all associated personal data, in line with the Privacy Policy.</p>`,
      },
      {
        title: "3. Content rules — zero tolerance",
        html: `<p>Indi Radio enforces a <strong>zero-tolerance</strong> policy against abusive content or behaviour. The following are strictly prohibited, without limitation:</p>
<ul class="ml-5 list-disc space-y-1">
<li>Hateful, racist, sexist, homophobic, transphobic or discriminatory content</li>
<li>Harassment, threats, intimidation, doxxing, incitement to violence</li>
<li>Sexually explicit content, nudity, child sexual abuse material</li>
<li>Illegal content, glorification of terrorism, dangerous misinformation</li>
<li>Spam, unauthorised advertising, scams, misleading content</li>
<li>Impersonation, counterfeiting, copyright infringement</li>
<li>Any infringement of third-party rights</li>
</ul>
<p>These rules apply to <strong>all user-generated content</strong>: comments, replies, dedications, handles, profile pictures and submissions.</p>`,
      },
      {
        title: "4. Moderation",
        html: `<p>Every comment has a <strong>Report</strong> button. Reports are handled by our team within <strong>24 hours</strong>. Content that breaches these Terms is removed immediately.</p>
<p>The publisher may, without notice: (a) delete content, (b) quarantine a user, (c) <strong>permanently ban</strong> an abusive user, (d) pass evidence to the competent authorities.</p>`,
      },
      {
        title: "5. Intellectual property",
        html: `<p>All elements of the App (logos, brand assets, editorial texts, jingles) belong to InDi ArT CulTuRe / Whisper and Map. Broadcast musical works remain the property of their rights holders; broadcasting is declared to <strong>SACEM</strong> as required.</p>
<p>By publishing content, you grant Indi Radio a non-exclusive, worldwide, royalty-free licence to use it strictly within the service and its promotion.</p>`,
      },
      {
        title: "6. Suspension & termination",
        html: `<p>The publisher may suspend or terminate access for any account breaching these Terms, without compensation. Users may close their account at any time from their profile.</p>`,
      },
      {
        title: "7. Liability",
        html: `<p>Indi Radio is provided "as is". The publisher takes reasonable steps to keep the service available but cannot guarantee uninterrupted continuity (maintenance, network incidents, third-party outages).</p>
<p>The publisher is not liable for content published by users. Any claim may be sent to ${MAIL}.</p>`,
      },
      {
        title: "8. Governing law",
        html: `<p>These Terms are governed by French law. Any dispute not settled amicably falls under the jurisdiction of the French courts.</p>`,
      },
      {
        title: "9. Contact",
        html: `<p>Any question regarding these Terms: ${MAIL} — Phone: +33 4 81 09 51 52.</p>`,
      },
    ],
  },
};
