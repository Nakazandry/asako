const router = require('express').Router();
const controller = require('../controllers/entretien.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', controller.listEntretiens);
router.get('/:id', controller.getEntretien);
router.post('/', authorize('admin'), controller.createEntretien);
router.put('/:id', authorize('admin'), controller.updateEntretien);
router.delete('/:id', authorize('admin'), controller.deleteEntretien);

module.exports = router;
