const pool = require('../config/db');

const baseSelect = `
  c.*,
  u.nom, u.prenom, u.email,
  o.titre AS offre_titre, o.localisation AS offre_localisation
`;

class Candidature {
  static async create({ utilisateur_id, offre_id, cv, lettre_motivation }) {
    const { rows } = await pool.query(
      `INSERT INTO candidatures (utilisateur_id, offre_id, cv, lettre_motivation, statut)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [utilisateur_id, offre_id, cv, lettre_motivation, 'En attente']
    );
    return rows[0];
  }

  static async list({ statut = '', userId = '', limit, offset }) {
    const params = [];
    const where = [];
    if (statut) {
      params.push(statut);
      where.push(`c.statut = $${params.length}`);
    }
    if (userId) {
      params.push(userId);
      where.push(`c.utilisateur_id = $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(limit, offset);

    const [data, count] = await Promise.all([
      pool.query(
        `SELECT ${baseSelect}
         FROM candidatures c
         JOIN utilisateurs u ON u.id = c.utilisateur_id
         JOIN offres o ON o.id = c.offre_id
         ${whereSql}
         ORDER BY c.date_candidature DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) FROM candidatures c ${whereSql}`,
        params.slice(0, -2)
      ),
    ]);
    return { rows: data.rows, total: count.rows[0].count };
  }

  static async findById(id) {
    const { rows } = await pool.query(
      `SELECT ${baseSelect}
       FROM candidatures c
       JOIN utilisateurs u ON u.id = c.utilisateur_id
       JOIN offres o ON o.id = c.offre_id
       WHERE c.id = $1`,
      [id]
    );
    return rows[0];
  }

  static async findDuplicate(utilisateurId, offreId) {
    const { rows } = await pool.query(
      'SELECT id FROM candidatures WHERE utilisateur_id = $1 AND offre_id = $2',
      [utilisateurId, offreId]
    );
    return rows[0];
  }

  static async updateStatus(id, statut) {
    const { rows } = await pool.query(
      'UPDATE candidatures SET statut = $1 WHERE id = $2 RETURNING *',
      [statut, id]
    );
    return rows[0];
  }

  static async delete(id) {
    await pool.query('DELETE FROM candidatures WHERE id = $1', [id]);
  }
}

module.exports = Candidature;
