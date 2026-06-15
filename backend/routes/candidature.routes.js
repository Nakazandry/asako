const router = require('express').Router();
const controller = require('../controllers/candidature.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.use(protect);

router.get('/', controller.listCandidatures);
router.get('/:id', controller.getCandidature);
router.post('/', authorize('candidat'), upload.single('cv'), controller.createCandidature);
router.patch('/:id/statut', authorize('admin'), controller.updateStatut);
router.delete('/:id', authorize('admin'), controller.deleteCandidature);

module.exports = router;
