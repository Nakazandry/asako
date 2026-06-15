const Offre = require('../models/offre.model');
const { getPagination, paginated } = require('../utils/pagination');

const listOffres = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const result = await Offre.list({ search: req.query.search, limit, offset });
    res.json(paginated(result.rows, result.total, page, limit));
  } catch (error) {
    next(error);
  }
};

const getOffre = async (req, res, next) => {
  try {
    const offre = await Offre.findById(req.params.id);
    if (!offre) return res.status(404).json({ message: 'Offre introuvable' });
    res.json(offre);
  } catch (error) {
    next(error);
  }
};

const createOffre = async (req, res, next) => {
  try {
    const offre = await Offre.create(req.body);
    res.status(201).json(offre);
  } catch (error) {
    next(error);
  }
};

const updateOffre = async (req, res, next) => {
  try {
    const offre = await Offre.update(req.params.id, req.body);
    if (!offre) return res.status(404).json({ message: 'Offre introuvable' });
    res.json(offre);
  } catch (error) {
    next(error);
  }
};

const deleteOffre = async (req, res, next) => {
  try {
    await Offre.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { listOffres, getOffre, createOffre, updateOffre, deleteOffre };
