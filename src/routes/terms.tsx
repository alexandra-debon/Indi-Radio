import { createFileRoute } from "@tanstack/react-router";
import { RADIO_CONFIG } from "@/config/radio";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Conditions d'utilisation — Indi Radio" },
      {
        name: "description",
        content:
          "Conditions générales d'utilisation d'Indi Radio : compte, contenus, modération, tolérance zéro pour tout contenu abusif.",
      },
      { property: "og:title", content: "Conditions d'utilisation — Indi Radio" },
      {
        property: "og:description",
        content:
          "CGU d'Indi Radio : règles d'utilisation, modération, tolérance zéro pour tout contenu abusif ou utilisateur abusif.",
      },
      { property: "og:url", content: "https://radio.indi-art-culture.com/terms" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://radio.indi-art-culture.com/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="section-title">Conditions d'utilisation</h1>
        <div className="card-brut space-y-4 p-4 text-sm leading-relaxed">
          <p className="text-muted-foreground">
            Version applicable depuis le <strong>19 juillet 2026</strong>. Éditeur :{" "}
            <strong>{RADIO_CONFIG.parentStructure}</strong> — Whisper and Map. Contact :{" "}
            <a className="underline" href="mailto:radio@indi-art-culture.com">
              radio@indi-art-culture.com
            </a>
            .
          </p>
          <p>
            En téléchargeant, installant ou utilisant l'application <strong>Indi Radio</strong> (ci-après
            « l'App ») ou le site <a className="underline" href="https://radio.indi-art-culture.com">radio.indi-art-culture.com</a>,
            vous acceptez sans réserve les présentes Conditions Générales d'Utilisation (CGU). Si vous
            n'acceptez pas ces conditions, vous devez cesser toute utilisation.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">1. Service</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            Indi Radio propose : écoute d'une radio en direct 100 % musique indépendante, podcasts,
            chroniques d'albums, clips vidéo, magazine culturel, dédicaces à l'antenne, mur social
            communautaire (commentaires, likes, réponses), notifications personnalisables.
          </p>
          <p>
            L'accès à la lecture radio et à la majorité des contenus est <strong>gratuit et sans
            publicité</strong>. La création de contenu (commentaire, note, dédicace, soumission
            artiste) requiert un compte.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">2. Compte utilisateur</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            La création d'un compte est réservée aux personnes de <strong>13 ans et plus</strong>.
            Les mineurs doivent obtenir l'accord de leur représentant légal. L'utilisateur garantit
            l'exactitude des informations fournies et la sécurité de son mot de passe.
          </p>
          <p>
            L'utilisateur peut à tout moment supprimer son compte depuis <strong>Profil → Zone
            dangereuse</strong>. Cette action est irréversible et efface l'ensemble des données
            personnelles associées, conformément à la Politique de confidentialité.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">3. Règles de contenu — tolérance zéro</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            Indi Radio applique une politique de <strong>tolérance zéro</strong> envers tout contenu
            ou comportement abusif. Sont strictement interdits, sans limitation :
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Contenus haineux, racistes, sexistes, homophobes, transphobes, discriminatoires</li>
            <li>Harcèlement, menaces, intimidation, doxxing, incitation à la violence</li>
            <li>Contenus sexuels explicites, nudité, pédopornographie</li>
            <li>Contenus illégaux, apologie du terrorisme, désinformation dangereuse</li>
            <li>Spam, publicité non autorisée, arnaques, contenus trompeurs</li>
            <li>Usurpation d'identité, contrefaçon, violation de droits d'auteur</li>
            <li>Toute violation des droits d'un tiers</li>
          </ul>
          <p>
            Ces règles s'appliquent à <strong>tous les contenus générés par les utilisateurs</strong> :
            commentaires, réponses, dédicaces, pseudo, photo de profil, soumissions.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">4. Modération</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            Chaque commentaire dispose d'un bouton <strong>Signaler</strong>. Les signalements sont
            traités par notre équipe sous <strong>24 heures</strong>. Un contenu jugé contraire aux
            présentes CGU est retiré immédiatement.
          </p>
          <p>
            L'éditeur se réserve le droit, sans préavis, de : (a) supprimer un contenu, (b) mettre en
            quarantaine un utilisateur, (c) <strong>bannir définitivement</strong> un utilisateur
            abusif, (d) transmettre les éléments aux autorités compétentes en cas d'infraction.
          </p>
          <p>
            Un utilisateur peut également bloquer un autre utilisateur (fonction à venir) et bloquer
            la réception de notifications émanant d'un tiers.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">5. Propriété intellectuelle</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            L'ensemble des éléments de l'App (logos, chartes, textes éditoriaux, jingles) sont la
            propriété d'InDi ArT CulTuRe / Whisper and Map. Les œuvres musicales diffusées restent la
            propriété de leurs ayants droit ; leur diffusion est déclarée à la <strong>SACEM</strong>{" "}
            comme il se doit.
          </p>
          <p>
            En publiant un contenu (commentaire, dédicace, soumission artiste, illustration), vous
            accordez à Indi Radio une licence non exclusive, mondiale et gratuite d'utilisation dans
            le cadre strict du service et de sa promotion.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">6. Suspension & résiliation</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            L'éditeur peut suspendre ou résilier l'accès de tout compte contrevenant aux présentes
            CGU, sans indemnité. L'utilisateur peut résilier son compte à tout moment depuis son
            profil.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">7. Responsabilité</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            Indi Radio est fournie « en l'état ». L'éditeur met en œuvre les moyens raisonnables pour
            garantir la disponibilité du service mais ne saurait garantir une continuité absolue
            (maintenance, incidents réseau, panne de fournisseur tiers).
          </p>
          <p>
            L'éditeur ne peut être tenu responsable des contenus publiés par les utilisateurs. Toute
            réclamation peut être adressée à{" "}
            <a className="underline" href="mailto:radio@indi-art-culture.com">
              radio@indi-art-culture.com
            </a>
            .
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">8. Loi applicable</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            Les présentes CGU sont soumises au droit français. Tout litige non résolu à l'amiable
            relève de la compétence des tribunaux français.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">9. Contact</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            Toute question relative aux présentes conditions :{" "}
            <a className="underline" href="mailto:radio@indi-art-culture.com">
              radio@indi-art-culture.com
            </a>{" "}
            — Téléphone : +33 4 81 09 51 52.
          </p>
        </div>
      </section>
    </div>
  );
}