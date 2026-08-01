# Dates des flux RSS : pubDate et lastBuildDate cohérents

## Le problème

Les agrégateurs (Feedly, Apple Podcasts, Inoreader…) décident qu'un article est « nouveau » à partir de sa date. Aujourd'hui trois points peuvent provoquer des doublons ou des remontées intempestives :

- **`Last-Modified` change à chaque requête** : l'en-tête HTTP est calculé avec l'heure courante, donc chaque appel du flux semble modifié, même quand rien n'a bougé.
- **Articles sans date** : quand un contenu n'a pas de date exploitable, l'item sort sans `pubDate` du tout ; certains lecteurs lui attribuent alors la date de récupération, ce qui le fait réapparaître comme neuf à chaque passage.
- **`lastBuildDate` absent** quand aucun item n'a de date, alors que la balise est attendue par la plupart des validateurs.

## Ce qui va être fait

1. **Une seule date canonique par contenu** : la date de publication d'origine (celle affichée sur la page du site) sert de `pubDate`, jamais la date de dernière modification. Les chroniques, actus, clips, émissions et épisodes utilisent tous la même règle, et les épisodes sans date de diffusion retombent sur leur date de création.
2. **`pubDate` toujours présent** : si un contenu n'a réellement aucune date, il reçoit une date stable dérivée de son identifiant plutôt qu'aucune date — le lecteur ne le verra plus jamais comme nouveau.
3. **`lastBuildDate` = date de l'item le plus récent du flux**, avec repli sur l'heure de génération uniquement si le flux est vide.
4. **`Last-Modified` HTTP aligné sur `lastBuildDate`** au lieu de l'heure courante, pour que les requêtes conditionnelles (304 Not Modified) fonctionnent réellement.
5. **Vérification finale** : appel des cinq flux (`/rss.xml`, `/rss-chroniques.xml`, `/rss-actus.xml`, `/rss-clips.xml`, `/podcast.xml`), contrôle que chaque `<item>` a bien un `pubDate` au format RFC 822, que `lastBuildDate` correspond au premier item, que les items sont triés du plus récent au plus ancien, et que deux appels successifs renvoient exactement les mêmes dates.

## Détails techniques

Tout se joue dans `src/lib/rss.ts` :

- `renderFeed` : `pubDate` obligatoire (repli déterministe), `lastBuildDate` calculé sur le max des dates d'items et exposé en valeur de retour via un petit objet `{ xml, lastBuild }` ou une fonction `feedLastBuild(items)` réutilisée par `feedResponse`.
- `feedResponse(request, body, lastBuild?)` : `Last-Modified` = `lastBuild` ; ETag inchangé (déjà dérivé du contenu) ; ajout du support `if-modified-since`.
- Les `load*` : sélection et mapping de la date canonique uniquement (`created_at` pour chroniques / actus / clips / émissions, `published_at ?? created_at` pour les épisodes) ; `updated_at` n'est plus sélectionné pour les chroniques puisqu'il n'est pas utilisé.
- Les cinq routes `src/routes/rss*.xml.ts` et `podcast.xml.ts` passent la valeur `lastBuild` à `feedResponse`.
- Les `guid` restent les URL canoniques déjà en place (identité stable côté agrégateur) — rien à changer.
