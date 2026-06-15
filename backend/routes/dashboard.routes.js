const router = require('express').Router();
const { getDashboard } = require('../controllers/dashboard.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.get('/', protect, authorize('admin'), getDashboard);

module.exports = router;
