const Contract = require("../models/Contract");

exports.getByUserId = async (userId) => {
  return Contract.find({ userId }).sort({ startDate: -1 });
};

exports.create = async (data) => {
  return Contract.create(data);
};

exports.update = async (id, data) => {
  const contract = await Contract.findByIdAndUpdate(id, data, { new: true });
  if (!contract) throw Object.assign(new Error("Kontrak tidak ditemukan"), { statusCode: 404 });
  return contract;
};

exports.remove = async (id) => {
  const contract = await Contract.findByIdAndDelete(id);
  if (!contract) throw Object.assign(new Error("Kontrak tidak ditemukan"), { statusCode: 404 });
  return { message: "Kontrak berhasil dihapus" };
};
