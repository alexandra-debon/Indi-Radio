# Préparer la soumission App Store / Google Play sans risque de rejet

Depuis la rédaction des documents de soumission, l'app a beaucoup évolué : boutique artistes avec liens d'achat externes, RéDaK'Village (articles écrits par la communauté), InDi TeeVi, magazines interactifs externes, bouton « Télécharger mon EP », pages artistes publiques, candidatures et certifications. Ces ajouts changent le profil de risque côté Apple et Google. Voici ce qu'il faut mettre à jour avant de soumettre.

## 1. Corriger les documents contradictoires (risque immédiat)

Les notes internes se contredisent et enverraient de mauvaises informations à la review :
- `STORE_SUBMISSION.md` affirme que le contenu web est embarqué dans l'app, alors que l'app charge en réalité le site en ligne.
- Les notes de review et la checklist citent l'ancienne adresse `radio.indi-art-culture.com`, alors que l'app pointe désormais sur `www.radio.indi-art-culture.com`.

Action : réécrire ces deux documents pour décrire exactement la configuration réelle et une seule adresse.

## 2. Boutique artistes — le point le plus sensible chez Apple

Les boutons « Acheter », « Pré-commander », « Acheter mon billet » ouvrent des liens de paiement extérieurs. Apple l'accepte pour des biens physiques (vinyles, CD, merch, billets de concert), mais refuse (règle 3.1.1) tout achat de contenu numérique consommé dans l'app (album en téléchargement, EP payant, contenu débloqué).

Actions :
- Règle écrite et affichée aux artistes : la boutique publique n'accepte que des biens physiques et des billets ; pas de fichier numérique payant.
- Ajouter une mention courte sur chaque fiche : « Vente réalisée par l'artiste sur son propre site » (déjà en partie couvert par le manifeste).
- Vérifier que le bouton « Télécharger mon EP » pointe bien vers un téléchargement gratuit, jamais vers une page de paiement.
- Préparer la réponse type à la review expliquant ce cadre.

## 3. Contenu écrit par les utilisateurs — exigences renforcées

RéDaK'Village, le mur, les commentaires, les profils artistes : Apple (règle 1.2) et Google exigent quatre choses visibles dans l'app, pas seulement côté équipe :
- signalement d'un contenu et d'un utilisateur — vérifier que c'est présent sur les articles RéDaK'Village et les fiches artistes, pas uniquement sur les commentaires ;
- blocage d'un autre utilisateur par l'utilisateur lui-même ;
- conditions d'utilisation acceptées à l'inscription, accessibles depuis l'app ;
- engagement de modération sous 24 h, à annoncer dans les fiches des deux stores.

Ce qui manque sera ajouté ; ce qui existe sera listé pour la review.

## 4. Confidentialité à remettre à jour

La page `/privacy` et les formulaires « App Privacy » (Apple) / « Sécurité des données » (Google) datent d'avant les nouveautés. Il faut y ajouter : photos et albums déposés, articles et brouillons, abonnements aux auteurs, clics sur les liens d'achat, badges et points, statistiques d'audience.

## 5. Contenus externes ouverts dans l'app

Les magazines interactifs (FlipHTML5), les lecteurs Spotify/SoundCloud/YouTube/Vimeo et les liens d'achat s'ouvrent depuis l'app. Il faut vérifier qu'ils s'affichent correctement dans l'application native et ne mènent jamais à un écran blanc ou bloqué — c'est un motif de rejet courant (règle 2.1).

## 6. Vérification sur appareil réel, puis dossier de soumission

- Parcours complet sur un iPhone et un Android réels : écoute avec écran verrouillé, connexion Apple et Google, publication d'un article, achat sortant, partage, suppression de compte.
- Captures d'écran à refaire : elles doivent montrer les nouveautés (mur, RéDaK'Village, InDi TeeVi, Boutique).
- Compte de test dédié à fournir aux deux équipes de review.
- Fiches FR/EN mises à jour, sans mentionner l'autre plateforme du côté Apple.

## Détails techniques

- `capacitor.config.ts` : `server.url = https://www.radio.indi-art-culture.com`, `limitsNavigationsToAppBoundDomains: true` côté iOS. Cette option bloque la navigation hors domaines déclarés : il faut ajouter `WKAppBoundDomains` dans `Info.plist` (domaine du site + domaine d'authentification) ou désactiver l'option, sinon les liens externes et le flux OAuth peuvent échouer en production. À trancher et documenter.
- Le flux radio passe par le proxy interne `/api/public/radio/stream` : aucune exception ATS nécessaire, à confirmer dans les notes de review.
- Version native : passer `versionName`/`versionCode` et `CFBundleShortVersionString` à `1.0.0` cohérents avant archive.
- Les documents mis à jour : `STORE_SUBMISSION.md`, `store/anti-rejection-checklist.md`, `store/listing-fr.md`, `store/listing-en.md`, `store/privacy-policy-fr.md`, `store/ios-info-plist-additions.md`.

## Ce que je ne peux pas faire à ta place

Comptes développeur, signature, archive Xcode, keystore Android, upload et remplissage des formulaires stores restent de ton côté : je prépare le code, les textes et les procédures exactes.
