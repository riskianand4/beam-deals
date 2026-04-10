const announcementService = require("../services/announcementService");

exports.getAll = async (req, res, next) => {
  try { res.json(await announcementService.getAll({ id: req.userId, role: req.user.role, position: req.user.position })); } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    res.status(201).json(await announcementService.create(req.body, { id: req.userId, role: req.user.role, position: req.user.position }));
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    res.json(await announcementService.update(req.params.id, req.body, { id: req.userId, role: req.user.role, position: req.user.position }));
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    res.json(await announcementService.remove(req.params.id, { id: req.userId, role: req.user.role, position: req.user.position }));
  } catch (err) { next(err); }
};
