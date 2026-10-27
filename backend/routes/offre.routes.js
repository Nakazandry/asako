const router = require('express').Router();
const controller = require('../controllers/offre.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const uploadImage = require('../middleware/upload-image.middleware');

router.get('/', controller.listOffres);
router.get('/:id', controller.getOffre);
router.get('/:id/photo', controller.getPhoto);
router.post('/', protect, authorize('admin'), uploadImage.single('photo'), controller.createOffre);
router.put('/:id', protect, authorize('admin'), uploadImage.single('photo'), controller.updateOffre);
router.delete('/:id/photo', protect, authorize('admin'), controller.removePhoto);
router.delete('/:id', protect, authorize('admin'), controller.deleteOffre);

module.exports = router;
