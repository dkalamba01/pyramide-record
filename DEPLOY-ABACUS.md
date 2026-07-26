# Déployer le site Pyramide Record sur Abacus

Ce dossier (`abacus-deploy/`) est une version du site emballée dans un projet minimal
que **Abacus peut déployer** et servir à votre domaine.

Le site reste statique (HTML/CSS/JS dans `public/`). Le petit habillage Next.js sert
uniquement à le rendre déployable par Abacus.

---

## Ce que contient ce dossier

```
abacus-deploy/
├── package.json          ← dépendances (Next.js)
├── next.config.js        ← config : sert le site statique
├── pages/index.js        ← redirige la racine vers le site
└── public/               ← LE SITE ENTIER (toutes les pages, css, js, images)
    ├── index.html
    ├── pages/            (studio, services, blog, booking, etc.)
    ├── css/  js/  assets/
    ├── sitemap.xml  robots.txt  site.webmanifest
```

**Le site réel est dans `public/`.** C'est là que vous modifiez le contenu.

---

## Étapes de déploiement sur Abacus

### 1. Créer le projet dans Abacus
- Dans Abacus, créez une nouvelle application (type **Web App / Next.js**).
- Importez ce dossier `abacus-deploy` comme code source
  (glisser-déposer le zip, ou connecter un dépôt GitHub contenant ces fichiers).

### 2. Laisser Abacus installer et builder
- Abacus détecte `package.json` et lance `npm install` puis `npm run build`.
- Aucune base de données, aucune variable d'environnement n'est requise pour le site lui-même.

### 3. Déployer
- Lancez le déploiement. Abacus donne une URL temporaire (ex. `xxx.abacus.ai` ou similaire).
- Vérifiez que le site s'ouvre et que toutes les pages fonctionnent.

### 4. Connecter votre domaine
- Dans les réglages de déploiement Abacus, ajoutez votre **domaine personnalisé**.
- Abacus vous indiquera un enregistrement DNS à créer (généralement un **CNAME**
  pointant vers l'adresse d'Abacus, ou des serveurs de noms).
- Connectez-vous chez votre **registrar** (là où vous avez acheté le domaine) et créez
  cet enregistrement DNS.
- Attendez la propagation (quelques minutes à quelques heures).
- Le **SSL (https)** doit s'activer automatiquement — sinon, activez-le dans Abacus.

---

## Prompt Abacus (à adapter à votre workflow)

Vous rédigez vos prompts dans Claude avant Abacus — voici une base :

> « Déploie cette application Next.js qui sert un site statique depuis le dossier `public/`.
> Le site est en HTML/CSS/JS pur, sans base de données. Installe les dépendances,
> build avec `npm run build`, et déploie. Ensuite, connecte le domaine personnalisé
> [VOTRE-DOMAINE.com] avec SSL automatique. Ne modifie pas le contenu de `public/`. »

---

## Après le déploiement — à faire

1. **Formulaires** : les boutons WhatsApp fonctionnent déjà. Pour que les formulaires
   Contact / Réservation envoient un e-mail, ajoutez un service comme Formspree
   (quelques lignes dans le `<form>`), OU connectez la réservation à Iris (voir plus bas).

2. **Réservation — mode Medium (widget Iris intégré)** : voir la section suivante.

3. **Photos** : remplacez les 52 emplacements photo (voir `docs/01-image-shot-list.md`).

---

## Mode de réservation « Medium » (widget Iris intégré)

Le site est **déjà réglé en mode Medium** (`pages/booking.html`, variable `BOOKING.mode = 'medium'`).

En mode Medium, la page Réservation affiche le widget de réservation **d'Iris Financial**
dans une iframe — le visiteur ne quitte jamais pyramidrecord.com.

**Ce qu'il reste à faire côté Iris (via Abacus, projet séparé) :**
Iris doit exposer une **page de réservation intégrable** (embeddable) pour Pyramid —
une URL qui affiche le flux de réservation (calendrier, formulaire, acompte PawaPay)
dans une iframe, sans en-tête ni navigation Iris.

**Comment l'activer une fois qu'Iris est prêt :**
Dans `public/pages/booking.html`, remplacez la ligne :
```javascript
irisEmbedUrl: 'https://irisfinancial.tech/embed/pyramid-record'   // TODO
```
par la vraie URL d'intégration fournie par Iris. Le site basculera automatiquement
du formulaire de secours vers le widget Iris intégré.

**En attendant :** tant que cette URL n'est pas renseignée, la page affiche
automatiquement le formulaire de secours (repli gracieux) — la page n'est jamais cassée.

**Cahier des charges pour Abacus (côté Iris) — le widget embeddable :**
- Une route publique dans Iris, ex. `/embed/pyramid-record`
- Affiche : sélection du type de session, calendrier de disponibilités (privacy-safe),
  formulaire client, génération d'acompte via PawaPay (M-Pesa / Orange / Airtel)
- **Sans** l'en-tête / la navigation / le menu d'Iris (juste le widget, pour l'iframe)
- Autorise l'intégration en iframe depuis le domaine pyramidrecord.com
  (en-tête HTTP `X-Frame-Options` / `Content-Security-Policy: frame-ancestors` adaptés)
- Reçoit les paramètres passés dans l'URL (`?prenom=…&type=…`) pour pré-remplir

---

## Récapitulatif de l'ordre des opérations

1. ✅ Site prêt, réglé en mode Medium avec repli.
2. **Déployer ce dossier sur Abacus** + connecter le domaine.
3. **Construire le widget embeddable dans Iris** (via Abacus, projet séparé).
4. **Renseigner `irisEmbedUrl`** dans booking.html → le widget Iris s'affiche intégré.
5. Remplacer les photos et les textes placeholder.
