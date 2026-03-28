const Payslip = require("../models/Payslip");

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
  return Payslip.create(data);
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
