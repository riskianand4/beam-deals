const Announcement = require("../models/Announcement");
const User = require("../models/User");
const PositionAccess = require("../models/PositionAccess");
const Notification = require("../models/Notification");
const notificationService = require("./notificationService");

const hasAnnouncementAccess = async (user) => {
  if (user.role === "admin") return true;
  const position = user.position || "";
  if (!position) return false;
  const pa = await PositionAccess.findOne({ position });
  return pa?.menus?.pengumuman === true;
};

// Auto-draft expired announcements
const autoExpire = async () => {
  await Announcement.updateMany(
    { status: "active", expiresAt: { $ne: null, $lte: new Date() } },
    { $set: { status: "draft" } }
  );
};

exports.getAll = async (requestUser) => {
  await autoExpire();
  
  if (!requestUser) return Announcement.find({ status: "active" }).sort({ createdAt: -1 });
  
  const user = await User.findById(requestUser.id);
  const hasAccess = user ? await hasAnnouncementAccess(user) : false;
  
  if (hasAccess) {
    return Announcement.find().sort({ createdAt: -1 });
  }
  return Announcement.find({ status: "active" }).sort({ createdAt: -1 });
};

exports.create = async (data, requestUser) => {
  const user = await User.findById(requestUser.id);
  const hasAccess = user ? await hasAnnouncementAccess(user) : false;
  if (!hasAccess) throw Object.assign(new Error("Tidak memiliki akses"), { statusCode: 403 });
  const announcement = await Announcement.create({ ...data, createdBy: requestUser.id });

  // Send notification to all users except creator
  try {
    const allUsers = await User.find({ _id: { $ne: requestUser.id } });
    for (const u of allUsers) {
      await notificationService.create({
        userId: u._id.toString(),
        title: "Pengumuman Baru",
        message: data.title,
        type: "info",
        category: "announcement",
      });
    }
  } catch (err) {
    console.error("Failed to send announcement notifications:", err);
  }

  return announcement;
};

exports.update = async (id, data, requestUser) => {
  const user = await User.findById(requestUser.id);
  const hasAccess = user ? await hasAnnouncementAccess(user) : false;
  if (!hasAccess) throw Object.assign(new Error("Tidak memiliki akses"), { statusCode: 403 });
  const ann = await Announcement.findById(id);
  if (!ann) throw Object.assign(new Error("Tidak ditemukan"), { statusCode: 404 });
  ann.title = data.title ?? ann.title;
  ann.content = data.content ?? ann.content;
  if (data.expiresAt !== undefined) ann.expiresAt = data.expiresAt || null;
  if (data.status !== undefined) ann.status = data.status;
  await ann.save();
  return ann;
};

exports.remove = async (id, requestUser) => {
  const user = await User.findById(requestUser.id);
  const hasAccess = user ? await hasAnnouncementAccess(user) : false;
  if (!hasAccess) throw Object.assign(new Error("Tidak memiliki akses"), { statusCode: 403 });
  await Announcement.findByIdAndDelete(id);
  return { message: "Berhasil dihapus" };
};
