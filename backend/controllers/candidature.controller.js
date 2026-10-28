const Candidature = require('../models/candidature.model');
const Offre = require('../models/offre.model');
const Utilisateur = require('../models/utilisateur.model');
const emailService = require('../services/email.service');
const { getPagination, paginated } = require('../utils/pagination');
const { isPast } = require('../utils/dates');
const { createNotification, notifyAdmins } = require('../utils/notify');
const path = require('path');

const statuses = ['En attente', 'Entretien', 'Accepté', 'Refusé', 'Accepte', 'Refuse'];

const unseenCount = async (req, res, next) => {
  try {
    const count = req.user.role === 'admin'
      ? await Candidature.countUnseenAdmin()
      : await Candidature.countUnseenUser(req.user.id);
    res.json({ count });
  } catch (error) {
    next(error);
  }
};

const listCandidatures = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const isAdmin = req.user.role === 'admin';
    const userId = isAdmin ? req.query.userId : req.user.id;
    const result = await Candidature.list({ statut: req.query.statut, userId, limit, offset });
    if (isAdmin) await Candidature.markAllSeenByAdmin();
    else await Candidature.markAllSeenByUser(req.user.id);
    res.json(paginated(result.rows, result.total, page, limit));
  } catch (error) {
    next(error);
  }
};

const getCandidature = async (req, res, next) => {
  try {
    const candidature = await Candidature.findById(req.params.id);
    if (!candidature) return res.status(404).json({ message: 'Candidature introuvable' });
    if (req.user.role !== 'admin' && candidature.utilisateur_id !== req.user.id) {
      return res.status(403).json({ message: 'Acces non autorise' });
    }
    res.json(candidature);
  } catch (error) {
    next(error);
  }
};

const createCandidature = async (req, res, next) => {
  try {
    const { offre_id, lettre_motivation } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Le CV PDF est obligatoire' });
    const offre = await Offre.findById(offre_id);
    if (!offre) return res.status(404).json({ message: 'Offre introuvable' });
    if (isPast(offre.date_limite)) {
      return res.status(400).json({ message: 'La date limite de cette offre est deja passee, candidature fermee' });
    }
    const duplicate = await Candidature.findDuplicate(req.user.id, offre_id);
    if (duplicate) return res.status(409).json({ message: 'Vous avez deja postule a cette offre' });

    const candidature = await Candidature.create({
      utilisateur_id: req.user.id,
      offre_id,
      cv: req.file.originalname,
      cvData: req.file.buffer,
      cvNom: req.file.originalname,
      lettre_motivation,
    });
    notifyAdmins(
      'Nouvelle candidature',
      `Le candidat ${req.user.prenom} ${req.user.nom} a postule a l'offre "${offre.titre}".`,
      'NOUVELLE_CANDIDATURE'
    ).catch(() => {});

    const candidat = {
      id: req.user.id,
      prenom: req.user.prenom,
      nom: req.user.nom,
      email: req.user.email,
    };
    Utilisateur.listAdmins()
      .catch(() => [])
      .then((admins) => emailService.notifyCandidatureCreated({ candidature, candidat, offre, admins }))
      .catch(() => {});

    res.status(201).json(candidature);
  } catch (error) {
    next(error);
  }
};

const downloadCv = async (req, res, next) => {
  try {
    const file = await Candidature.getCvFile(req.params.id);
    if (!file) return res.status(404).json({ message: 'Candidature introuvable' });
    if (req.user.role !== 'admin' && file.utilisateur_id !== req.user.id) {
      return res.status(403).json({ message: 'Acces non autorise' });
    }

    if (file.cv_data) {
      const nom = file.cv_nom || 'cv.pdf';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename*=UTF-8''${encodeURIComponent(nom)}`
      );
      return res.send(file.cv_data);
    }

    if (file.cv && file.cv.startsWith('/uploads/')) {
      return res.sendFile(path.join(__dirname, '..', file.cv), (err) => {
        if (err && !res.headersSent) {
          res.status(404).json({ message: 'Fichier CV introuvable sur le serveur' });
        }
      });
    }

    res.status(404).json({ message: 'CV non disponible' });
  } catch (error) {
    next(error);
  }
};

const updateStatut = async (req, res, next) => {
  try {
    const { statut } = req.body;
    if (!statuses.includes(statut)) return res.status(400).json({ message: 'Statut invalide' });
    const normalized = statut === 'Accepte' ? 'Accepté' : statut === 'Refuse' ? 'Refusé' : statut;

    const existing = await Candidature.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Candidature introuvable' });

    const candidature = await Candidature.updateStatus(req.params.id, normalized);
    if (!candidature) return res.status(404).json({ message: 'Candidature introuvable' });

    const full = await Candidature.findById(req.params.id);
    if (full) {
      const statusCopy = {
        'Accepté': 'a ete acceptee',
        'Refusé': 'a ete refusee',
        'Entretien': 'a ete retenue pour un entretien',
        'En attente': 'est de nouveau en attente',
      }[normalized] || `a change de statut (${normalized})`;
      createNotification(
        full.utilisateur_id,
        'Mise a jour de votre candidature',
        `Votre candidature pour l'offre "${full.offre_titre}" ${statusCopy}.`,
        'CANDIDATURE'
      ).catch(() => {});

      if (existing.statut !== normalized) {
        emailService
          .sendChangementStatut({ candidature: full, statut: normalized, ancienStatut: existing.statut })
          .catch(() => {});
      }
    }

    res.json(candidature);
  } catch (error) {
    next(error);
  }
};

const deleteCandidature = async (req, res, next) => {
  try {
    await Candidature.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { listCandidatures, getCandidature, createCandidature, downloadCv, updateStatut, deleteCandidature, unseenCount };
