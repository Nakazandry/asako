const Competence = require('../models/competence.model');
const Utilisateur = require('../models/utilisateur.model');

// Caracteres autorises dans le nom d'une competence: lettres (accents inclus),
// chiffres, espaces et ponctuation technique courante (C++, React.js, Node.js, .NET...).
const NOM_ALLOWED = /^[\p{L}\p{N} .,+#/&()'_.-]+$/u;
const NOM_HAS_ALNUM = /[\p{L}\p{N}]/u;
const NOM_MAX = 80;

const normalizeName = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

const validateName = (value) => {
  const nom = normalizeName(value);
  if (!nom) return { error: 'Le nom de la competence est obligatoire' };
  if (nom.length > NOM_MAX) return { error: `Le nom ne doit pas depasser ${NOM_MAX} caracteres` };
  if (!NOM_ALLOWED.test(nom) || !NOM_HAS_ALNUM.test(nom)) {
    return { error: 'Le nom de la competence contient des caracteres non autorises' };
  }
  return { value: nom };
};

const validateNiveau = (value) => {
  if (value === undefined || value === null || value === '') {
    return { error: 'Le niveau est obligatoire' };
  }
  const niveau = Number(value);
  if (!Number.isInteger(niveau) || niveau < 0 || niveau > 100) {
    return { error: 'Le niveau doit etre un entier compris entre 0 et 100' };
  }
  return { value: niveau };
};

const listMesCompetences = async (req, res, next) => {
  try {
    const competences = await Competence.listByCandidat(req.user.id);
    res.json(competences);
  } catch (error) {
    next(error);
  }
};

// Consultation par un recruteur (admin) des competences d'un candidat donne.
const listCompetencesCandidat = async (req, res, next) => {
  try {
    const candidatId = Number(req.params.candidatId);
    if (!Number.isInteger(candidatId) || candidatId <= 0) {
      return res.status(400).json({ message: 'Identifiant candidat invalide' });
    }

    const candidat = await Utilisateur.findById(candidatId);
    if (!candidat) return res.status(404).json({ message: 'Candidat introuvable' });

    const competences = await Competence.listByCandidat(candidatId);
    res.json({ candidat, competences });
  } catch (error) {
    next(error);
  }
};

const createCompetence = async (req, res, next) => {
  try {
    const nameCheck = validateName(req.body?.nom);
    if (nameCheck.error) return res.status(400).json({ message: nameCheck.error });

    const niveauCheck = validateNiveau(req.body?.niveau);
    if (niveauCheck.error) return res.status(400).json({ message: niveauCheck.error });

    const existing = await Competence.findByCandidatAndName(req.user.id, nameCheck.value);
    if (existing) {
      return res.status(409).json({ message: 'Cette competence est deja enregistree' });
    }

    // candidat_id provient du token JWT, jamais du frontend.
    const competence = await Competence.create({
      candidatId: req.user.id,
      nom: nameCheck.value,
      niveau: niveauCheck.value,
    });
    res.status(201).json(competence);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Cette competence est deja enregistree' });
    }
    next(error);
  }
};

const updateCompetence = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Identifiant competence invalide' });
    }

    const values = {};

    if (req.body?.nom !== undefined) {
      const nameCheck = validateName(req.body.nom);
      if (nameCheck.error) return res.status(400).json({ message: nameCheck.error });
      values.nom = nameCheck.value;
    }

    if (req.body?.niveau !== undefined) {
      const niveauCheck = validateNiveau(req.body.niveau);
      if (niveauCheck.error) return res.status(400).json({ message: niveauCheck.error });
      values.niveau = niveauCheck.value;
    }

    if (Object.keys(values).length === 0) {
      return res.status(400).json({ message: 'Aucune modification fournie' });
    }

    // La competence doit appartenir au candidat authentifie.
    const owned = await Competence.findOwned(id, req.user.id);
    if (!owned) return res.status(404).json({ message: 'Competence introuvable' });

    if (values.nom && values.nom.toLowerCase() !== owned.nom.toLowerCase()) {
      const duplicate = await Competence.findByCandidatAndName(req.user.id, values.nom);
      if (duplicate && duplicate.id !== owned.id) {
        return res.status(409).json({ message: 'Cette competence est deja enregistree' });
      }
    }

    const competence = await Competence.update(id, req.user.id, values);
    res.json(competence);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Cette competence est deja enregistree' });
    }
    next(error);
  }
};

const deleteCompetence = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Identifiant competence invalide' });
    }

    const deleted = await Competence.delete(id, req.user.id);
    if (!deleted) return res.status(404).json({ message: 'Competence introuvable' });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listMesCompetences,
  listCompetencesCandidat,
  createCompetence,
  updateCompetence,
  deleteCompetence,
};
