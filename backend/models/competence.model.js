const pool = require('../config/db');

const publicFields = 'id, candidat_id, nom, niveau, created_at, updated_at';

class Competence {
  static async listByCandidat(candidatId) {
    const { rows } = await pool.query(
      `SELECT ${publicFields}
       FROM candidat_competences
       WHERE candidat_id = $1
       ORDER BY lower(nom) ASC, id ASC`,
      [candidatId]
    );
    return rows;
  }

  static async findById(id) {
    const { rows } = await pool.query(
      `SELECT ${publicFields} FROM candidat_competences WHERE id = $1`,
      [id]
    );
    return rows[0];
  }

  static async findOwned(id, candidatId) {
    const { rows } = await pool.query(
      `SELECT ${publicFields}
       FROM candidat_competences
       WHERE id = $1 AND candidat_id = $2`,
      [id, candidatId]
    );
    return rows[0];
  }

  static async findByCandidatAndName(candidatId, nom) {
    const { rows } = await pool.query(
      `SELECT ${publicFields}
       FROM candidat_competences
       WHERE candidat_id = $1 AND lower(btrim(nom)) = lower(btrim($2))`,
      [candidatId, nom]
    );
    return rows[0];
  }

  static async create({ candidatId, nom, niveau }) {
    const { rows } = await pool.query(
      `INSERT INTO candidat_competences (candidat_id, nom, niveau)
       VALUES ($1, $2, $3)
       RETURNING ${publicFields}`,
      [candidatId, nom, niveau]
    );
    return rows[0];
  }

  static async update(id, candidatId, values) {
    const allowed = ['nom', 'niveau'];
    const updates = [];
    const params = [];

    allowed.forEach((key) => {
      if (values[key] !== undefined) {
        params.push(values[key]);
        updates.push(`${key} = $${params.length}`);
      }
    });

    if (!updates.length) return this.findOwned(id, candidatId);

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id, candidatId);

    const { rows } = await pool.query(
      `UPDATE candidat_competences
       SET ${updates.join(', ')}
       WHERE id = $${params.length - 1} AND candidat_id = $${params.length}
       RETURNING ${publicFields}`,
      params
    );
    return rows[0];
  }

  static async delete(id, candidatId) {
    const { rowCount } = await pool.query(
      'DELETE FROM candidat_competences WHERE id = $1 AND candidat_id = $2',
      [id, candidatId]
    );
    return rowCount;
  }
}

module.exports = Competence;
