const router = require('express').Router();
const controller = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', controller.listNotifications);
router.get('/unread-count', controller.unreadCount);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', controller.markRead);

module.exports = router;
