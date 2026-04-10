const approvalService = require("../services/approvalService");
const User = require("../models/User");

exports.prepareUpload = async (req, res, next) => {
  try {
    req.uploadContext = "approval";
    if (req.userId) {
      const user = await User.findById(req.userId);
      if (user) req.uploadUserMeta = { name: user.name, position: user.position };
    }
    next();
  } catch (err) { next(err); }
};

exports.getAll = async (req, res, next) => {
  try {
    res.json(await approvalService.getAll(req.userId, req.user.role, req.user.position));
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body, requesterId: req.userId };
    if (typeof data.approvers === "string") {
      data.approvers = JSON.parse(data.approvers);
    }
    if (typeof data.cc === "string") {
      data.cc = JSON.parse(data.cc);
    }
    if (req.file) {
      data.attachmentUrl = "/uploads" + req.file.path.split("uploads")[1];
    }
    res.status(201).json(await approvalService.create(data));
  } catch (err) { next(err); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    res.json(await approvalService.updateStatus(req.params.id, req.body.status, req.userId));
  } catch (err) { next(err); }
};

exports.respond = async (req, res, next) => {
  try {
    const responseAttachmentUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        responseAttachmentUrls.push("/uploads" + file.path.split("uploads")[1]);
      }
    }
    res.json(await approvalService.respond(req.params.id, req.userId, req.body.action, req.body.reason, responseAttachmentUrls));
  } catch (err) { next(err); }
};

exports.addComment = async (req, res, next) => {
  try {
    let attachmentUrl = "";
    if (req.file) {
      attachmentUrl = "/uploads" + req.file.path.split("uploads")[1];
    }
    res.json(await approvalService.addComment(req.params.id, req.userId, req.body.text, attachmentUrl));
  } catch (err) { next(err); }
};

exports.editResponse = async (req, res, next) => {
  try {
    const attachmentUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        attachmentUrls.push("/uploads" + file.path.split("uploads")[1]);
      }
    }
    const data = { ...req.body };
    if (attachmentUrls.length > 0) data.attachmentUrls = attachmentUrls;
    res.json(await approvalService.editResponse(req.params.id, req.userId, data));
  } catch (err) { next(err); }
};

exports.resetResponse = async (req, res, next) => {
  try {
    res.json(await approvalService.resetResponse(req.params.id, req.userId));
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    res.json(await approvalService.remove(req.params.id, req.userId, req.user.role, req.user.position));
  } catch (err) { next(err); }
};
