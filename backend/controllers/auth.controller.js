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

const updateProfile = async (req, res, next) => {
  try {
    const { nom, prenom, email } = req.body;
    const file = req.file;
    const values = {};

    if (nom !== undefined) {
      if (typeof nom !== 'string' || !nom.trim()) {
        return res.status(400).json({ message: 'Le nom ne peut pas etre vide' });
      }
      values.nom = nom.trim();
    }
    if (prenom !== undefined) {
      if (typeof prenom !== 'string' || !prenom.trim()) {
        return res.status(400).json({ message: 'Le prenom ne peut pas etre vide' });
      }
      values.prenom = prenom.trim();
    }
    if (email !== undefined) {
      const normalized = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        return res.status(400).json({ message: 'Adresse email invalide' });
      }
      const existing = await Utilisateur.findByEmail(normalized);
      if (existing && existing.id !== req.user.id) {
        return res.status(409).json({ message: 'Cet email est deja utilise' });
      }
      values.email = normalized;
    }
    if (file) {
      values.photo_data = file.buffer;
      values.photo_type = file.mimetype;
    }

    if (Object.keys(values).length === 0) {
      return res.status(400).json({ message: 'Aucune modification fournie' });
    }

    await Utilisateur.updateProfile(req.user.id, values);
    const user = await Utilisateur.findById(req.user.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const getPhoto = async (req, res, next) => {
  try {
    const photo = await Utilisateur.getPhoto(req.user.id);
    if (!photo || !photo.photo_data) {
      return res.status(404).json({ message: 'Photo de profil introuvable' });
    }
    res.setHeader('Content-Type', photo.photo_type || 'application/octet-stream');
    res.setHeader('Content-Length', photo.photo_data.length);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(photo.photo_data);
  } catch (error) {
    next(error);
  }
};

const removePhoto = async (req, res, next) => {
  try {
    await Utilisateur.updateProfile(req.user.id, { photo_data: null, photo_type: null });
    const user = await Utilisateur.findById(req.user.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, me, updateProfile, getPhoto, removePhoto };
