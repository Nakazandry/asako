const pool = require('../config/db');

const publicFields = 'id, utilisateur_id, titre, messages, date_creation, date_modification';

class ConversationIa {
  static async listByUtilisateur(utilisateurId, { limit, offset }) {
    const [data, count] = await Promise.all([
      pool.query(
        `SELECT ${publicFields}
         FROM conversations_ia
         WHERE utilisateur_id = $1
         ORDER BY date_modification DESC, id DESC
         LIMIT $2 OFFSET $3`,
        [utilisateurId, limit, offset]
      ),
      pool.query('SELECT COUNT(*) FROM conversations_ia WHERE utilisateur_id = $1', [utilisateurId]),
    ]);

    return { rows: data.rows, total: count.rows[0].count };
  }

  // Toutes les lectures unitaires sont filtrees par proprietaire: aucune requete
  // ne permet de deviner l'existence d'une conversation d'un autre utilisateur.
  static async findOwned(id, utilisateurId) {
    const { rows } = await pool.query(
      `SELECT ${publicFields}
       FROM conversations_ia
       WHERE id = $1 AND utilisateur_id = $2`,
      [id, utilisateurId]
    );
    return rows[0];
  }

  static async create({ utilisateur_id, titre, messages = [] }) {
    const { rows } = await pool.query(
      `INSERT INTO conversations_ia (utilisateur_id, titre, messages)
       VALUES ($1, $2, $3::jsonb)
       RETURNING ${publicFields}`,
      [utilisateur_id, titre, JSON.stringify(messages)]
    );
    return rows[0];
  }

  static async update(id, utilisateurId, values = {}) {
    const updates = [];
    const params = [];

    if (values.titre !== undefined) {
      params.push(values.titre);
      updates.push(`titre = $${params.length}`);
    }

    if (values.messages !== undefined) {
      params.push(JSON.stringify(values.messages));
      updates.push(`messages = $${params.length}::jsonb`);
    }

    if (!updates.length) return this.findOwned(id, utilisateurId);

    updates.push('date_modification = CURRENT_TIMESTAMP');
    params.push(id, utilisateurId);

    const { rows } = await pool.query(
      `UPDATE conversations_ia
       SET ${updates.join(', ')}
       WHERE id = $${params.length - 1} AND utilisateur_id = $${params.length}
       RETURNING ${publicFields}`,
      params
    );
    return rows[0];
  }

  static async delete(id, utilisateurId) {
    const { rowCount } = await pool.query(
      'DELETE FROM conversations_ia WHERE id = $1 AND utilisateur_id = $2',
      [id, utilisateurId]
    );
    return rowCount;
  }
}

module.exports = ConversationIa;
