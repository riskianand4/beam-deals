const payslipService = require("../services/payslipService");

exports.getAll = async (req, res, next) => {
  try { res.json(await payslipService.getAll(req.query)); } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try { res.json(await payslipService.getById(req.params.id)); } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = {
      userId: req.body.userId,
      month: parseInt(req.body.month),
      year: parseInt(req.body.year),
      paydayDate: parseInt(req.body.paydayDate) || 20,
    };
    if (req.file) {
      data.pdfUrl = "/uploads/" + req.file.filename;
    }
    res.status(201).json(await payslipService.create(data));
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const data = {};
    if (req.body.month) data.month = parseInt(req.body.month);
    if (req.body.year) data.year = parseInt(req.body.year);
    if (req.body.paydayDate) data.paydayDate = parseInt(req.body.paydayDate);
    if (req.file) {
      data.pdfUrl = "/uploads/" + req.file.filename;
    }
    res.json(await payslipService.update(req.params.id, data));
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try { res.json(await payslipService.remove(req.params.id)); } catch (err) { next(err); }
};
