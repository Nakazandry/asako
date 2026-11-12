const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX = 30;
const DEFAULT_CHAT_MAX = 10;

const envNumber = (key, fallback) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const keyParUtilisateur = (req) => {
  // Les routes sont montees derriere `protect`: l'identifiant vient du JWT verifie,
  // jamais du corps de la requete.
  if (req.user && req.user.id) return `user:${req.user.id}`;
  return ipKeyGenerator(req.ip);
};

const createAiRateLimiter = ({ windowMs, limit, message } = {}) =>
  rateLimit({
    windowMs: windowMs || envNumber('AI_RATE_LIMIT_WINDOW_MS', DEFAULT_WINDOW_MS),
    limit: limit || envNumber('AI_RATE_LIMIT_MAX', DEFAULT_MAX),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyParUtilisateur,
    handler: (_req, res) => {
      res.status(429).json({
        message: message || 'Trop de requetes vers l assistant IA, reessayez dans quelques instants',
      });
    },
  });

// Limiteur global du chatbot (lecture des conversations + envoi de messages).
const aiRateLimiter = createAiRateLimiter();

// Limiteur plus strict sur l'appel effectif a Gemini.
const aiChatRateLimiter = createAiRateLimiter({
  limit: envNumber('AI_CHAT_RATE_LIMIT_MAX', DEFAULT_CHAT_MAX),
  message: "Trop de messages envoyes a l'assistant IA, patientez une minute",
});

module.exports = { createAiRateLimiter, aiRateLimiter, aiChatRateLimiter };
