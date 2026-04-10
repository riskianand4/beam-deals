const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../config/env");

const generateToken = (userId) => {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
};

exports.login = async (email, password) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw Object.assign(new Error("Email atau password salah"), { statusCode: 401 });

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw Object.assign(new Error("Email atau password salah"), { statusCode: 401 });

  const token = generateToken(user._id);
  return { user: user.toJSON(), token };
};

exports.register = async (data) => {
  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) throw Object.assign(new Error("Email sudah terdaftar"), { statusCode: 400 });

  const user = await User.create(data);
  const token = generateToken(user._id);
  return { user: user.toJSON(), token };
};

exports.getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error("User tidak ditemukan"), { statusCode: 404 });
  return user.toJSON();
};

exports.resetPassword = async (userId, newPassword) => {
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error("User tidak ditemukan"), { statusCode: 404 });
  user.password = newPassword;
  await user.save();
  return { message: "Password berhasil direset" };
};

exports.changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error("User tidak ditemukan"), { statusCode: 404 });

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw Object.assign(new Error("Kata sandi saat ini salah"), { statusCode: 401 });

  user.password = newPassword;
  await user.save();
  return { message: "Kata sandi berhasil diubah" };
};
