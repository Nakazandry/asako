const router = require('express').Router();
const controller = require('../controllers/utilisateur.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect, authorize('admin'));

router.route('/')
  .get(controller.listUtilisateurs)
  .post(controller.createUtilisateur);

router.route('/:id')
  .get(controller.getUtilisateur)
  .put(controller.updateUtilisateur)
  .delete(controller.deleteUtilisateur);

module.exports = router;
