const documentService = require("../services/documentService");
const User = require("../models/User");

exports.getByUserId = async (req, res, next) => {
  try { res.json(await documentService.getByUserId(req.params.userId)); } catch (err) { next(err); }
};

exports.getAll = async (req, res, next) => {
  try { res.json(await documentService.getAll()); } catch (err) { next(err); }
};

// Middleware to set upload context for document uploads
exports.prepareDocUpload = async (req, res, next) => {
  try {
    const userId = req.body.userId || req.userId;
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        req.uploadContext = "user";
        req.uploadUserMeta = { position: user.position, name: user.name };
      }
    }
    next();
  } catch (err) { next(err); }
};

exports.upload = async (req, res, next) => {
  try {
    const fileUrl = req.file ? "/uploads" + req.file.path.split("uploads")[1] : req.body.fileUrl || "";
    const data = {
      userId: req.body.userId || req.userId,
      type: req.body.type,
      fileName: req.file ? req.file.originalname : req.body.fileName,
      fileUrl,
      label: req.body.label || "",
    };
    const doc = await documentService.create(data);
    res.status(201).json(doc);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try { res.json(await documentService.remove(req.params.id)); } catch (err) { next(err); }
};
