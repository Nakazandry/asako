const bcrypt = require('bcryptjs');
const Utilisateur = require('../models/utilisateur.model');
const { getPagination, paginated } = require('../utils/pagination');

const listUtilisateurs = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const result = await Utilisateur.list({ search: req.query.search, role: req.query.role, limit, offset });
    res.json(paginated(result.rows, result.total, page, limit));
  } catch (error) {
    next(error);
  }
};

const getUtilisateur = async (req, res, next) => {
  try {
    const user = await Utilisateur.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const createUtilisateur = async (req, res, next) => {
  try {
    const { nom, prenom, email, mot_de_passe, role } = req.body;
    const hash = await bcrypt.hash(mot_de_passe, 10);
    const user = await Utilisateur.create({ nom, prenom, email, mot_de_passe: hash, role });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

const updateUtilisateur = async (req, res, next) => {
  try {
    const user = await Utilisateur.update(req.params.id, req.body);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const deleteUtilisateur = async (req, res, next) => {
  try {
    await Utilisateur.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { listUtilisateurs, getUtilisateur, createUtilisateur, updateUtilisateur, deleteUtilisateur };
