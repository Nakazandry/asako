const Entretien = require('../models/entretien.model');
const Candidature = require('../models/candidature.model');
const emailService = require('../services/email.service');
const { getPagination, paginated } = require('../utils/pagination');
const { isoDay, formatFrDate } = require('../utils/dates');
const { createNotification } = require('../utils/notify');

// Convertit une valeur date/heure en comparaison fiable (JJ-MM-AAAA local / HH:MM)
const comparable = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  if (value instanceof Date) return isoDay(value);
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  if (/^\d{2}:\d{2}/.test(str)) return str.slice(0, 5);
  return str;
};

const listEntretiens = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const userId = req.user.role === 'admin' ? req.query.userId : req.user.id;
    const result = await Entretien.list({ userId, limit, offset });
    res.json(paginated(result.rows, result.total, page, limit));
  } catch (error) {
    next(error);
  }
};

const getEntretien = async (req, res, next) => {
  try {
    const entretien = await Entretien.findById(req.params.id);
    if (!entretien) return res.status(404).json({ message: 'Entretien introuvable' });
    res.json(entretien);
  } catch (error) {
    next(error);
  }
};

const createEntretien = async (req, res, next) => {
  try {
    const entretien = await Entretien.create(req.body);
    await Candidature.updateStatus(req.body.candidature_id, 'Entretien');

    const candidature = await Candidature.findById(req.body.candidature_id);
    if (candidature) {
      const day = formatFrDate(entretien.date_entretien);
      const heure = comparable(entretien.heure_entretien);
      createNotification(
        candidature.utilisateur_id,
        'Nouvel entretien',
        `Un entretien a ete programme pour votre candidature a l'offre "${candidature.offre_titre}" le ${day} a ${heure || 'l\'heure indiquee'}.`,
        'ENTRETIEN'
      ).catch(() => {});
      emailService.sendEntretienPlanifie({ candidature, entretien }).catch(() => {});
    }

    res.status(201).json(entretien);
  } catch (error) {
    next(error);
  }
};

const updateEntretien = async (req, res, next) => {
  try {
    const existing = await Entretien.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Entretien introuvable' });

    const entretien = await Entretien.update(req.params.id, req.body);
    if (!entretien) return res.status(404).json({ message: 'Entretien introuvable' });

    // Prevenir le candidat uniquement si un detail du rendez-vous change (date, heure, type, lieu)
    const changed = (key) => comparable(req.body[key]) !== comparable(existing[key]);
    const slotChanged = ['date_entretien', 'heure_entretien', 'type_entretien', 'lieu'].some(changed);

    if (slotChanged) {
      const candidature = await Candidature.findById(existing.candidature_id);
      if (candidature) {
        const day = formatFrDate(entretien.date_entretien || existing.date_entretien);
        const heure = comparable(entretien.heure_entretien);
        const type = comparable(entretien.type_entretien);
        const lieu = comparable(entretien.lieu);
        const rescheduled = changed('date_entretien') || changed('heure_entretien');
        const title = rescheduled ? 'Entretien reprogramme' : 'Entretien modifie';

        // Liste des elements modifies, avec leur nouvelle valeur
        const details = [];
        if (changed('date_entretien')) details.push(`la date est desormais le ${day}`);
        if (changed('heure_entretien')) details.push(`l'heure est desormais ${heure ? `a ${heure}` : 'a convenir'}`);
        if (changed('type_entretien')) details.push(type ? `le type est desormais ${type}` : 'le type a ete retire');
        if (changed('lieu')) details.push(lieu ? `le lieu est desormais ${lieu}` : 'le lieu a ete retire');
        if (!rescheduled) {
          const when = `${day}${heure ? ` a ${heure}` : ''}`;
          if (when) details.push(`rendez-vous le ${when}`);
        }

        const message = `Votre entretien pour l'offre "${candidature.offre_titre}" a ete ${rescheduled ? 'reprogramme' : 'modifie'} : ${details.join(', ')}.`;
        createNotification(candidature.utilisateur_id, title, message, 'ENTRETIEN').catch(() => {});

        const updatedDay = formatFrDate(entretien.date_entretien);
        const changements = [];
        if (changed('date_entretien')) changements.push(`Date : ${updatedDay || 'à convenir'}`);
        if (changed('heure_entretien')) changements.push(`Heure : ${heure || 'à convenir'}`);
        if (changed('type_entretien')) changements.push(`Type : ${type || 'non précisé'}`);
        if (changed('lieu')) changements.push(`Lieu : ${lieu || 'non précisé'}`);
        emailService
          .sendEntretienModifie({ candidature, entretien, reprogramme: rescheduled, changements })
          .catch(() => {});
      }
    }

    res.json(entretien);
  } catch (error) {
    next(error);
  }
};

const deleteEntretien = async (req, res, next) => {
  try {
    const existing = await Entretien.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Entretien introuvable' });

    await Entretien.delete(req.params.id);

    const candidature = await Candidature.findById(existing.candidature_id);
    if (candidature) {
      const day = formatFrDate(existing.date_entretien);
      createNotification(
        candidature.utilisateur_id,
        'Entretien annule',
        `Votre entretien pour l'offre "${candidature.offre_titre}"${day ? ` du ${day}` : ''} a ete annule.`,
        'ENTRETIEN'
      ).catch(() => {});
      emailService.sendEntretienAnnule({ candidature, entretien: existing }).catch(() => {});
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { listEntretiens, getEntretien, createEntretien, updateEntretien, deleteEntretien };
