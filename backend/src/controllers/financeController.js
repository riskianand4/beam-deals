const financeService = require("../services/financeService");
const User = require("../models/User");

exports.getReimbursements = async (req, res, next) => {
  try { res.json(await financeService.getReimbursements(req.query)); } catch (err) { next(err); }
};

exports.createReimbursement = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (typeof data.approvers === "string") data.approvers = JSON.parse(data.approvers);
    if (typeof data.cc === "string") data.cc = JSON.parse(data.cc);
    if (req.file) {
      data.attachmentUrl = "/uploads" + req.file.path.split("uploads")[1];
    }
    // Set upload context for future
    req.uploadContext = "approval";
    if (req.userId) {
      const user = await User.findById(req.userId);
      if (user) req.uploadUserMeta = { name: user.name };
    }
    res.status(201).json(await financeService.createReimbursement(data));
  } catch (err) { next(err); }
};

exports.approveReimbursement = async (req, res, next) => {
  try {
    const { status, paymentNote, paymentDate } = req.body;
    res.json(await financeService.approveReimbursement(req.params.id, req.userId, status, paymentNote, paymentDate));
  } catch (err) { next(err); }
};

exports.respondReimbursement = async (req, res, next) => {
  try {
    const responseAttachmentUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        responseAttachmentUrls.push("/uploads" + file.path.split("uploads")[1]);
      }
    }
    res.json(await financeService.respondReimbursement(req.params.id, req.userId, req.body.action, req.body.reason, responseAttachmentUrls));
  } catch (err) { next(err); }
};

exports.addReimbursementComment = async (req, res, next) => {
  try {
    let attachmentUrl = "";
    if (req.file) {
      attachmentUrl = "/uploads" + req.file.path.split("uploads")[1];
    }
    res.json(await financeService.addReimbursementComment(req.params.id, req.userId, req.body.text, attachmentUrl));
  } catch (err) { next(err); }
};

exports.deleteReimbursement = async (req, res, next) => {
  try {
    res.json(await financeService.deleteReimbursement(req.params.id, req.userId, req.user.role));
  } catch (err) { next(err); }
};

exports.getCashAdvances = async (req, res, next) => {
  try { res.json(await financeService.getCashAdvances(req.query)); } catch (err) { next(err); }
};

exports.createCashAdvance = async (req, res, next) => {
  try { res.status(201).json(await financeService.createCashAdvance(req.body)); } catch (err) { next(err); }
};

exports.approveCashAdvance = async (req, res, next) => {
  try { res.json(await financeService.approveCashAdvance(req.params.id, req.userId, req.body.status)); } catch (err) { next(err); }
};
