const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Utilisateur = require('../models/utilisateur.model');

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'asako_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const authResponse = (res, user) => {
  res.json({ token: signToken(user), user });
};

const register = async (req, res, next) => {
  try {
    const { nom, prenom, email, mot_de_passe } = req.body;
    if (!nom || !prenom || !email || !mot_de_passe) {
      return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
    }

    const exists = await Utilisateur.findByEmail(email);
    if (exists) return res.status(409).json({ message: 'Cet email est deja utilise' });

    const hash = await bcrypt.hash(mot_de_passe, 10);
    const user = await Utilisateur.create({ nom, prenom, email, mot_de_passe: hash, role: 'candidat' });
    res.status(201);
    authResponse(res, user);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, mot_de_passe } = req.body;
    const userWithPassword = await Utilisateur.findByEmail(email);
    if (!userWithPassword) return res.status(401).json({ message: 'Identifiants invalides' });

    const valid = await bcrypt.compare(mot_de_passe, userWithPassword.mot_de_passe);
    if (!valid) return res.status(401).json({ message: 'Identifiants invalides' });

    const { mot_de_passe: _ignored, ...user } = userWithPassword;
    authResponse(res, user);
  } catch (error) {
    next(error);
  }
};

const me = async (req, res) => {
  res.json(req.user);
};

module.exports = { register, login, me };
