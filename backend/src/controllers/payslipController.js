const payslipService = require("../services/payslipService");
const User = require("../models/User");

// Middleware to set upload context before multer
exports.prepareUpload = async (req, res, next) => {
  try {
    req.uploadContext = "payslip";
    const userId = req.body.userId || req.query.userId;
    if (userId) {
      const user = await User.findById(userId);
      if (user) req.uploadUserMeta = { name: user.name, position: user.position };
    }
    next();
  } catch (err) { next(err); }
};

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
      data.pdfUrl = "/uploads" + req.file.path.split("uploads")[1];
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
      data.pdfUrl = "/uploads" + req.file.path.split("uploads")[1];
    }
    res.json(await payslipService.update(req.params.id, data));
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try { res.json(await payslipService.remove(req.params.id)); } catch (err) { next(err); }
};

exports.bulkCreate = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw Object.assign(new Error("Tidak ada file yang diupload"), { statusCode: 400 });
    }
    let mapping = req.body.mapping;
    if (typeof mapping === "string") mapping = JSON.parse(mapping);

    const results = [];
    for (const item of mapping) {
      const file = req.files[item.fileIndex];
      if (!file) continue;
      const data = {
        userId: item.userId,
        month: parseInt(item.month),
        year: parseInt(item.year),
        pdfUrl: "/uploads" + file.path.split("uploads")[1],
      };
      const created = await payslipService.create(data);
      results.push(created);
    }
    res.status(201).json(results);
  } catch (err) { next(err); }
};
