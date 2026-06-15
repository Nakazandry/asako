const pool = require('../config/db');

class Dashboard {
  static async stats() {
    const [offres, candidats, candidatures, entretiens, statuts, monthly] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM offres'),
      pool.query("SELECT COUNT(*) FROM utilisateurs WHERE role = 'candidat'"),
      pool.query('SELECT COUNT(*) FROM candidatures'),
      pool.query('SELECT COUNT(*) FROM entretiens'),
      pool.query('SELECT statut, COUNT(*) FROM candidatures GROUP BY statut ORDER BY statut'),
      pool.query(`
        SELECT TO_CHAR(date_candidature, 'YYYY-MM') AS mois, COUNT(*)::int AS total
        FROM candidatures
        GROUP BY mois
        ORDER BY mois DESC
        LIMIT 6
      `),
    ]);

    return {
      totals: {
        offres: Number(offres.rows[0].count),
        candidats: Number(candidats.rows[0].count),
        candidatures: Number(candidatures.rows[0].count),
        entretiens: Number(entretiens.rows[0].count),
      },
      statuts: statuts.rows.map((row) => ({ name: row.statut, value: Number(row.count) })),
      evolution: monthly.rows.reverse(),
    };
  }
}

module.exports = Dashboard;
