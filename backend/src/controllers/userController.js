const userService = require("../services/userService");
const User = require("../models/User");

exports.getAll = async (req, res, next) => {
  try { res.json(await userService.getAll(req.query)); } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try { res.json(await userService.getById(req.params.id)); } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try { res.status(201).json(await userService.create(req.body)); } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try { res.json(await userService.update(req.params.id, req.body)); } catch (err) { next(err); }
};

exports.updateProfile = async (req, res, next) => {
  try { res.json(await userService.updateProfile(req.userId, req.body)); } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try { res.json(await userService.remove(req.params.id)); } catch (err) { next(err); }
};

// Self avatar upload - sets upload context for middleware
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) throw Object.assign(new Error("File tidak ditemukan"), { statusCode: 400 });
    const avatarPath = req.file.path.split("uploads")[1];
    const user = await userService.updateProfile(req.userId, { avatar: "/uploads" + avatarPath });
    res.json({ avatar: user.avatar });
  } catch (err) { next(err); }
};

// Middleware to set upload context for self avatar
exports.prepareAvatarUpload = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (user) {
      req.uploadContext = "avatar";
      req.uploadUserMeta = { position: user.position, name: user.name };
    }
    next();
  } catch (err) { next(err); }
};

// Admin avatar upload for a specific user
exports.uploadAvatarForUser = async (req, res, next) => {
  try {
    if (!req.file) throw Object.assign(new Error("File tidak ditemukan"), { statusCode: 400 });
    const avatarPath = req.file.path.split("uploads")[1];
    const user = await userService.update(req.params.id, { avatar: "/uploads" + avatarPath });
    res.json({ avatar: user.avatar });
  } catch (err) { next(err); }
};

// Middleware to set upload context for admin avatar of target user
exports.prepareAdminAvatarUpload = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      req.uploadContext = "avatar";
      req.uploadUserMeta = { position: user.position, name: user.name };
    }
    next();
  } catch (err) { next(err); }
};

exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) throw Object.assign(new Error("File tidak ditemukan"), { statusCode: 400 });
    const avatarPath = "/uploads/" + req.file.filename;
    const user = await userService.updateProfile(req.userId, { avatar: avatarPath });
    res.json({ avatar: user.avatar });
  } catch (err) { next(err); }
};

exports.getReviewers = async (req, res, next) => {
  try { res.json(await userService.getReviewers()); } catch (err) { next(err); }
};

exports.getApprovers = async (req, res, next) => {
  try { res.json(await userService.getApprovers()); } catch (err) { next(err); }
};
