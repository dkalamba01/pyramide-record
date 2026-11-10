# Enregistrement automatique dans Google Drive (5 minutes)

À faire UNE FOIS, avec le compte Google qui possédera les documents.

1. Ouvrez https://script.google.com → **Nouveau projet**.
2. Effacez le code affiché, collez tout le contenu de `Code.gs`, puis **Enregistrer** (nom : « Pyramide Record sync »).
3. En haut, choisissez la fonction **setup** → **Exécuter**. Acceptez les autorisations Google (« Avancé » → « Accéder à… »).
   Cela crée le dossier Drive « Pyramide Record – Devis et factures » et le registre (Google Sheet).
4. **Déployer** → **Nouveau déploiement** → type **Application Web** :
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde** (la clé secrète protège l'accès)
   → **Déployer**, autorisez si demandé.
5. Choisissez la fonction **liaison** → **Exécuter** → ouvrez **Journal d'exécution** : copiez le long « CODE DE LIAISON ».
6. Dans le constructeur de devis : **Enregistrés** → **Liaison Drive** → collez le code. À faire sur chaque appareil de l'équipe.
7. Partagez le dossier Drive avec votre équipe (clic droit → Partager).

Ensuite, tout est automatique :
- Devis : `Devis/2026/DEV-2026-003_Davis.pdf` — un seul PDF par devis, remplacé à chaque enregistrement.
- Factures : `Factures/2026/FAC-2026-002_Davis_2026-11-10_14h19.pdf` — une nouvelle version datée à la création, au PDF et à l'envoi WhatsApp (seulement si la facture a changé). Jamais remplacée.
- Le registre (Google Sheet) garde une ligne par document, avec le lien vers le dernier PDF.

Mise à jour du script plus tard : collez le nouveau Code.gs, puis Déployer > Gérer les déploiements > Modifier > Nouvelle version (le code de liaison reste valable).

Désactiver sur un appareil : Liaison Drive → écrire 0.
Si la clé fuit : dans le script, supprimez la propriété SECRET (Paramètres du projet), relancez setup puis liaison, et redistribuez le nouveau code.
