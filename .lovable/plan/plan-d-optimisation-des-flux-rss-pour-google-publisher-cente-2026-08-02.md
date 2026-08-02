Plan d'optimisation des flux RSS pour Google Publisher Center et Apple News

Objectif : s'assurer que les flux RSS d'InDi RaDio sont conformes aux exigences de Google Publisher Center et Apple News, puis les optimiser pour maximiser l'acceptation.

Contexte actuel

- Le flux principal est https://radio.indi-art-culture.com/rss.xml
- Il agrège magazine, chroniques, coups de cœur, actus, clips, émissions et épisodes
- Les flux thématiques existent : rss-chroniques.xml, rss-actus.xml, rss-clips.xml, rss-magazine.xml, rss-coups-de-coeur.xml
- Les métadonnées Apple News ont déjà été intégrées (copyright, dc:publisher, content:encoded, media:content avec dimensions)

Étapes de réalisation

1. Validation technique des flux
   - Exécuter le test `bun run test:rss` pour vérifier la structure actuelle
   - Utiliser la page de test /rss-test pour inspecter les en-têtes et un échantillon d'items
   - Vérifier la validité du flux principal via le validateur RSS du W3C (si accessible) et le format RSS 2.0 strict

2. Vérification des exigences spécifiques Google / Apple
   - S'assurer que chaque item a un GUID stable et une URL canonique absolue
   - Vérifier que les images de preview sont accessibles publiquement sans authentification
   - S'assurer que les images respectent les dimensions minimales d'Apple News (1024 px recommandé en largeur)
   - Contrôler que les enclosures audio/vidéo ont des URL publiques avec MIME type et taille valides
   - Vérifier que les dates respectent le format RFC 822 et que les items sont triés antéchronologiquement

3. Corrections si nécessaire
   - Adapter le rendu de `content:encoded` pour Apple News (pas de scripts, pas d'iframes, balises sémantiques simples)
   - Ajouter des fallback pour les images manquantes avec des dimensions correctes
   - S'assurer que les balises `media:content` et `media:thumbnail` sont présentes pour chaque item avec image
   - Ajuster les titres et descriptions pour éviter les duplications entre les versions FR/EN si le flux est soumis à deux endroits

4. Tests et comparaison de non-régression
   - Lancer les tests RSS existants et le diff de régression (`bun run verify:rss-diff`)
   - Mettre à jour l'instantané de référence si les changements sont intentionnels

5. Documentation et remise des liens
   - Confirmer le flux principal à soumettre : https://radio.indi-art-culture.com/rss.xml
   - Fournir une fiche récapitulative avec les URL exactes, les formats acceptés et les prérequis remplis

Livrables

- Flux RSS validé et corrigé si besoin
- Documentation claire des liens à soumettre à Google et Apple
- Tests automatiques toujours au vert après les modifications

Décision à prendre

Souhaitez-vous que je commence par la validation des flux actuels, ou préférez-vous que j'optimise directement les métadonnées Apple/Google sans étape de diagnostic préalable ?
