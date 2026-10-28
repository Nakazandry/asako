# ASAKO Backend

API REST Express pour la gestion des offres, candidatures et entretiens.

## Demarrage local

```bash
cp .env.example .env
npm install
npm run dev
```

## Migrations base de donnees

Les migrations SQL de `migrations/` s'appliquent avec:

```bash
npm run migrate
```

Le script utilise `DATABASE_URL`, execute chaque migration dans une transaction
et enregistre les fichiers appliques dans la table `schema_migrations`. Il est
sans danger de le relancer.

Sur Render, definir `npm run migrate` comme **Pre-Deploy Command** du service
backend (ou l'executer une fois depuis le Shell) pour que le schema soit a jour
avant le demarrage de l'API.

Variables importantes pour Render (Environment du service backend):

- `DATABASE_URL` (obligatoire, chaine Postgres/Neon avec `sslmode=require`)
- `NODE_ENV=production`
- `CLIENT_URL` / `CLIENT_ORIGINS` (URL du frontend Vercel)
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `FRONTEND_URL`

## Notifications e-mail (Resend)

Le backend envoie les e-mails via le SDK officiel `resend`. La cle API reste
exclusivement cote serveur et n'est jamais exposee au frontend.

Configuration locale:

1. Creer une cle API sur https://resend.com/api-keys.
2. Ajouter dans `backend/.env`:

```env
NODE_ENV=development
RESEND_API_KEY=re_votre_cle_reelle
EMAIL_FROM=ASAKO <onboarding@resend.dev>
FRONTEND_URL=http://localhost:5173
CLIENT_URL=http://localhost:5173
```

3. Redemarrer le backend (`npm run dev`). Au demarrage, la ligne
   `[email] env=... expediteur=... frontend=...` resume la configuration active
   (jamais la cle API).

### Comportement des variables

| Variable | Role | Defaut |
| --- | --- | --- |
| `RESEND_API_KEY` | Cle API Resend (serveur uniquement) | aucune, e-mails desactives |
| `EMAIL_FROM` | Expediteur des e-mails | `ASAKO <onboarding@resend.dev>` |
| `FRONTEND_URL` | Liens des e-mails | `http://localhost:5173` en dev, `https://asako-beta.vercel.app` en production |
| `CLIENT_URL` | Repli si `FRONTEND_URL` est absent (aussi utilise par CORS) | idem |
| `NODE_ENV` | Active les garde-fous de production | `development` |
| `EMAIL_DEMO_REDIRECT_ENABLED` | Active la redirection de demonstration | `false` |
| `EMAIL_DEMO_REDIRECT_TO` | Destinataire unique de la demonstration | vide |

Garde-fous:

- En production (`NODE_ENV=production`), une `FRONTEND_URL` vide ou pointant
  vers `localhost` est ignoree au profit de `https://asako-beta.vercel.app`:
  les liens des e-mails ne renvoient plus vers la machine du developpeur.
- Un `EMAIL_FROM` vide ou invalide retombe sur l'expediteur de secours avec un
  avertissement explicite dans les logs.
- Un `to` invalide (adresse absente ou malformee) annule l'envoi
  (`reason: invalid_recipient`) sans lever d'exception.
- Les erreurs Resend sont journalisees avec le message et le code HTTP, apres
  masquage de toute cle `re_...`.
- La deduplication (24 h) est en memoire: un redemarrage du service peut
  reenvoyer un e-mail deja parti, et deux instances Render ne partagent pas
  leur cache.

### Limite du mode test Resend

`onboarding@resend.dev` est un **domaine de test**: Resend n'accepte alors que
les envois vers l'adresse du compte Resend. Envoyer a `candidat@...` ou a
`admin@asako.com` renvoie une erreur `403` du type "You can only send testing
emails to your own email address".

Pour ecrire a de vrais destinataires, il faut:

1. Verifier un domaine dans https://resend.com/domains (enregistrements DNS
   SPF/DKIM fournis par Resend).
2. Renseigner `EMAIL_FROM` avec une adresse de ce domaine, par exemple
   `EMAIL_FROM="ASAKO <no-reply@votre-domaine.com>"`.

Tant qu'aucun domaine n'est verifie, la redirection de demonstration ci-dessous
permet de presenter les notifications sans domaine.

### Redirection de demonstration (soutenance)

```env
EMAIL_DEMO_REDIRECT_ENABLED=true
EMAIL_DEMO_REDIRECT_TO=nakazandryaaron@gmail.com
```

- Tous les e-mails (candidat **et** administrateurs) partent vers cette unique
  adresse; les objets et contenus restent ceux du destinataire reel.
- Les en-tetes `X-ASAKO-Demo-Redirect` et `X-ASAKO-Original-Recipient`
  conservent la trace du destinataire prevu (visible dans Resend > Emails).
- Aucun compte, identifiant ou mot de passe n'est modifie: `admin@asako.com`
  reste l'identifiant d'administration, seul le routage des e-mails change.
- Desactivee par defaut: il faut explicitement `EMAIL_DEMO_REDIRECT_ENABLED=true`.
  Si l'adresse cible est absente ou invalide, la redirection est ignoree
  (envoi vers les destinataires reels) et un avertissement est journalise.
- **A remettre a `false` a la fin de la demonstration.**

Les e-mails sont envoyes apres la reussite de l'operation metier. Si Resend est
indisponible, la candidature ou la modification d'entretien reste enregistree:
l'erreur est journalisee sans exposer de secret.

### Frontend (Vercel)

Une seule variable est necessaire:

```env
VITE_API_URL=https://asako-xipm.onrender.com/api
```

Aucune variable d'e-mail ni cle secrete ne doit etre configuree dans Vercel.

### Deploiement sur Render

1. Ajouter dans Environment du service backend: `DATABASE_URL`, `NODE_ENV=production`,
   `JWT_SECRET`, `JWT_EXPIRES_IN`, `RESEND_API_KEY`, `EMAIL_FROM`,
   `FRONTEND_URL=https://asako-beta.vercel.app`, `CLIENT_URL=https://asako-beta.vercel.app`.
2. Optionnel pendant la soutenance: `EMAIL_DEMO_REDIRECT_ENABLED=true` et
   `EMAIL_DEMO_REDIRECT_TO=nakazandryaaron@gmail.com`.
3. Redeployer le service (Manual Deploy > Deploy latest commit, ou push sur la
   branche suivie par Render).
4. Verifier `GET https://<service>.onrender.com/api/health`, lire la ligne
   `[email] env=production ...` dans les logs, puis tester un parcours reel
   (candidature, changement de statut, entretien).

Ne jamais committer la vraie valeur de `RESEND_API_KEY`.

Tests:

```bash
npm test
```

