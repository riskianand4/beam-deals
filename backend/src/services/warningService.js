const WarningLetter = require("../models/WarningLetter");
const notificationService = require("./notificationService");

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

exports.getByUserId = async (userId) => {
  // Auto-expire
  await WarningLetter.updateMany(
    { userId, status: "active", expiresAt: { $lt: new Date() } },
    { $set: { status: "expired" } }
  );
  return WarningLetter.find({ userId }).sort({ issuedDate: -1 });
};

exports.getActiveByUserId = async (userId) => {
  await WarningLetter.updateMany(
    { userId, status: "active", expiresAt: { $lt: new Date() } },
    { $set: { status: "expired" } }
  );
  return WarningLetter.find({ userId, status: "active" }).sort({ issuedDate: -1 });
};

exports.create = async (data) => {
  const expiresAt = new Date(data.issuedDate || Date.now());
  expiresAt.setTime(expiresAt.getTime() + SIX_MONTHS_MS);
  const letter = await WarningLetter.create({ ...data, expiresAt });

  // Notify the employee
  if (data.userId) {
    try {
      await notificationService.create({
        userId: data.userId,
        title: "Surat Peringatan Diterbitkan",
        message: `Anda menerima Surat Peringatan (SP ${data.level || ""}) dari manajemen`,
        type: "warning",
        category: "general",
      });
    } catch (err) {
      console.error("[Warning] Failed to notify:", err);
    }
  }

  return letter;
};

exports.remove = async (id) => {
  const doc = await WarningLetter.findByIdAndDelete(id);
  if (!doc) throw Object.assign(new Error("SP tidak ditemukan"), { statusCode: 404 });
  return { message: "SP berhasil dihapus" };
};

// Check if any user has active SP (for badge)
exports.getActiveSPForUser = async (userId) => {
  await WarningLetter.updateMany(
    { userId, status: "active", expiresAt: { $lt: new Date() } },
    { $set: { status: "expired" } }
  );
  return WarningLetter.find({ userId, status: "active" }).sort({ issuedDate: -1 });
};
