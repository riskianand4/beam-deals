const notificationService = require("../services/notificationService");

exports.getMyNotifications = async (req, res, next) => {
  try { res.json(await notificationService.getByUserId(req.userId)); } catch (err) { next(err); }
};

exports.markAllRead = async (req, res, next) => {
  try { res.json(await notificationService.markAllRead(req.userId)); } catch (err) { next(err); }
};

exports.markRead = async (req, res, next) => {
  try { res.json(await notificationService.markRead(req.params.id)); } catch (err) { next(err); }
};

exports.getUnreadCount = async (req, res, next) => {
  try { res.json({ count: await notificationService.getUnreadCount(req.userId) }); } catch (err) { next(err); }
};
