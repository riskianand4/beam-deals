const warningService = require("../services/warningService");

exports.getByUserId = async (req, res, next) => {
  try {
    res.json(await warningService.getByUserId(req.params.userId));
  } catch (err) { next(err); }
};

exports.getActiveForMe = async (req, res, next) => {
  try {
    res.json(await warningService.getActiveSPForUser(req.userId));
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body, issuedBy: req.userId };
    res.status(201).json(await warningService.create(data));
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    res.json(await warningService.remove(req.params.id));
  } catch (err) { next(err); }
};
