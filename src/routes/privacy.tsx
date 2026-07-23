import { createFileRoute } from "@tanstack/react-router";
import { RADIO_CONFIG } from "@/config/radio";
import { IndiLinksBar } from "@/components/about/IndiLinksBar";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Radio musique indépendante InDi RaDio" },
      {
        name: "description",
        content:
          "Politique de confidentialité d'InDi RaDio, radio musique indépendante : données collectées, notifications, cookies et exercice des droits.",
      },
      { name: "keywords", content: "radio musique indépendante, politique confidentialité, données personnelles, InDi RaDio" },
      { property: "og:title", content: "Politique de confidentialité — Radio musique indépendante InDi RaDio" },
      {
        property: "og:description",
        content:
          "Politique de confidentialité d'InDi RaDio, radio musique indépendante : données collectées, notifications, cookies et exercice des droits.",
      },
      { property: "og:url", content: "https://radio.indi-art-culture.com/privacy" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://radio.indi-art-culture.com/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="space-y-6">
      <IndiLinksBar />

      <section className="space-y-3">
        <h1 className="section-title">Politique de confidentialité</h1>
        <div className="card-brut space-y-4 p-4 text-sm leading-relaxed">
          <p className="text-muted-foreground">
            Cette page est maintenue par <strong>{RADIO_CONFIG.parentStructure}</strong> pour répondre
            aux questions de confidentialité et de protection des données sur l'application et le
            site Indi Radio.
          </p>
          <p>
            Dernière mise à jour : <strong>19 juillet 2026</strong>.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">Qui sommes-nous ?</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            <strong>Indi Radio</strong> est la radio en ligne de{" "}
            <strong>{RADIO_CONFIG.parentStructure}</strong>. L'application et le site web sont
            édités par la société à mission « Whisper and Map », fondée par Alexandra Debon (Melody
            Alex. Patrick).
          </p>
          <p>
            Responsable du traitement : <strong>Alexandra Debon</strong>.
            <br />
            Contact :{" "}
            <a
              href="mailto:radio@indi-art-culture.com"
              className="font-semibold underline"
            >
              radio@indi-art-culture.com
            </a>
            <br />
            Site :{" "}
            <a
              href="https://radio.indi-art-culture.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              https://radio.indi-art-culture.com
            </a>
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">Données collectées</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            Nous collectons uniquement les données nécessaires au fonctionnement de l'application et
            au service communautaire.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Compte utilisateur :</strong> adresse email, mot de passe hashé, nom
              d'affichage / pseudo, identifiant unique.
            </li>
            <li>
              <strong>Profil public :</strong> pseudo, avatar, bio, badges, niveau et points de
              présence (visibles par les autres utilisateurs selon les paramètres choisis).
            </li>
            <li>
              <strong>Contenu généré :</strong> commentaires, réponses, likes, votes, notes
              (étoiles), signalements, dédicaces et messages envoyés via les formulaires de contact
              ou de soumission artiste.
            </li>
            <li>
              <strong>Présence et écoute :</strong> historique de connexion quotidienne utilisé pour
              les points de présence et les niveaux (pas d'historique détaillé des morceaux écoutés).
            </li>
            <li>
              <strong>Données techniques :</strong> type d'appareil, système d'exploitation, navigateur
              et adresse IP lors des connexions, utilisées pour la sécurité et le bon fonctionnement
              du service.
            </li>
          </ul>
          <p>
            <strong>Écoute en direct :</strong> aucun compte n'est requis pour écouter la radio. Vous
            pouvez utiliser l'application sans créer de profil.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">Pourquoi utilisons-nous ces données ?</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <ul className="list-disc space-y-1 pl-5">
            <li>Authentifier les utilisateurs et sécuriser les comptes.</li>
            <li>Permettre les interactions communautaires (commentaires, likes, votes, réponses).</li>
            <li>Envoyer les notifications choisies par l'utilisateur (mentions, réponses, likes).</li>
            <li>Gérer les dédicaces et les soumissions artistes.</li>
            <li>Assurer la modération et traiter les signalements.</li>
            <li>Améliorer la stabilité et la sécurité de l'application.</li>
          </ul>
          <p>
            Le traitement repose sur l'exécution du contrat de service, l'intérêt légitime de
            modération et, le cas échéant, le consentement explicite (notifications, email de contact).
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">Notifications et marketing</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            Les notifications push et email sont envoyées <strong>uniquement</strong> en fonction des
            préférences activées dans votre profil : mentions, réponses dans un fil, réponses à vos
            messages, likes.
          </p>
          <p>
            Vous pouvez modifier ces préférences à tout moment dans la section « Notifications » de
            votre profil. Aucun email marketing n'est envoyé sans consentement préalable.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">Cookies et stockage local</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            L'application utilise des cookies et le stockage local pour :{" "}
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Maintenir votre session de connexion de manière sécurisée.</li>
            <li>Mémoriser vos préférences (lecture, notifications, langue).</li>
            <li>Assurer le fonctionnement technique de l'interface (état du lecteur, etc.).</li>
          </ul>
          <p>
            Aucun cookie publicitaire ou de suivi comportemental à des fins publicitaires n'est utilisé.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">Analytics et publicité</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            Indi Radio ne diffuse <strong>aucune publicité</strong> dans l'application et ne revend
            aucune donnée personnelle à des tiers.
          </p>
          <p>
            Si des outils d'analytics anonymisés sont utilisés à l'avenir, ils le seront uniquement
            pour mesurer l'audience globale et les erreurs techniques, sans recoupement avec votre
            identité. Cette page sera mise à jour en conséquence.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">Hébergement et sous-traitants</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            L'application est hébergée sur une infrastructure cloud européenne. Les données sont
            stockées via notre backend sécurisé et chiffrées en transit (HTTPS/TLS).
          </p>
          <p>
            Les sous-traitants techniques utilisés sont limités à l'hébergement, l'authentification
            et l'envoi d'emails transactionnels. Chaque sous-traitant est soumis à des obligations de
            confidentialité et de sécurité.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">Conservation des données</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            Les données sont conservées aussi longtemps que nécessaire au fonctionnement du service
            ou jusqu'à la suppression du compte par l'utilisateur.
          </p>
          <p>
            Les contenus publics (commentaires, votes) restent visibles tant qu'ils ne sont pas
            supprimés par leur auteur ou modérés par l'administration. Les données de session
            inactives peuvent être anonymisées après une période prolongée d'inactivité.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">Vos droits</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            Vous disposez des droits suivants sur vos données personnelles : accès, rectification,
            effacement, limitation du traitement, portabilité et opposition.
          </p>
          <p>
            Pour exercer ces droits ou poser une question relative à la confidentialité, contactez-nous
            à :{" "}
            <a
              href="mailto:radio@indi-art-culture.com"
              className="font-semibold underline"
            >
              radio@indi-art-culture.com
            </a>
          </p>
          <p>
            Vous pouvez également supprimer votre compte depuis votre profil. Cette action supprime
            vos données personnelles identifiables ; les contenus publics que vous avez publiés
            peuvent être supprimés sur demande.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">Sécurité</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour
            protéger vos données : chiffrement en transit, authentification sécurisée, politiques de
            contrôle d'accès, et modération communautaire.
          </p>
          <p>
            Aucune mesure de sécurité n'est infaillible. En cas d'incident de sécurité affectant vos
            données, nous vous en informerons dans les meilleurs délais.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">Modifications de cette politique</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            Cette politique peut être mise à jour lors de l'évolution de l'application ou des
            réglementations. La date de dernière mise à jour est indiquée en haut de page. Nous vous
            invitons à la consulter régulièrement.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">Contact</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            Pour toute question concernant cette politique de confidentialité ou vos données
            personnelles :
          </p>
          <p>
            <a
              href="mailto:radio@indi-art-culture.com"
              className="font-semibold underline"
            >
              radio@indi-art-culture.com
            </a>
            <br />
            Téléphone : +33 4 81 09 51 52
          </p>
        </div>
      </section>
    </div>
  );
}
