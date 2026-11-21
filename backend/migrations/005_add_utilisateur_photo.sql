-- Migration ASAKO: ajout des photos de profil utilisateur
-- Cible: PostgreSQL (local ou Neon)
-- Idempotente: peut etre rejouee sans casser l'existant.

BEGIN;

ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS photo_data BYTEA;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS photo_type VARCHAR(64);

COMMIT;
