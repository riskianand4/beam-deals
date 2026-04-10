const Notification = require("../models/Notification");
const NotificationChannel = require("../models/NotificationChannel");
const User = require("../models/User");
const whatsappService = require("./whatsappService");
const emailService = require("./emailService");
const { buildMessage, buildSubject } = require("./notificationTemplates");

async function sendExternalNotifications(notification, user) {
  try {
    const channelDoc = await NotificationChannel.findOne();
    if (!channelDoc) return;

    const category = notification.category || "general";
    const categorySettings = channelDoc.categories?.[mapCategoryKey(category)];

    const templateData = {
      name: user?.name || "kamu",
      title: notification.title || "",
      status: notification.message || "",
      sender: notification.sender || "",
      month: notification.month || "",
    };

    // WhatsApp
    if (channelDoc.whatsapp?.enabled && categorySettings?.whatsapp && user?.whatsapp) {
      const message = buildMessage(category, templateData);
      whatsappService.sendMessage(user.whatsapp, message).catch(err => {
        console.error("[Notification] WA send failed:", err);
      });
    }

    // Email
    if (channelDoc.email?.enabled && categorySettings?.email && user?.email) {
      const subject = buildSubject(category, templateData);
      const body = buildMessage(category, templateData);
      emailService.sendEmail(user.email, subject, body).catch(err => {
        console.error("[Notification] Email send failed:", err);
      });
    }
  } catch (err) {
    console.error("[Notification] External send error:", err);
  }
}

function mapCategoryKey(category) {
  const map = {
    task: "tugas",
    announcement: "pengumuman",
    approval: "persetujuan",
    attendance: "kehadiran",
    message: "pesan",
    payslip: "tugas",
    finance: "persetujuan",
    explorer: "pengumuman",
    partner: "pengumuman",
    team: "tugas",
    work_report: "tugas",
    general: "pengumuman",
  };
  return map[category] || "pengumuman";
}

exports.getByUserId = async (userId) => {
  return Notification.find({ userId }).sort({ timestamp: -1 }).limit(50);
};

exports.create = async (data) => {
  const notif = await Notification.create(data);

  // Send external notifications
  if (data.userId) {
    const user = await User.findById(data.userId);
    if (user) sendExternalNotifications(data, user);
  }

  return notif;
};

exports.createForUsers = async (userIds, data) => {
  if (!userIds || userIds.length === 0) return;
  const notifications = userIds.map(uid => ({
    ...data,
    userId: uid,
  }));
  try {
    await Notification.insertMany(notifications);

    // Send external notifications to each user
    const users = await User.find({ _id: { $in: userIds } });
    for (const user of users) {
      sendExternalNotifications({ ...data, userId: user._id.toString() }, user);
    }
  } catch (err) {
    console.error("Failed to create notifications:", err);
  }
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

exports.markCategoryRead = async (userId, category) => {
  await Notification.updateMany({ userId, category, read: false }, { read: true });
  return { message: "Notifikasi kategori ditandai sudah dibaca" };
};

exports.getUnreadCount = async (userId) => {
  return Notification.countDocuments({ userId, read: false });
};

exports.getBadgeCounts = async (userId) => {
  const results = await Notification.aggregate([
    { $match: { userId, read: false } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  const counts = {};
  results.forEach(r => { counts[r._id] = r.count; });
  return counts;
};

exports.deleteById = async (id, userId) => {
  const notif = await Notification.findById(id);
  if (!notif) throw Object.assign(new Error("Notifikasi tidak ditemukan"), { statusCode: 404 });
  if (notif.userId !== userId) throw Object.assign(new Error("Tidak memiliki akses"), { statusCode: 403 });
  await Notification.findByIdAndDelete(id);
  return { message: "Notifikasi berhasil dihapus" };
};

exports.deleteAll = async (userId) => {
  await Notification.deleteMany({ userId });
  return { message: "Semua notifikasi berhasil dihapus" };
};
