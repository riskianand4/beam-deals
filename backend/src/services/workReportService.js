const WorkReport = require("../models/WorkReport");
const User = require("../models/User");
const notificationService = require("./notificationService");

exports.getByUserId = async (userId) => {
  return WorkReport.find({ userId }).sort({ createdAt: -1 });
};

exports.getRecent = async (limit = 10) => {
  return WorkReport.find().sort({ createdAt: -1 }).limit(limit);
};

exports.create = async (data, actorId) => {
  const report = await WorkReport.create(data);

  // Notify admins
  try {
    const admins = await User.find({ role: "admin", _id: { $ne: actorId } });
    const actor = await User.findById(actorId);
    await notificationService.createForUsers(
      admins.map(a => a._id.toString()),
      {
        title: "Laporan Kerja Baru",
        message: `${actor?.name || "Karyawan"} mengirim laporan: ${data.title}`,
        type: "info",
        category: "work_report",
      }
    );
  } catch (err) {
    console.error("Failed to notify admins about work report:", err);
  }

  return report;
};

exports.remove = async (id, userId) => {
  const report = await WorkReport.findById(id);
  if (!report) throw Object.assign(new Error("Laporan tidak ditemukan"), { statusCode: 404 });
  if (report.userId !== userId) throw Object.assign(new Error("Tidak memiliki akses"), { statusCode: 403 });
  await WorkReport.findByIdAndDelete(id);
  return { message: "Laporan berhasil dihapus" };
};
