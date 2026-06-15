const pool = require('../config/db');

const publicFields = 'id, nom, prenom, email, role, date_creation';

class Utilisateur {
  static async create({ nom, prenom, email, mot_de_passe, role = 'candidat' }) {
    const { rows } = await pool.query(
      `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${publicFields}`,
      [nom, prenom, email, mot_de_passe, role]
    );
    return rows[0];
  }

  static async findByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM utilisateurs WHERE email = $1', [email]);
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await pool.query(`SELECT ${publicFields} FROM utilisateurs WHERE id = $1`, [id]);
    return rows[0];
  }

  static async list({ search = '', role = '', limit, offset }) {
    const params = [];
    const where = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(nom ILIKE $${params.length} OR prenom ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    if (role) {
      params.push(role);
      where.push(`role = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(limit, offset);

    const [data, count] = await Promise.all([
      pool.query(
        `SELECT ${publicFields} FROM utilisateurs ${whereSql}
         ORDER BY date_creation DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      pool.query(`SELECT COUNT(*) FROM utilisateurs ${whereSql}`, params.slice(0, -2)),
    ]);

    return { rows: data.rows, total: count.rows[0].count };
  }

  static async update(id, values) {
    const allowed = ['nom', 'prenom', 'email', 'role'];
    const updates = [];
    const params = [];

    allowed.forEach((key) => {
      if (values[key] !== undefined) {
        params.push(values[key]);
        updates.push(`${key} = $${params.length}`);
      }
    });

    if (!updates.length) return this.findById(id);
    params.push(id);

    const { rows } = await pool.query(
      `UPDATE utilisateurs SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING ${publicFields}`,
      params
    );
    return rows[0];
  }

  static async delete(id) {
    await pool.query('DELETE FROM utilisateurs WHERE id = $1', [id]);
  }
}

module.exports = Utilisateur;
