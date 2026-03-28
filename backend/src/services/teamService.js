const TeamGroup = require("../models/TeamGroup");

exports.getAll = async () => {
  return TeamGroup.find().sort({ createdAt: -1 });
};

exports.getById = async (id) => {
  const team = await TeamGroup.findById(id);
  if (!team) throw Object.assign(new Error("Tim tidak ditemukan"), { statusCode: 404 });
  return team;
};

exports.create = async (data) => {
  return TeamGroup.create(data);
};

exports.update = async (id, data) => {
  const team = await TeamGroup.findByIdAndUpdate(id, data, { new: true });
  if (!team) throw Object.assign(new Error("Tim tidak ditemukan"), { statusCode: 404 });
  return team;
};

exports.remove = async (id) => {
  const team = await TeamGroup.findByIdAndDelete(id);
  if (!team) throw Object.assign(new Error("Tim tidak ditemukan"), { statusCode: 404 });
  return { message: "Tim berhasil dihapus" };
};
