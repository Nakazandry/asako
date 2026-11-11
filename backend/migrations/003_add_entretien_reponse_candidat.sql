-- Migration ASAKO: reponse du candidat a une invitation d'entretien
-- Cible: PostgreSQL (local ou Neon)
--
-- La reponse du candidat est distincte du resultat de l'entretien :
--   reponse_candidat -> decision du candidat (En attente / Accepté / Refusé)
--   resultat         -> evaluation de l'entretien par le recruteur
--
-- Idempotente: peut etre rejouee sans casser l'existant.
-- Aucune donnee n'est supprimee : les lignes existantes recoivent la valeur
-- par defaut 'En attente'.

BEGIN;

ALTER TABLE entretiens ADD COLUMN IF NOT EXISTS reponse_candidat VARCHAR(20) NOT NULL DEFAULT 'En attente';
ALTER TABLE entretiens ADD COLUMN IF NOT EXISTS date_reponse TIMESTAMP NULL;

-- Normalise d'eventuelles valeurs heritees (NULL) avant la contrainte.
UPDATE entretiens SET reponse_candidat = 'En attente' WHERE reponse_candidat IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entretiens_reponse_candidat_check'
  ) THEN
    ALTER TABLE entretiens
      ADD CONSTRAINT entretiens_reponse_candidat_check
      CHECK (reponse_candidat IN ('En attente', 'Accepté', 'Refusé'));
  END IF;
END
$$;

COMMIT;
