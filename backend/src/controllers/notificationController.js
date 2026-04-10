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

exports.markCategoryRead = async (req, res, next) => {
  try { res.json(await notificationService.markCategoryRead(req.userId, req.body.category)); } catch (err) { next(err); }
};

exports.getUnreadCount = async (req, res, next) => {
  try { res.json({ count: await notificationService.getUnreadCount(req.userId) }); } catch (err) { next(err); }
};

exports.getBadgeCounts = async (req, res, next) => {
  try { res.json(await notificationService.getBadgeCounts(req.userId)); } catch (err) { next(err); }
};

exports.deleteNotification = async (req, res, next) => {
  try { res.json(await notificationService.deleteById(req.params.id, req.userId)); } catch (err) { next(err); }
};

exports.clearAll = async (req, res, next) => {
  try { res.json(await notificationService.deleteAll(req.userId)); } catch (err) { next(err); }
};
