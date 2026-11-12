# Biographie : une seule façon simple de la modifier

## Constat
- La biographie se modifie aujourd'hui à trois endroits différents (Mon profil, Modifier le profil, Espace artiste), avec des limites différentes : 500 caractères à deux endroits, 4 000 dans l'Espace artiste. Une longue bio d'artiste ne peut donc pas être modifiée depuis Mon profil.
- Sur la page publique de l'artiste, rien ne permet de modifier sa propre bio, même quand on est connecté.

## Ce qui change
1. **Sur sa page publique** : quand un artiste connecté regarde sa propre page, il voit un bouton bien visible « Modifier ma biographie » / « Edit my biography » sous la bio, ou « Écrire ma biographie » s'il n'en a pas encore.
2. **Modification sur place** : un clic ouvre une grande zone de texte directement sur la page, avec un compteur, et les boutons « Enregistrer » et « Annuler ». La nouvelle bio s'affiche tout de suite, sans changer de page.
3. **Même limite partout** : 4 000 caractères, que ce soit sur Mon profil, Modifier le profil ou l'Espace artiste. Plus de bio coupée ni bloquée.
4. **Mon profil** : le bouton « Modifier ma bio » existant passe aussi à 4 000 caractères et utilise le même éditeur.
5. Tous les textes sont en français et en anglais.

Les visiteurs et les autres membres ne voient jamais le bouton. Seul le propriétaire du profil peut enregistrer, grâce aux protections déjà en place.

## Détails techniques
- Nouveau composant partagé `BioEditor` (zone de texte + enregistrement `profiles.update({ bio })` sur l'id de l'utilisateur connecté, puis invalidation de la requête du profil).
- `u.$pseudo.index.tsx` : afficher le bloc bio aussi quand la bio est vide pour le propriétaire (`user?.id === profile.id`) et y monter `BioEditor`.
- Réutiliser `BioEditor` dans `profile.index.tsx`, passer `profile.edit.tsx` (schéma zod + maxLength) à 4 000.
- Clés i18n FR/EN ajoutées dans le dictionnaire.
- Vérification Playwright connectée : modifier puis relire la bio sur la page publique.
