const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'migrations');

const read = (...segments) => fs.readFileSync(path.join(ROOT, ...segments), 'utf8');
const migrationsSql = () =>
  fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'))
    .join('\n');

test('la migration conversations_ia respecte le schema demande', () => {
  const sql = migrationsSql();

  assert.match(sql, /CREATE TABLE IF NOT EXISTS conversations_ia/i);
  assert.match(sql, /id\s+SERIAL PRIMARY KEY/i);
  // utilisateurs.id est un INTEGER: la cle etrangere doit utiliser le meme type.
  assert.match(
    sql,
    /utilisateur_id\s+INTEGER NOT NULL REFERENCES utilisateurs\(id\) ON DELETE CASCADE/i
  );
  assert.match(sql, /titre\s+VARCHAR\(120\)/i);
  assert.match(sql, /messages\s+JSONB NOT NULL DEFAULT '\[\]'::jsonb/i);
  assert.match(sql, /date_creation\s+TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP/i);
  assert.match(sql, /date_modification\s+TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP/i);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS[^;]*utilisateur_id/i);
});

test('la migration est additive et ne touche aucune table existante', () => {
  const sql = read('migrations', '004_create_conversations_ia.sql');

  assert.doesNotMatch(sql, /\bDROP\s+(TABLE|COLUMN|CONSTRAINT)\b/i);
  assert.doesNotMatch(sql, /\bALTER\s+TABLE\b/i);
  assert.doesNotMatch(sql, /\bTRUNCATE\b|\bDELETE\s+FROM\b/i);
  assert.match(sql, /^BEGIN;[\s\S]*COMMIT;/m);
});

test('le modele filtre chaque acces par le proprietaire', () => {
  const model = read('models', 'conversation.model.js');

  assert.match(model, /WHERE utilisateur_id = \$1/);
  assert.match(model, /WHERE id = \$1 AND utilisateur_id = \$2/);
  // Chaque requete sur la table porte une condition de proprietaire.
  const requetes = model.match(/FROM conversations_ia/g) || [];
  const filtres = model.match(/WHERE (id = \$1 AND )?utilisateur_id = \$/g) || [];
  assert.equal(requetes.length, filtres.length);
});

test('toutes les routes du chatbot exigent JWT, role autorise et rate limiting', () => {
  const routes = read('routes', 'chatbot.routes.js');

  assert.match(routes, /router\.use\(protect, authorize\('candidat', 'admin'\), aiRateLimiter\)/);
  assert.match(routes, /router\.post\('\/conversations\/:id\/messages', aiChatRateLimiter, controller\.sendMessage\)/);
  assert.match(routes, /router\.post\('\/conversations'/);
  assert.match(routes, /router\.get\('\/conversations'/);
  assert.match(routes, /router\.get\('\/conversations\/:id'/);
  assert.match(routes, /router\.patch\('\/conversations\/:id'/);
  assert.match(routes, /router\.delete\('\/conversations\/:id'/);
  // Aucune route montee avant les middlewares de securite.
  const firstRoute = routes.search(/router\.(get|post|patch|delete)\(/);
  const security = routes.search(/router\.use\(protect/);
  assert.ok(security >= 0 && security < firstRoute);
});

test('le limiteur IA bloque les requetes au-dela du quota, par utilisateur', async () => {
  const { createAiRateLimiter } = require('../middleware/rate-limit.middleware');
  const limiter = createAiRateLimiter({ windowMs: 60000, limit: 2, message: 'quota atteint' });

  const run = (userId) =>
    new Promise((resolve) => {
      const req = {
        user: { id: userId },
        ip: '127.0.0.1',
        headers: {},
        app: { get: () => false },
      };
      const res = { statusCode: 200, setHeader: () => res };
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (payload) => {
        resolve({ next: false, status: res.statusCode, body: payload });
        return res;
      };
      limiter(req, res, () => resolve({ next: true, status: 200 }));
    });

  assert.deepEqual(await run(77), { next: true, status: 200 });
  assert.deepEqual(await run(77), { next: true, status: 200 });

  const bloque = await run(77);
  assert.equal(bloque.next, false);
  assert.equal(bloque.status, 429);
  assert.equal(bloque.body.message, 'quota atteint');

  // Un autre utilisateur dispose de son propre compteur.
  assert.deepEqual(await run(78), { next: true, status: 200 });
});

test('le controleur ne fait confiance qu au JWT pour le perimetre', () => {
  const controller = read('controllers', 'chatbot.controller.js');

  assert.match(controller, /utilisateurId: req\.user\.id/);
  assert.match(controller, /ConversationService\.findOwned\(id, req\.user\.id\)/);
  assert.match(controller, /ConversationService\.remove\(id, req\.user\.id\)/);
  assert.match(controller, /ConversationService\.rename\(id, req\.user\.id, titre\)/);
  assert.doesNotMatch(controller, /req\.body\.utilisateur_id/);
  assert.match(controller, /AI_ERROR_STATUS/);
});

test('le service Gemini ne lit la cle que cote serveur et ne journalise rien', () => {
  const gemini = read('services', 'gemini.service.js');

  assert.match(gemini, /process\.env\.GEMINI_API_KEY/);
  assert.doesNotMatch(gemini, /console\.(log|info|warn|error)\(/);
  assert.match(gemini, /maxOutputTokens/);
});

test('la cle Gemini reste hors du frontend et documentee dans .env.example', () => {
  const envExample = read('.env.example');

  assert.match(envExample, /^GEMINI_API_KEY=$/m);
  assert.doesNotMatch(envExample, /VITE_GEMINI/i);
  assert.match(envExample, /GEMINI_MODEL=gemini-2\.5-flash/);
  assert.match(envExample, /AI_CHAT_RATE_LIMIT_MAX=/);
});

test('le chatbot est monte dans l application avant les middlewares 404', () => {
  const app = read('src', 'app.js');

  assert.match(app, /app\.use\('\/api\/chatbot', chatbotRoutes\)/);
  assert.ok(
    app.indexOf("app.use('/api/chatbot'") < app.indexOf('app.use(notFound)'),
    'le montage du chatbot doit preceder notFound'
  );
});

test('l extraction de CV est bornee, validee et anonymisee', () => {
  const cv = read('services', 'cv.service.js');

  assert.match(cv, /%PDF-/);
  assert.match(cv, /AI_CV_MAX_BYTES/);
  assert.match(cv, /AI_CV_MAX_CHARS/);
  assert.match(cv, /redactPersonalData/);
  assert.match(cv, /UNREADABLE/);
});
