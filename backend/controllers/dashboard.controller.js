const Dashboard = require('../models/dashboard.model');

const getDashboard = async (_req, res, next) => {
  try {
    res.json(await Dashboard.stats());
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard };
