const Notification = require('../models/notification.model');

const listNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const [rows, unread, total] = await Promise.all([
      Notification.listByUser(req.user.id, { limit }),
      Notification.unreadCount(req.user.id),
      Notification.countAll(req.user.id),
    ]);
    res.json({ data: rows, unread, total });
  } catch (error) {
    next(error);
  }
};

const unreadCount = async (req, res, next) => {
  try {
    const count = await Notification.unreadCount(req.user.id);
    res.json({ count });
  } catch (error) {
    next(error);
  }
};

const markRead = async (req, res, next) => {
  try {
    const notification = await Notification.markRead(req.params.id, req.user.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification introuvable' });
    }
    res.json(notification);
  } catch (error) {
    next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const count = await Notification.markAllRead(req.user.id);
    res.json({ count });
  } catch (error) {
    next(error);
  }
};

module.exports = { listNotifications, unreadCount, markRead, markAllRead };
