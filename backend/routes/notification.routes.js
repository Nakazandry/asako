const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const Candidature = require('../models/candidature.model');

router.get('/', protect, async (req, res, next) => {
  try {
    const count = req.user.role === 'admin'
      ? await Candidature.countUnseenAdmin()
      : await Candidature.countUnseenUser(req.user.id);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
