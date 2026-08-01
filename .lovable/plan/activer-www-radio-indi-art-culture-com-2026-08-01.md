# Activer www.radio.indi-art-culture.com

## Diagnostic (vérifié)

- `radio.indi-art-culture.com` → enregistrement A vers `185.158.133.1` (hébergement Lovable) : OK.
- `www.radio.indi-art-culture.com` → **NXDOMAIN** : ce nom n'existe pas du tout dans la zone DNS Gandi.

`www.` devant un sous-domaine constitue un nom de domaine distinct. Il n'est jamais créé automatiquement : il faut un enregistrement DNS dédié **et** le déclarer dans les domaines du projet. Aucune modification de code n'est nécessaire — c'est une configuration DNS + domaines.

## Étapes à réaliser (par vous, je ne peux pas toucher au registrar)

### 1. Créer l'enregistrement DNS chez Gandi
Dans la zone DNS de `indi-art-culture.com`, ajouter :

```text
Type  : CNAME
Nom   : www.radio
Valeur: radio.indi-art-culture.com.      (le point final est important)
TTL   : 3600
```

Alternative équivalente si vous préférez un A :

```text
Type  : A
Nom   : www.radio
Valeur: 185.158.133.1
```

### 2. Déclarer le domaine dans Lovable
Paramètres du projet → section Project → Domains → **Connect Domain** → saisir `www.radio.indi-art-culture.com`.
Suivre les instructions affichées (un enregistrement TXT `_lovable` de vérification peut être demandé : l'ajouter chez Gandi).

### 3. Définir la redirection
Garder `radio.indi-art-culture.com` comme **Primary**. Une fois `www.radio...` en statut **Active**, il redirigera automatiquement vers le domaine primaire — pas de contenu dupliqué, pas d'impact SEO.

### 4. Attendre le SSL
Propagation DNS : de quelques minutes à 72 h. Le certificat HTTPS est émis automatiquement dès que la vérification passe (statut : Verifying → Setting up → Active).

## Vérification finale
Une fois le statut Active, je peux contrôler pour vous que :
- `https://www.radio.indi-art-culture.com` répond en 301 vers `https://radio.indi-art-culture.com`
- le certificat SSL couvre bien le nouveau nom
- le `canonical` reste sur le domaine primaire

## Note technique
Le code ne change pas : les balises `canonical`, le sitemap et les URLs Open Graph pointent déjà sur `https://radio.indi-art-culture.com`, ce qui est exactement le comportement voulu avec `www.radio` en simple redirection.
