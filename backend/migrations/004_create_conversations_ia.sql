-- Migration ASAKO: conversations du chatbot IA
-- Cible: PostgreSQL (local ou Neon)
-- Reference: utilisateurs(id) -> INTEGER (SERIAL), verifie dans le schema existant.
--
-- Une ligne = une conversation; les echanges sont stockes en JSONB sous la forme
-- [{ "role": "user" | "assistant", "content": "...", "date": "ISO" }, ...].
--
-- Idempotente: peut etre rejouee sans casser l'existant.
-- Aucune table existante n'est modifiee ni supprimee.

BEGIN;

CREATE TABLE IF NOT EXISTS conversations_ia (
  id                SERIAL PRIMARY KEY,
  utilisateur_id    INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  titre             VARCHAR(120) NOT NULL DEFAULT 'Nouvelle conversation',
  messages          JSONB NOT NULL DEFAULT '[]'::jsonb,
  date_creation     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT conversations_ia_titre_check
    CHECK (length(btrim(titre)) BETWEEN 1 AND 120),
  -- Le contenu doit rester un tableau JSON pour que l'application puisse le parcourir.
  CONSTRAINT conversations_ia_messages_check
    CHECK (jsonb_typeof(messages) = 'array')
);

-- Couvre la liste des conversations d'un utilisateur (filtre + tri par activite)
-- et evite un index redondant sur utilisateur_id seul.
CREATE INDEX IF NOT EXISTS conversations_ia_utilisateur_date_idx
  ON conversations_ia (utilisateur_id, date_modification DESC, id DESC);

COMMIT;
