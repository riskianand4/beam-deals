const workReportService = require("../services/workReportService");

exports.getByUserId = async (req, res, next) => {
  try { res.json(await workReportService.getByUserId(req.params.userId)); } catch (err) { next(err); }
};

exports.getRecent = async (req, res, next) => {
  try { res.json(await workReportService.getRecent(20)); } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body, userId: req.userId };
    if (req.file) {
      data.fileUrl = "/uploads" + req.file.path.split("uploads")[1];
    }
    res.status(201).json(await workReportService.create(data, req.userId));
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try { res.json(await workReportService.remove(req.params.id, req.userId)); } catch (err) { next(err); }
};
