const Payslip = require("../models/Payslip");
const notificationService = require("./notificationService");

exports.getAll = async (query = {}) => {
  const filter = {};
  if (query.userId) filter.userId = query.userId;
  if (query.month) filter.month = parseInt(query.month);
  if (query.year) filter.year = parseInt(query.year);
  return Payslip.find(filter).sort({ year: -1, month: -1 });
};

exports.getById = async (id) => {
  const payslip = await Payslip.findById(id);
  if (!payslip) throw Object.assign(new Error("Payslip tidak ditemukan"), { statusCode: 404 });
  return payslip;
};

exports.create = async (data) => {
  const payslip = await Payslip.create(data);

  // Notify the employee
  try {
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    await notificationService.createForUsers([data.userId], {
      title: "Slip Gaji Baru",
      message: `Slip gaji ${monthNames[data.month - 1] || ""} ${data.year} telah tersedia`,
      type: "info",
      category: "payslip",
    });
  } catch (err) {
    console.error("Failed to notify about payslip:", err);
  }

  return payslip;
};

exports.update = async (id, data) => {
  const payslip = await Payslip.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!payslip) throw Object.assign(new Error("Payslip tidak ditemukan"), { statusCode: 404 });
  return payslip;
};

exports.remove = async (id) => {
  const payslip = await Payslip.findByIdAndDelete(id);
  if (!payslip) throw Object.assign(new Error("Payslip tidak ditemukan"), { statusCode: 404 });
  return { message: "Payslip berhasil dihapus" };
};
