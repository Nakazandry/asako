const Entretien = require('../models/entretien.model');
const Candidature = require('../models/candidature.model');
const { getPagination, paginated } = require('../utils/pagination');

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
    res.status(201).json(entretien);
  } catch (error) {
    next(error);
  }
};

const updateEntretien = async (req, res, next) => {
  try {
    const entretien = await Entretien.update(req.params.id, req.body);
    if (!entretien) return res.status(404).json({ message: 'Entretien introuvable' });
    res.json(entretien);
  } catch (error) {
    next(error);
  }
};

const deleteEntretien = async (req, res, next) => {
  try {
    await Entretien.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { listEntretiens, getEntretien, createEntretien, updateEntretien, deleteEntretien };
