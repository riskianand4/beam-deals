const authService = require("../services/authService");

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) { next(err); }
};

exports.register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.userId);
    res.json(user);
  } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.params.userId, req.body.password);
    res.json(result);
  } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Kata sandi saat ini dan baru wajib diisi" });
    }
    const result = await authService.changePassword(req.userId, currentPassword, newPassword);
    res.json(result);
  } catch (err) { next(err); }
};
