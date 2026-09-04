const pool = require('../config/db');
const Notification = require('../models/notification.model');

const createNotification = async (utilisateurId, titre, message, type = 'GENERAL') => {
  if (!utilisateurId || !titre || !message) return null;
  return Notification.create({ utilisateur_id: utilisateurId, titre, message, type });
};

const notifyAdmins = async (titre, message, type = 'GENERAL') => {
  const { rows } = await pool.query('SELECT id FROM utilisateurs WHERE role = $1', ['admin']);
  await Promise.all(
    rows.map((admin) => createNotification(admin.id, titre, message, type).catch(() => null))
  );
  return rows.length;
};

module.exports = { createNotification, notifyAdmins };
