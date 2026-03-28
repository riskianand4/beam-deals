const noteService = require("../services/noteService");

exports.getDailyNotes = async (req, res, next) => {
  try { res.json(await noteService.getDailyNotes(req.query.userId || req.userId, req.query.date)); } catch (err) { next(err); }
};

exports.createDailyNote = async (req, res, next) => {
  try { res.status(201).json(await noteService.createDailyNote({ ...req.body, userId: req.userId })); } catch (err) { next(err); }
};

exports.updateDailyNote = async (req, res, next) => {
  try { res.json(await noteService.updateDailyNote(req.params.id, req.body.content)); } catch (err) { next(err); }
};

exports.deleteDailyNote = async (req, res, next) => {
  try { res.json(await noteService.deleteDailyNote(req.params.id)); } catch (err) { next(err); }
};

exports.getAdminNotes = async (req, res, next) => {
  try { res.json(await noteService.getAdminNotes(req.query)); } catch (err) { next(err); }
};

exports.createAdminNote = async (req, res, next) => {
  try {
    const data = { ...req.body, fromAdminId: req.userId };
    res.status(201).json(await noteService.createAdminNote(data, { id: req.userId, role: req.user.role }));
  } catch (err) { next(err); }
};

exports.deleteAdminNote = async (req, res, next) => {
  try { res.json(await noteService.deleteAdminNote(req.params.id)); } catch (err) { next(err); }
};

exports.getBossNotes = async (req, res, next) => {
  try { res.json(await noteService.getBossNotes()); } catch (err) { next(err); }
};

exports.getBossNote = async (req, res, next) => {
  try { res.json(await noteService.getBossNote(req.params.employeeId)); } catch (err) { next(err); }
};

exports.upsertBossNote = async (req, res, next) => {
  try { res.json(await noteService.upsertBossNote(req.params.employeeId, req.body.content)); } catch (err) { next(err); }
};
