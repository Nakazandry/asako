# ASAKO Backend

API REST Express pour la gestion des offres, candidatures et entretiens.

## Demarrage local

```bash
cp .env.example .env
npm install
npm run dev
```

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
RESEND_API_KEY=re_votre_cle_reelle
EMAIL_FROM=ASAKO <onboarding@resend.dev>
FRONTEND_URL=http://localhost:5173
```

3. Redemarrer le backend (`npm run dev`).

`onboarding@resend.dev` ne peut etre utilise que pour les tests autorises par
Resend et ne permet generalement pas d'ecrire a des candidats externes. Pour
envoyer de vrais e-mails aux candidats, verifier un domaine d'expedition dans
Resend puis utiliser une adresse de ce domaine dans `EMAIL_FROM`.

Les e-mails sont envoyes apres la reussite de l'operation metier. Si Resend est
indisponible, la candidature ou la modification d'entretien reste enregistree:
l'erreur est journalisee sans exposer de secret.

Frontend local:

```env
FRONTEND_URL=http://localhost:5173
```

Frontend Vercel:

```env
FRONTEND_URL=https://votre-frontend.vercel.app
```

Deploiement sur Render:

1. Ajouter `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL` et `CLIENT_URL` dans
   l'onglet Environment du service backend.
2. `FRONTEND_URL` et `CLIENT_URL` doivent pointer vers le frontend deploye
   (ex: `https://asako-beta.vercel.app`), sinon les liens des e-mails pointent
   vers localhost.
3. Redeployer le service (Manual Deploy > Deploy latest commit, ou push sur la
   branche suivie par Render).
4. Verifier `GET https://<service>.onrender.com/api/health` puis tester un
   parcours reel (candidature, changement de statut, entretien).

En production, verifier un domaine dans Resend (https://resend.com/domains),
ajouter les enregistrements DNS demandes, puis utiliser une adresse de ce
domaine dans `EMAIL_FROM`. Sans domaine verifie, `onboarding@resend.dev` ne
livre qu'a l'adresse du compte Resend.

Ne jamais committer la vraie valeur de `RESEND_API_KEY`.

Tests:

```bash
npm test
```
