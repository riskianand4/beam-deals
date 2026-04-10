const Document = require("../models/Document");

exports.getByUserId = async (userId) => {
  return Document.find({ userId }).sort({ uploadedAt: -1 });
};

exports.getAll = async () => {
  return Document.find().sort({ uploadedAt: -1 });
};

exports.create = async (data) => {
  // Remove existing doc of same type for user
  await Document.deleteMany({ userId: data.userId, type: data.type });
  return Document.create(data);
};

exports.remove = async (id) => {
  const doc = await Document.findByIdAndDelete(id);
  if (!doc) throw Object.assign(new Error("Dokumen tidak ditemukan"), { statusCode: 404 });
  return { message: "Dokumen berhasil dihapus" };
};
