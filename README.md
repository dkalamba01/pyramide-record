# Pyramide Record — Site web

Site vitrine du studio Pyramide Record (Kinshasa, RDC).
Site statique (HTML/CSS/JS) servi via un wrapper Next.js minimal, déployable sur Abacus.

## Structure
- `public/` — le site entier (toutes les pages, css, js, images)
- `pages/index.js` + `next.config.js` — habillage Next.js pour le déploiement
- `DEPLOY-ABACUS.md` — guide de déploiement complet

## Déploiement
Voir `DEPLOY-ABACUS.md`. En résumé : connecter ce dépôt à Abacus, laisser builder,
connecter le domaine personnalisé.

## Ne jamais committer
Tokens Iris, clés API, fichiers `.env`. Voir `.gitignore`.
