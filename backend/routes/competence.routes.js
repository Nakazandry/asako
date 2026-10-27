const router = require('express').Router();
const controller = require('../controllers/competence.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

// Candidat connecte: ses propres competences.
router.get('/', controller.listMesCompetences);
router.post('/', authorize('candidat'), controller.createCompetence);
router.put('/:id', authorize('candidat'), controller.updateCompetence);
router.delete('/:id', authorize('candidat'), controller.deleteCompetence);

// Recruteur (admin): consultation des competences d'un candidat.
router.get('/candidat/:candidatId', authorize('admin'), controller.listCompetencesCandidat);

module.exports = router;
