const router = require('express').Router();
const controller = require('../controllers/offre.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.get('/', controller.listOffres);
router.get('/:id', controller.getOffre);
router.post('/', protect, authorize('admin'), controller.createOffre);
router.put('/:id', protect, authorize('admin'), controller.updateOffre);
router.delete('/:id', protect, authorize('admin'), controller.deleteOffre);

module.exports = router;
