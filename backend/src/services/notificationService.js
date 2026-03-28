const Notification = require("../models/Notification");

exports.getByUserId = async (userId) => {
  return Notification.find({ userId }).sort({ timestamp: -1 }).limit(20);
};

exports.create = async (data) => {
  return Notification.create(data);
};

exports.markAllRead = async (userId) => {
  await Notification.updateMany({ userId, read: false }, { read: true });
  return { message: "Semua notifikasi ditandai sudah dibaca" };
};

exports.markRead = async (id) => {
  const notif = await Notification.findByIdAndUpdate(id, { read: true }, { new: true });
  if (!notif) throw Object.assign(new Error("Notifikasi tidak ditemukan"), { statusCode: 404 });
  return notif;
};

exports.getUnreadCount = async (userId) => {
  return Notification.countDocuments({ userId, read: false });
};
