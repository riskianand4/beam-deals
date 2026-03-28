const DailyNote = require("../models/DailyNote");
const AdminNote = require("../models/AdminNote");
const BossNote = require("../models/BossNote");
const User = require("../models/User");

// Daily notes (employee)
exports.getDailyNotes = async (userId, date) => {
  const filter = { userId };
  if (date) filter.date = date;
  return DailyNote.find(filter).sort({ date: -1 });
};

exports.createDailyNote = async (data) => {
  return DailyNote.create(data);
};

exports.updateDailyNote = async (id, content) => {
  const note = await DailyNote.findByIdAndUpdate(id, { content }, { new: true });
  if (!note) throw Object.assign(new Error("Catatan tidak ditemukan"), { statusCode: 404 });
  return note;
};

exports.deleteDailyNote = async (id) => {
  const note = await DailyNote.findByIdAndDelete(id);
  if (!note) throw Object.assign(new Error("Catatan tidak ditemukan"), { statusCode: 404 });
  return { message: "Catatan berhasil dihapus" };
};

// Admin notes
exports.getAdminNotes = async (query = {}) => {
  const filter = {};
  if (query.toEmployeeId) filter.toEmployeeId = query.toEmployeeId;
  if (query.fromAdminId) filter.fromAdminId = query.fromAdminId;
  return AdminNote.find(filter).sort({ createdAt: -1 });
};

exports.createAdminNote = async (data, requestUser) => {
  // Non-admin users cannot send notes to admin accounts
  if (requestUser && requestUser.role !== "admin" && data.toEmployeeId) {
    const target = await User.findById(data.toEmployeeId);
    if (target && target.role === "admin") {
      throw Object.assign(new Error("Anda tidak bisa mengirim catatan ke admin"), { statusCode: 403 });
    }
  }
  return AdminNote.create(data);
};

exports.deleteAdminNote = async (id) => {
  const note = await AdminNote.findByIdAndDelete(id);
  if (!note) throw Object.assign(new Error("Catatan tidak ditemukan"), { statusCode: 404 });
  return { message: "Catatan berhasil dihapus" };
};

// Boss notes
exports.getBossNotes = async () => {
  return BossNote.find();
};

exports.getBossNote = async (employeeId) => {
  return BossNote.findOne({ employeeId });
};

exports.upsertBossNote = async (employeeId, content) => {
  return BossNote.findOneAndUpdate(
    { employeeId },
    { content, updatedAt: new Date().toISOString() },
    { upsert: true, new: true }
  );
};
