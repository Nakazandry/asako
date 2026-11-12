const router = require('express').Router();
const controller = require('../controllers/chatbot.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { aiRateLimiter, aiChatRateLimiter } = require('../middleware/rate-limit.middleware');

// Aucune route du chatbot n'est accessible sans JWT valide et sans role autorise.
router.use(protect, authorize('candidat', 'admin'), aiRateLimiter);

router.post('/conversations', controller.createConversation);
router.get('/conversations', controller.listConversations);
router.get('/conversations/:id', controller.getConversation);
router.patch('/conversations/:id', controller.renameConversation);
router.delete('/conversations/:id', controller.deleteConversation);

// Appel effectif a Gemini: limiteur dedie, plus strict que la lecture.
router.post('/conversations/:id/messages', aiChatRateLimiter, controller.sendMessage);

module.exports = router;
