const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
const MODEL_PATH = path.join(ROOT, 'models', 'offre.model.js');
const MIGRATIONS_DIR = path.join(ROOT, 'migrations');

const BASE_COLUMNS = new Set([
  'id',
  'titre',
  'description',
  'localisation',
  'salaire',
  'date_limite',
  'date_creation',
]);

const readMigrations = () =>
  fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => ({
      file,
      sql: fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'),
    }));

test('les colonnes photo du modele Offre sont couvertes par une migration', () => {
  const model = fs.readFileSync(MODEL_PATH, 'utf8');
  const migrations = readMigrations().map((migration) => migration.sql).join('\n');

  assert.match(model, /photo_data/);
  assert.match(model, /photo_type/);
  assert.match(
    migrations,
    /ALTER TABLE offres\s+ADD COLUMN IF NOT EXISTS photo_data BYTEA/i
  );
  assert.match(
    migrations,
    /ALTER TABLE offres\s+ADD COLUMN IF NOT EXISTS photo_type VARCHAR\(64\)/i
  );
});

test('toutes les colonnes inserees par Offre.create sont couvertes', () => {
  const model = fs.readFileSync(MODEL_PATH, 'utf8');
  const migrations = readMigrations().map((migration) => migration.sql).join('\n');
  const match = model.match(/INSERT INTO offres \(([\s\S]*?)\)\s*VALUES/i);

  assert.ok(match, 'INSERT INTO offres introuvable dans le modele');

  const columns = match[1]
    .split(',')
    .map((column) => column.trim())
    .filter(Boolean);

  for (const column of columns) {
    if (BASE_COLUMNS.has(column)) continue;
    assert.match(
      migrations,
      new RegExp(`\\b${column}\\b`),
      `la colonne "${column}" est utilisee par le modele mais absente des migrations`
    );
  }
});

test('les operations additives des migrations sont idempotentes', () => {
  for (const { file, sql } of readMigrations()) {
    for (const line of sql.split('\n')) {
      if (/^\s*ALTER TABLE .*\bADD COLUMN\b/i.test(line)) {
        assert.match(line, /\bIF NOT EXISTS\b/i, `${file} : ${line.trim()}`);
      }
      if (/^\s*CREATE TABLE\b/i.test(line)) {
        assert.match(line, /\bIF NOT EXISTS\b/i, `${file} : ${line.trim()}`);
      }
      if (/^\s*CREATE (UNIQUE )?INDEX\b/i.test(line)) {
        assert.match(line, /\bIF NOT EXISTS\b/i, `${file} : ${line.trim()}`);
      }
    }
  }
});
