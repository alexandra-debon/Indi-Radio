## Objectif
Confirmer, via test réel, que le mur social se déploie sans connexion sur iOS Safari et sur le web desktop (le fix Android a déjà été appliqué : `WallCompact` appelle directement `onExpand`, sans passer par `requireAuth`).

## Vérifications à faire

1. **Audit code (déjà fait)** — aucun `requireAuth` sur les chemins de déploiement :
   - `WallCompact` : bouton flèche, "Voir tout", carte vide et cartes de posts → `onExpand` direct.
   - `SocialWallPanel` : `setExpanded(true)` sans garde ; seul `openPublish` demande l'auth.

2. **Test Playwright — Web desktop (Chromium)**
   - Contexte anonyme (aucune session Supabase injectée).
   - `goto http://localhost:8080/`, screenshot.
   - Cliquer la flèche `wall.expand`, screenshot → overlay visible avec `SocialWall`.
   - Cliquer "Retract", screenshot → retour au compact.

3. **Test Playwright — iOS Safari émulé**
   - Nouveau contexte avec `user_agent` iPhone + `viewport 393×852` + `is_mobile=True` + `has_touch=True`.
   - Même scénario : ouvrir la home anonyme, taper sur la flèche, vérifier l'overlay, refermer.
   - Vérifier aussi le tap sur une carte de post et sur "Voir tout".

4. **Contrôles supplémentaires**
   - Écouter la console : aucune erreur bloquante à l'expansion.
   - Vérifier qu'aucune `AuthDialog` ne s'ouvre lors du déploiement (uniquement au clic "Publier").

## Résultat attendu
- Screenshots iOS + desktop montrant l'overlay `SocialWall` ouvert en état déconnecté.
- Si un cas échoue, patch ciblé (probablement un `requireAuth` résiduel ou un gate lié au safe-area iOS).
