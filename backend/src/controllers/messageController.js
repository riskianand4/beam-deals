const messageService = require("../services/messageService");
const User = require("../models/User");

exports.prepareUpload = async (req, res, next) => {
  try {
    req.uploadContext = "message";
    if (req.userId) {
      const u = await User.findById(req.userId);
      if (u) req.uploadUserMeta = { name: u.name, position: u.position };
    }
    next();
  } catch (err) { next(err); }
};

exports.getAll = async (req, res, next) => {
  try { res.json(await messageService.getAll(req.query)); } catch (err) { next(err); }
};

exports.getThread = async (req, res, next) => {
  try { res.json(await messageService.getThreadMessages(req.params.threadId)); } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.attachmentUrl = "/uploads" + req.file.path.split("uploads")[1];
    }
    if (typeof data.ccUserIds === "string") {
      try { data.ccUserIds = JSON.parse(data.ccUserIds); } catch { data.ccUserIds = []; }
    }
    res.status(201).json(await messageService.create(data, req.user.name));
  } catch (err) { next(err); }
};

exports.updateStatus = async (req, res, next) => {
  try { res.json(await messageService.updateStatus(req.params.id, req.body.status)); } catch (err) { next(err); }
};

exports.markAsRead = async (req, res, next) => {
  try { res.json(await messageService.markAsRead(req.params.id)); } catch (err) { next(err); }
};

exports.approve = async (req, res, next) => {
  try {
    res.json(await messageService.approveMessage(req.params.id, req.body.action, req.body.reason, req.user.name));
  } catch (err) { next(err); }
};

exports.getUnreadCount = async (req, res, next) => {
  try { res.json({ count: await messageService.getUnreadCount(req.userId) }); } catch (err) { next(err); }
};

exports.getPendingRequestCount = async (req, res, next) => {
  try { res.json({ count: await messageService.getPendingRequestCount(req.userId) }); } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try { res.json(await messageService.remove(req.params.id, req.user.id)); } catch (err) { next(err); }
};

// Group chat
exports.createGroup = async (req, res, next) => {
  try {
    const { name, memberIds } = req.body;
    if (!name || !memberIds || memberIds.length === 0) {
      throw Object.assign(new Error("Nama dan anggota diperlukan"), { statusCode: 400 });
    }
    const allMembers = Array.from(new Set([req.userId, ...memberIds]));
    const group = await messageService.createGroup(name, allMembers, req.userId);
    res.status(201).json(group);
  } catch (err) { next(err); }
};

exports.getGroups = async (req, res, next) => {
  try { res.json(await messageService.getGroups(req.userId)); } catch (err) { next(err); }
};

exports.getGroupMessages = async (req, res, next) => {
  try { res.json(await messageService.getGroupMessages(req.params.groupId)); } catch (err) { next(err); }
};

exports.deleteGroup = async (req, res, next) => {
  try { res.json(await messageService.deleteGroup(req.params.groupId, req.userId)); } catch (err) { next(err); }
};

exports.leaveGroup = async (req, res, next) => {
  try { res.json(await messageService.leaveGroup(req.params.groupId, req.userId)); } catch (err) { next(err); }
};

exports.updateGroupAvatar = async (req, res, next) => {
  try {
    let avatarUrl = "";
    if (req.file) {
      avatarUrl = "/uploads" + req.file.path.split("uploads")[1];
    } else if (req.body.avatar) {
      avatarUrl = req.body.avatar;
    }
    res.json(await messageService.updateGroupAvatar(req.params.groupId, req.userId, avatarUrl));
  } catch (err) { next(err); }
};

exports.pinMessage = async (req, res, next) => {
  try { res.json(await messageService.pinMessage(req.params.id)); } catch (err) { next(err); }
};

exports.deleteThread = async (req, res, next) => {
  try { res.json(await messageService.deleteThread(req.params.threadId, req.userId)); } catch (err) { next(err); }
};
