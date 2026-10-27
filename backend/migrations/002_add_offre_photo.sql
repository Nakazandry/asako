-- Migration ASAKO: ajout d'une photo aux offres
-- Cible: PostgreSQL (local ou Neon)
-- Colonnes alignees sur la convention photo de la table utilisateurs (bytea + type mime).
--
-- Idempotente: peut etre rejouee sans casser l'existant.

BEGIN;

ALTER TABLE offres ADD COLUMN IF NOT EXISTS photo_data BYTEA;
ALTER TABLE offres ADD COLUMN IF NOT EXISTS photo_type VARCHAR(64);

COMMIT;
