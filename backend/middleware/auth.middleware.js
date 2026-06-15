const jwt = require('jsonwebtoken');
const Utilisateur = require('../models/utilisateur.model');

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token absent ou invalide' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'asako_secret');
    const user = await Utilisateur.findById(decoded.id);

    if (!user) return res.status(401).json({ message: 'Utilisateur introuvable' });

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Session invalide ou expiree' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Acces non autorise' });
  }
  next();
};

module.exports = { protect, authorize };
