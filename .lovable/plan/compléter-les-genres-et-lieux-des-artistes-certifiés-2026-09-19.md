# Compléter les genres et lieux des artistes certifiés

## Principe retenu

Utiliser uniquement les informations explicitement présentes dans les fiches actuelles. Aucun genre musical ni lieu ne sera inventé ou recherché ailleurs.

## Mise à jour prévue

- **Jeune Senior Weekend** : `Indie rock` ; lieu `Sud de la France · Catalogne`.
- **Olivier Raffin / Lomnouvo** : `Folk`, `Rock` ; aucun lieu renseigné.
- **DJ Housefarben** : `Dance` ; aucun lieu renseigné.
- **Sad Boy on The Moon / Laurent Oleff** : `Musique à l’image`, `Soul` ; aucun lieu renseigné.
- **Simon Ferrante** : `Chanson française` ; aucun lieu renseigné.
- **Talenkoprod** : reprendre uniquement les styles explicitement cités dans sa présentation, après lecture complète de celle-ci.
- **Aude Lp** : ne retenir un genre que si le texte complet le nomme clairement ; « Good Vibes » ne sera pas transformé arbitrairement en genre musical.
- **bESS, DrëNalinZ, Jess RABEL et Jovanna** : conserver les champs vides lorsqu’aucun genre musical ou lieu n’est indiqué. Les activités visuelles de Jovanna ne seront pas enregistrées comme genres musicaux.

## Application

1. Relire intégralement les présentations concernées pour éviter toute interprétation abusive.
2. Mettre à jour les champs `artist_genres` et `artist_location` des profils certifiés concernés, sans modifier leurs biographies.
3. Ne pas écraser une valeur déjà renseignée entre-temps par un artiste.
4. Vérifier la liste `/admin/artistes` et plusieurs pages `/u/:pseudo` en français et en anglais.
5. Contrôler que les genres et lieux confirmés apparaissent dans les descriptions et données destinées à Google, tandis que les informations inconnues restent absentes.

## Détails techniques

Il s’agit uniquement d’une mise à jour des données existantes : aucune nouvelle colonne, migration ou modification d’interface n’est nécessaire. Les textes anglais des pages continueront d’utiliser le mécanisme de traduction déjà en place.
