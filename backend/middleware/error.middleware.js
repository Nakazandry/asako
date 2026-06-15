const notFound = (req, res, next) => {
  const error = new Error(`Route introuvable: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (error, _req, res, _next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: error.message || 'Erreur serveur',
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  });
};

module.exports = { notFound, errorHandler };
