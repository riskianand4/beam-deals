const taskService = require("../services/taskService");
const User = require("../models/User");

exports.prepareUpload = async (req, res, next) => {
  try {
    req.uploadContext = "task";
    if (req.userId) {
      const u = await User.findById(req.userId);
      if (u) req.uploadUserMeta = { name: u.name, position: u.position };
    }
    next();
  } catch (err) { next(err); }
};

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
      { id: req.userId, name: req.user.name, role: req.user.role }
    ));
  } catch (err) { next(err); }
};

exports.addNote = async (req, res, next) => {
  try {
    const attachments = (req.files || []).map((file) => ({
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      url: "/uploads" + file.path.split("uploads")[1],
      uploadedBy: req.userId,
    }));
    const note = {
      text: req.body.text || "",
      authorId: req.body.authorId || req.userId,
      attachments,
    };
    res.json(await taskService.addNote(req.params.id, note));
  } catch (err) { next(err); }
};

exports.editNote = async (req, res, next) => {
  try {
    res.json(await taskService.editNote(req.params.id, req.params.noteId, req.body, req.userId));
  } catch (err) { next(err); }
};

exports.deleteNote = async (req, res, next) => {
  try {
    res.json(await taskService.deleteNote(req.params.id, req.params.noteId, req.userId));
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try { res.json(await taskService.remove(req.params.id)); } catch (err) { next(err); }
};
