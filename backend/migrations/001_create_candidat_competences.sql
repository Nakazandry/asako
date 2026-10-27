-- Migration ASAKO: gestion des competences des candidats
-- Cible: PostgreSQL (local ou Neon)
-- Reference: utilisateurs(id)
--
-- Idempotente: peut etre rejouee sans casser l'existant.

BEGIN;

CREATE TABLE IF NOT EXISTS candidat_competences (
  id          SERIAL PRIMARY KEY,
  candidat_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  nom         VARCHAR(80) NOT NULL,
  niveau      INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT candidat_competences_niveau_check CHECK (niveau BETWEEN 0 AND 100),
  CONSTRAINT candidat_competences_nom_check CHECK (length(btrim(nom)) BETWEEN 1 AND 80)
);

-- Unicite d'une competence par candidat, insensible a la casse et aux espaces superflus.
-- Cet index composite couvre aussi les recherches par candidat_id (prefixe de l'index),
-- ce qui evite un second index redondant sur candidat_id.
CREATE UNIQUE INDEX IF NOT EXISTS candidat_competences_candidat_nom_unique
  ON candidat_competences (candidat_id, lower(btrim(nom)));

COMMIT;
