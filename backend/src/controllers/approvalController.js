const approvalService = require("../services/approvalService");

exports.getAll = async (req, res, next) => {
  try {
    res.json(await approvalService.getAll(req.userId, req.user.role, req.user.position));
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body, requesterId: req.userId };
    if (req.file) {
      data.attachmentUrl = "/uploads/" + req.file.filename;
    }
    res.status(201).json(await approvalService.create(data));
  } catch (err) { next(err); }
};

exports.respond = async (req, res, next) => {
  try {
    res.json(await approvalService.respond(req.params.id, req.userId, req.body.action, req.body.reason));
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    res.json(await approvalService.remove(req.params.id, req.userId));
  } catch (err) { next(err); }
};
