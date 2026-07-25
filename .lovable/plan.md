## Plan : Ajouter un bouton de rétractation en bas du mur social déployé

### Contexte
La fenêtre du mur social déployée (`SocialWallPanel.tsx`) comporte déjà un bouton de rétractation en haut (sticky header) via `WallExpandHandle` avec `direction="up"`. L'utilisateur souhaite un **second bouton de rétractation en bas de la fenêtre**, juste au-dessus du bandeau de lecture (`MiniPlayer`), pour rendre la fermeture plus intuitive en fin de scroll.

### Étapes d'implémentation

1. **Inspecter et valider la structure**  
   - Vérifier `SocialWallPanel.tsx` : positionnement actuel de l'overlay, du sticky header et du conteneur de contenu.  
   - Vérifier `WallExpandHandle.tsx` : s'assurer qu'il peut être réutilisé en bas avec `direction="up"`.  
   - Vérifier `MiniPlayer.tsx` / `AppShell.tsx` : hauteur du lecteur en bas pour calculer la marge de sécurité (éviter que le bouton soit masqué).

2. **Ajouter le bouton de rétractation en bas**  
   - Dans l'overlay déployé (`overlayMounted`), ajouter un bloc sticky ou fixe en bas de l'écran, au-dessus du `MiniPlayer`.  
   - Utiliser `<WallExpandHandle direction="up" ... />` pour le bouton de rétractation, avec le label `t("wall.collapse")` existant.  
   - Centrer le bouton et lui donner le même style néobrutaliste (jaune, bordure noire, ombre) pour la cohérence visuelle.

3. **Gérer l'espacement et le scroll**  
   - Ajouter un `padding-bottom` suffisant au conteneur de posts (`max-w-3xl`) pour que le contenu ne soit pas caché par le nouveau bouton fixe.  
   - S'assurer que le bouton reste visible même quand l'utilisateur est en bas de la liste de posts.

4. **Accessibilité et mobile**  
   - Ajouter `aria-label` / `title` cohérents.  
   - Vérifier que le bouton ne gêne pas les gestes swipe existants sur mobile.  
   - S'assurer qu'il n'y a pas de double z-index conflictuel avec le lecteur audio.

5. **Vérification**  
   - Exécuter le build pour s'assurer qu'il n'y a pas d'erreur TypeScript.  
   - Prendre une capture du preview mobile pour valider le positionnement visuellement.

### Livrables attendus
- `src/components/wall/SocialWallPanel.tsx` modifié avec un second `WallExpandHandle` en bas de l'overlay.  
- Pas de modification fonctionnelle autre que l'ajout du bouton de fermeture.  
- Build et aperçu mobile validés.