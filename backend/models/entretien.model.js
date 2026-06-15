const pool = require('../config/db');

const selectEntretien = `
  e.*,
  c.statut AS candidature_statut,
  u.nom, u.prenom, u.email,
  o.titre AS offre_titre
`;

class Entretien {
  static async create(values) {
    const {
      candidature_id,
      date_entretien,
      heure_entretien,
      type_entretien,
      lieu,
      commentaire,
      resultat,
    } = values;
    const { rows } = await pool.query(
      `INSERT INTO entretiens
       (candidature_id, date_entretien, heure_entretien, type_entretien, lieu, commentaire, resultat)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [candidature_id, date_entretien, heure_entretien, type_entretien, lieu, commentaire, resultat]
    );
    return rows[0];
  }

  static async list({ userId = '', limit, offset }) {
    const params = [];
    let whereSql = '';
    if (userId) {
      params.push(userId);
      whereSql = `WHERE c.utilisateur_id = $${params.length}`;
    }
    params.push(limit, offset);
    const [data, count] = await Promise.all([
      pool.query(
        `SELECT ${selectEntretien}
         FROM entretiens e
         JOIN candidatures c ON c.id = e.candidature_id
         JOIN utilisateurs u ON u.id = c.utilisateur_id
         JOIN offres o ON o.id = c.offre_id
         ${whereSql}
         ORDER BY e.date_entretien DESC, e.heure_entretien DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) FROM entretiens e JOIN candidatures c ON c.id = e.candidature_id ${whereSql}`,
        params.slice(0, -2)
      ),
    ]);
    return { rows: data.rows, total: count.rows[0].count };
  }

  static async findById(id) {
    const { rows } = await pool.query(
      `SELECT ${selectEntretien}
       FROM entretiens e
       JOIN candidatures c ON c.id = e.candidature_id
       JOIN utilisateurs u ON u.id = c.utilisateur_id
       JOIN offres o ON o.id = c.offre_id
       WHERE e.id = $1`,
      [id]
    );
    return rows[0];
  }

  static async update(id, values) {
    const allowed = ['date_entretien', 'heure_entretien', 'type_entretien', 'lieu', 'commentaire', 'resultat'];
    const params = [];
    const updates = [];
    allowed.forEach((key) => {
      if (values[key] !== undefined) {
        params.push(values[key] || null);
        updates.push(`${key} = $${params.length}`);
      }
    });
    if (!updates.length) return this.findById(id);
    params.push(id);
    const { rows } = await pool.query(
      `UPDATE entretiens SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0];
  }

  static async delete(id) {
    await pool.query('DELETE FROM entretiens WHERE id = $1', [id]);
  }
}

module.exports = Entretien;
