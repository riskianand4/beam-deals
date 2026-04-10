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

// Avatar Base64 — self upload
exports.uploadAvatarBase64 = async (req, res, next) => {
  try {
    const { avatar } = req.body;
    if (!avatar) throw Object.assign(new Error("Avatar data tidak ditemukan"), { statusCode: 400 });
    const user = await userService.updateProfile(req.userId, { avatar });
    res.json({ avatar: user.avatar });
  } catch (err) { next(err); }
};

// Avatar Base64 — admin upload for specific user
exports.uploadAvatarBase64ForUser = async (req, res, next) => {
  try {
    const { avatar } = req.body;
    if (!avatar) throw Object.assign(new Error("Avatar data tidak ditemukan"), { statusCode: 400 });
    const user = await userService.update(req.params.id, { avatar });
    res.json({ avatar: user.avatar });
  } catch (err) { next(err); }
};

exports.getReviewers = async (req, res, next) => {
  try { res.json(await userService.getReviewers()); } catch (err) { next(err); }
};

exports.getApprovers = async (req, res, next) => {
  try { res.json(await userService.getApprovers()); } catch (err) { next(err); }
};
