const pool = require('../config/db');

class Notification {
  static async create({ utilisateur_id, titre, message, type = 'GENERAL' }) {
    const { rows } = await pool.query(
      `INSERT INTO notifications (utilisateur_id, titre, message, type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [utilisateur_id, titre, message, type]
    );
    return rows[0];
  }

  static async listByUser(utilisateurId, { limit = 50 } = {}) {
    const { rows } = await pool.query(
      `SELECT *
       FROM notifications
       WHERE utilisateur_id = $1
       ORDER BY date_creation DESC, id DESC
       LIMIT $2`,
      [utilisateurId, limit]
    );
    return rows;
  }

  static async countAll(utilisateurId) {
    const { rows } = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE utilisateur_id = $1',
      [utilisateurId]
    );
    return Number(rows[0].count);
  }

  static async unreadCount(utilisateurId) {
    const { rows } = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE utilisateur_id = $1 AND lu = FALSE',
      [utilisateurId]
    );
    return Number(rows[0].count);
  }

  static async markRead(id, utilisateurId) {
    const { rows } = await pool.query(
      `UPDATE notifications
       SET lu = TRUE
       WHERE id = $1 AND utilisateur_id = $2
       RETURNING *`,
      [id, utilisateurId]
    );
    return rows[0] || null;
  }

  static async markAllRead(utilisateurId) {
    const { rows } = await pool.query(
      `UPDATE notifications
       SET lu = TRUE
       WHERE utilisateur_id = $1 AND lu = FALSE
       RETURNING id`,
      [utilisateurId]
    );
    return rows.length;
  }
}

module.exports = Notification;
