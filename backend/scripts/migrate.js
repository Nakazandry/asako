const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const LOCK_ID = 748201;

const stripTransactionControl = (sql) =>
  sql
    .replace(/^\s*BEGIN\s*;\s*$/gim, '')
    .replace(/^\s*COMMIT\s*;\s*$/gim, '');

const listMigrations = () =>
  fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

const migrate = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL manquante');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.filename));

    for (const file of listMigrations()) {
      if (applied.has(file)) {
        console.log(`[migrate] deja appliquee : ${file}`);
        continue;
      }

      const sql = stripTransactionControl(
        fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
      );

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[migrate] appliquee : ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log('[migrate] base a jour');
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    await client.end();
  }
};

migrate().catch((error) => {
  console.error(`[migrate] echec : ${error.message}`);
  process.exit(1);
});
