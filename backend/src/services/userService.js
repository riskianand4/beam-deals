const User = require("../models/User");
const PositionAccess = require("../models/PositionAccess");

exports.getAll = async (query = {}) => {
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
    ];
  }
  return User.find(filter).sort({ createdAt: -1 });
};

exports.getById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw Object.assign(new Error("User tidak ditemukan"), { statusCode: 404 });
  return user;
};

exports.create = async (data) => {
  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) throw Object.assign(new Error("Email sudah terdaftar"), { statusCode: 400 });
  return User.create(data);
};

exports.update = async (id, data) => {
  // Don't allow password update via this endpoint
  delete data.password;
  const user = await User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!user) throw Object.assign(new Error("User tidak ditemukan"), { statusCode: 404 });
  return user;
};

exports.updateProfile = async (id, data) => {
  const user = await User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!user) throw Object.assign(new Error("User tidak ditemukan"), { statusCode: 404 });
  return user;
};

exports.remove = async (id) => {
  const user = await User.findByIdAndDelete(id);
  if (!user) throw Object.assign(new Error("User tidak ditemukan"), { statusCode: 404 });
  return { message: "User berhasil dihapus" };
};

exports.getReviewers = async () => {
  const posAccess = await PositionAccess.find({ "menus.review": true });
  const positions = posAccess.map((p) => p.position);
  if (positions.length === 0) return [];
  return User.find({ position: { $in: positions } }).sort({ name: 1 });
};

exports.getApprovers = async () => {
  // Get admins + employees with approve access
  const admins = await User.find({ role: "admin" }).sort({ name: 1 });
  const posAccess = await PositionAccess.find({ "menus.approve": true });
  const positions = posAccess.map((p) => p.position);
  const employees = positions.length > 0
    ? await User.find({ role: "employee", position: { $in: positions } }).sort({ name: 1 })
    : [];
  const allIds = new Set();
  const result = [];
  for (const u of [...admins, ...employees]) {
    if (!allIds.has(u.id)) { allIds.add(u.id); result.push(u); }
  }
  return result;
};
