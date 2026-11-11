const Entretien = require('../models/entretien.model');
const Candidature = require('../models/candidature.model');
const Utilisateur = require('../models/utilisateur.model');
const emailService = require('../services/email.service');
const { getPagination, paginated } = require('../utils/pagination');
const { isoDay, formatFrDate, formatFrTime } = require('../utils/dates');
const { createNotification, notifyAdmins } = require('../utils/notify');

// Convertit une valeur date/heure en comparaison fiable (JJ-MM-AAAA local / HH:MM)
const comparable = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  if (value instanceof Date) return isoDay(value);
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  if (/^\d{2}:\d{2}/.test(str)) return str.slice(0, 5);
  return str;
};

// Normalise la decision envoyee par le candidat vers les valeurs stockees.
const normalizeReponse = (value) => {
  const raw = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  if (['accepter', 'accepte', 'accepted', 'oui'].includes(raw)) return 'Accepté';
  if (['refuser', 'refuse', 'refused', 'non'].includes(raw)) return 'Refusé';
  return null;
};

// Le candidat peut repondre jusqu'au debut de l'entretien (date + heure).
const responseDeadlinePassed = (entretien) => {
  const day = isoDay(entretien && entretien.date_entretien);
  if (!day) return false;
  const heure = formatFrTime(entretien.heure_entretien) || '23:59';
  const [year, month, date] = day.split('-').map(Number);
  const [hours, minutes] = heure.split(':').map(Number);
  if (!year || !month || !date) return false;
  const deadline = new Date(year, month - 1, date, hours || 0, minutes || 0, 0, 0);
  if (Number.isNaN(deadline.getTime())) return false;
  return deadline.getTime() < Date.now();
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
    if (req.user.role !== 'admin' && entretien.utilisateur_id !== req.user.id) {
      return res.status(403).json({ message: 'Acces non autorise' });
    }
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
      const type = comparable(entretien.type_entretien);
      const lieu = comparable(entretien.lieu);
      createNotification(
        candidature.utilisateur_id,
        "Invitation a un entretien",
        `Un entretien est propose pour votre candidature a l'offre "${candidature.offre_titre}" le ${day} a ${heure || 'l\'heure indiquee'}${type ? ` (${type})` : ''}${lieu ? ` - ${lieu}` : ''}. Connectez-vous a votre espace ASAKO, rubrique "Invitations a des entretiens", pour accepter ou refuser cette invitation.`,
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

// Reponse du candidat a une invitation (accepter / refuser).
// Route reservee au role candidat : le recruteur ne peut pas repondre a sa place.
const repondreEntretien = async (req, res, next) => {
  try {
    const reponse = normalizeReponse(req.body && req.body.reponse);
    if (!reponse) {
      return res.status(400).json({ message: 'Reponse invalide : valeurs attendues "accepter" ou "refuser"' });
    }

    const existing = await Entretien.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Entretien introuvable' });

    // Seul le candidat concerne par l'entretien peut repondre.
    if (existing.utilisateur_id !== req.user.id) {
      return res.status(403).json({ message: 'Acces non autorise' });
    }

    if (existing.reponse_candidat && existing.reponse_candidat !== 'En attente') {
      return res.status(409).json({
        message: `Vous avez deja repondu a cette invitation (${existing.reponse_candidat}).`,
        reponse_candidat: existing.reponse_candidat,
        date_reponse: existing.date_reponse,
      });
    }

    if (responseDeadlinePassed(existing)) {
      return res.status(409).json({ message: "Le delai de reponse est depasse : l'entretien a deja commence." });
    }

    // Mise a jour conditionnelle : protege aussi contre deux soumissions simultanees.
    const updated = await Entretien.setReponseCandidat(existing.id, reponse);
    if (!updated) {
      return res.status(409).json({ message: 'Cette invitation a deja recu une reponse.' });
    }

    const entretien = (await Entretien.findById(existing.id)) || { ...existing, ...updated };
    const candidature = {
      id: entretien.candidature_id,
      utilisateur_id: entretien.utilisateur_id,
      prenom: entretien.prenom,
      nom: entretien.nom,
      email: entretien.email,
      offre_titre: entretien.offre_titre,
    };
    const day = formatFrDate(entretien.date_entretien);
    const heure = formatFrTime(entretien.heure_entretien);
    const when = [day, heure ? `a ${heure}` : ''].filter(Boolean).join(' ');
    const decision = reponse === 'Accepté' ? 'accepte' : 'refuse';
    const candidatNom = [entretien.prenom, entretien.nom].filter(Boolean).join(' ') || 'Un candidat';

    // Confirmation interne pour le candidat.
    createNotification(
      entretien.utilisateur_id,
      reponse === 'Accepté' ? 'Invitation acceptee' : 'Invitation refusee',
      `Vous avez ${decision} l'entretien${when ? ` du ${when}` : ''} pour l'offre "${entretien.offre_titre}". Votre reponse a bien ete enregistree.`,
      'ENTRETIEN'
    ).catch(() => {});

    // Information du recruteur : une seule notification car la reponse n'est
    // enregistrable qu'une fois (mise a jour atomique ci-dessus).
    notifyAdmins(
      reponse === 'Accepté' ? 'Entretien accepte par le candidat' : 'Entretien refuse par le candidat',
      `${candidatNom} a ${decision} l'invitation a l'entretien${when ? ` du ${when}` : ''} pour l'offre "${entretien.offre_titre}".`,
      'ENTRETIEN'
    ).catch(() => {});

    emailService.sendEntretienReponseCandidat({ candidature, entretien }).catch(() => {});
    Utilisateur.listAdmins()
      .then((admins) => Promise.all(
        (admins || []).map((recruteur) => emailService.sendEntretienReponseRecruteur({ recruteur, candidature, entretien }))
      ))
      .catch(() => {});

    res.json(entretien);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listEntretiens,
  getEntretien,
  createEntretien,
  updateEntretien,
  deleteEntretien,
  repondreEntretien,
};
