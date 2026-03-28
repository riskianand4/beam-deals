const taskService = require("../services/taskService");

exports.getAll = async (req, res, next) => {
  try { res.json(await taskService.getAll(req.query, { id: req.userId, role: req.user.role })); } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try { res.json(await taskService.getById(req.params.id)); } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body, createdBy: req.userId };
    res.status(201).json(await taskService.create(data, { id: req.userId, name: req.user.name, role: req.user.role }));
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try { res.json(await taskService.update(req.params.id, req.body)); } catch (err) { next(err); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    res.json(await taskService.updateStatus(
      req.params.id,
      req.body.status,
      { id: req.userId, name: req.user.name, role: req.user.role },
      req.body.reviewerIds || (req.body.reviewerId ? [req.body.reviewerId] : [])
    ));
  } catch (err) { next(err); }
};

exports.reviewTask = async (req, res, next) => {
  try {
    res.json(await taskService.reviewTask(
      req.params.id,
      req.body.action,
      req.body.reason || "",
      { id: req.userId, name: req.user.name, role: req.user.role }
    ));
  } catch (err) { next(err); }
};

exports.uploadAttachments = async (req, res, next) => {
  try {
    if (!req.files?.length) throw Object.assign(new Error("File tidak ditemukan"), { statusCode: 400 });
    const attachments = req.files.map((file) => ({
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      url: `/uploads/Tugas/${file.filename}`,
    }));
    res.json(await taskService.uploadAttachments(req.params.id, attachments));
  } catch (err) { next(err); }
};

exports.addNote = async (req, res, next) => {
  try { res.json(await taskService.addNote(req.params.id, req.body)); } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try { res.json(await taskService.remove(req.params.id)); } catch (err) { next(err); }
};
