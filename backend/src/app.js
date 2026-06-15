const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('../routes/auth.routes');
const utilisateurRoutes = require('../routes/utilisateur.routes');
const offreRoutes = require('../routes/offre.routes');
const candidatureRoutes = require('../routes/candidature.routes');
const entretienRoutes = require('../routes/entretien.routes');
const dashboardRoutes = require('../routes/dashboard.routes');
const { notFound, errorHandler } = require('../middleware/error.middleware');

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
  app.get("/", (req, res) => {
    res.json({
      message: "API ASAKO fonctionne 🚀",
      status: "OK",
    });
  });

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origine non autorisee par CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'ASAKO' });
});

app.use('/api/auth', authRoutes);
app.use('/api/utilisateurs', utilisateurRoutes);
app.use('/api/offres', offreRoutes);
app.use('/api/candidatures', candidatureRoutes);
app.use('/api/entretiens', entretienRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
