const pool = require('../config/db');

// On n'expose jamais les octets de la photo dans les listes/details: uniquement un drapeau.
const publicFields = `
  id, titre, description, localisation, salaire, date_limite, date_creation,
  (photo_data IS NOT NULL) AS has_photo
`;

class Offre {
  static async create(values) {
    const { titre, description, localisation, salaire, date_limite, photo_data, photo_type } = values;
    const { rows } = await pool.query(
      `INSERT INTO offres (titre, description, localisation, salaire, date_limite, photo_data, photo_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${publicFields}`,
      [
        titre,
        description,
        localisation,
        salaire || null,
        date_limite || null,
        photo_data || null,
        photo_type || null,
      ]
    );
    return rows[0];
  }

  static async list({ search = '', limit, offset }) {
    const params = [];
    let whereSql = '';
    if (search) {
      params.push(`%${search}%`);
      whereSql = `WHERE titre ILIKE $1 OR description ILIKE $1 OR localisation ILIKE $1`;
    }
    params.push(limit, offset);

    const [data, count] = await Promise.all([
      pool.query(
        `SELECT ${publicFields} FROM offres ${whereSql} ORDER BY date_creation DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      pool.query(`SELECT COUNT(*) FROM offres ${whereSql}`, params.slice(0, -2)),
    ]);
    return { rows: data.rows, total: count.rows[0].count };
  }

  static async findById(id) {
    const { rows } = await pool.query(`SELECT ${publicFields} FROM offres WHERE id = $1`, [id]);
    return rows[0];
  }

  static async update(id, values) {
    const allowed = ['titre', 'description', 'localisation', 'salaire', 'date_limite', 'photo_data', 'photo_type'];
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
      `UPDATE offres SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING ${publicFields}`,
      params
    );
    return rows[0];
  }

  static async getPhoto(id) {
    const { rows } = await pool.query(
      'SELECT photo_data, photo_type FROM offres WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  static async removePhoto(id) {
    const { rows } = await pool.query(
      `UPDATE offres SET photo_data = NULL, photo_type = NULL WHERE id = $1 RETURNING ${publicFields}`,
      [id]
    );
    return rows[0];
  }

  static async delete(id) {
    await pool.query('DELETE FROM offres WHERE id = $1', [id]);
  }
}

module.exports = Offre;
