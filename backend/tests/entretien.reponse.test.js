const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
const FRONTEND_SRC = path.join(ROOT, '..', 'frontend', 'src');
const MIGRATIONS_DIR = path.join(ROOT, 'migrations');

const readBackend = (...segments) => fs.readFileSync(path.join(ROOT, ...segments), 'utf8');
const readFrontend = (...segments) => fs.readFileSync(path.join(FRONTEND_SRC, ...segments), 'utf8');
const migrationsSql = () => fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'))
  .join('\n');

test('la migration ajoute reponse_candidat et date_reponse sans toucher au resultat', () => {
  const sql = migrationsSql();

  assert.match(
    sql,
    /ALTER TABLE entretiens ADD COLUMN IF NOT EXISTS reponse_candidat VARCHAR\(20\)( NOT NULL)? DEFAULT 'En attente'/i
  );
  assert.match(sql, /ALTER TABLE entretiens ADD COLUMN IF NOT EXISTS date_reponse TIMESTAMP/i);
  // Le resultat de l'entretien reste une colonne distincte et n'est pas modifie.
  assert.doesNotMatch(sql, /DROP COLUMN(\s+IF EXISTS)?\s+resultat/i);
  assert.doesNotMatch(sql, /ALTER COLUMN\s+resultat/i);
});

test('le modele enregistre la reponse de facon atomique sans toucher au resultat', () => {
  const model = readBackend('models', 'entretien.model.js');

  assert.match(model, /reponse_candidat/);
  assert.match(model, /date_reponse = NOW\(\)/);
  // La condition empeche les doubles soumissions et les courses concurrentes.
  assert.match(model, /WHERE id = \$1 AND reponse_candidat = 'En attente'/);
  assert.doesNotMatch(model, /resultat\s*=\s*\$2/);
});

test('la route de reponse est un PATCH reserve au role candidat', () => {
  const routes = readBackend('routes', 'entretien.routes.js');

  assert.match(routes, /router\.patch\('\/:id\/reponse',\s*authorize\('candidat'\),\s*controller\.repondreEntretien\)/);
  // Aucune mutation de la reponse via une route GET.
  assert.doesNotMatch(routes, /router\.get\('\/:id\/reponse'/);
});

test('le controlleur verifie la propriete de l entretien et le delai de reponse', () => {
  const controller = readBackend('controllers', 'entretien.controller.js');

  assert.match(controller, /existing\.utilisateur_id !== req\.user\.id/);
  assert.match(controller, /responseDeadlinePassed/);
  assert.match(controller, /setReponseCandidat/);
  assert.match(controller, /sendEntretienReponseCandidat/);
  assert.match(controller, /sendEntretienReponseRecruteur/);
});

test('l espace candidat affiche le statut et les actions accepter ou refuser', () => {
  const page = readFrontend('pages', 'MonEspace.jsx');

  assert.match(page, /reponse_candidat/);
  assert.match(page, /`\/entretiens\/\$\{item\.id\}\/reponse`/);
  assert.match(page, /Accepter/);
  assert.match(page, /Refuser/);
  assert.match(page, /ConfirmModal/);
});

test('la page de reponse issue de l e-mail est protegee et ne mute rien en GET', () => {
  const app = readFrontend('App.jsx');
  const page = readFrontend('pages', 'InvitationEntretien.jsx');

  assert.match(app, /path="\/invitations\/:id"/);
  assert.match(app, /Protected role="candidat"><InvitationEntretien/);
  assert.match(page, /api\.patch\(`\/entretiens\/\$\{id\}\/reponse`/);
  // La lecture de l'invitation se fait par GET, la decision uniquement par PATCH.
  assert.match(page, /api\.get\(`\/entretiens\/\$\{id\}`\)/);
});

test('le tableau recruteur distingue la reponse du candidat du resultat', () => {
  const page = readFrontend('pages', 'Entretiens.jsx');

  assert.match(page, /header: 'Reponse du candidat'/);
  assert.match(page, /header: 'Resultat'/);
  assert.match(page, /header: 'Reponse du candidat'[\s\S]*header: 'Resultat'/);
});
