const Candidature = require('../models/candidature.model');
const { getPagination, paginated } = require('../utils/pagination');

const statuses = ['En attente', 'Entretien', 'Accepté', 'Refusé', 'Accepte', 'Refuse'];

const listCandidatures = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const userId = req.user.role === 'admin' ? req.query.userId : req.user.id;
    const result = await Candidature.list({ statut: req.query.statut, userId, limit, offset });
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
    const duplicate = await Candidature.findDuplicate(req.user.id, offre_id);
    if (duplicate) return res.status(409).json({ message: 'Vous avez deja postule a cette offre' });

    const candidature = await Candidature.create({
      utilisateur_id: req.user.id,
      offre_id,
      cv: `/uploads/${req.file.filename}`,
      lettre_motivation,
    });
    res.status(201).json(candidature);
  } catch (error) {
    next(error);
  }
};

const updateStatut = async (req, res, next) => {
  try {
    const { statut } = req.body;
    if (!statuses.includes(statut)) return res.status(400).json({ message: 'Statut invalide' });
    const normalized = statut === 'Accepte' ? 'Accepté' : statut === 'Refuse' ? 'Refusé' : statut;
    const candidature = await Candidature.updateStatus(req.params.id, normalized);
    if (!candidature) return res.status(404).json({ message: 'Candidature introuvable' });
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

module.exports = { listCandidatures, getCandidature, createCandidature, updateStatut, deleteCandidature };
