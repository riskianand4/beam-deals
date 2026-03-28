const Reimbursement = require("../models/Reimbursement");
const CashAdvance = require("../models/CashAdvance");
const Notification = require("../models/Notification");

// Reimbursements
exports.getReimbursements = async (query = {}) => {
  const filter = {};
  if (query.userId) filter.userId = query.userId;
  if (query.status) filter.status = query.status;
  return Reimbursement.find(filter).sort({ createdAt: -1 });
};

exports.createReimbursement = async (data) => {
  return Reimbursement.create(data);
};

exports.approveReimbursement = async (id, adminId, status, paymentNote, paymentDate) => {
  const req = await Reimbursement.findById(id);
  if (!req) throw Object.assign(new Error("Pengajuan tidak ditemukan"), { statusCode: 404 });
  req.status = status;
  req.approvedBy = adminId;
  if (paymentNote) req.paymentNote = paymentNote;
  if (paymentDate) req.paymentDate = paymentDate;
  await req.save();

  await Notification.create({
    userId: req.userId,
    title: `Reimbursement ${status === "approved" ? "Disetujui" : "Ditolak"}`,
    message: `Pengajuan reimbursement Rp${req.amount.toLocaleString()} telah ${status === "approved" ? "disetujui" : "ditolak"}`,
    type: status === "approved" ? "success" : "warning",
  });

  return req;
};

// Cash Advances
exports.getCashAdvances = async (query = {}) => {
  const filter = {};
  if (query.userId) filter.userId = query.userId;
  if (query.status) filter.status = query.status;
  return CashAdvance.find(filter).sort({ createdAt: -1 });
};

exports.createCashAdvance = async (data) => {
  return CashAdvance.create(data);
};

exports.approveCashAdvance = async (id, adminId, status) => {
  const req = await CashAdvance.findById(id);
  if (!req) throw Object.assign(new Error("Pengajuan tidak ditemukan"), { statusCode: 404 });
  req.status = status;
  req.approvedBy = adminId;
  await req.save();

  await Notification.create({
    userId: req.userId,
    title: `Kasbon ${status === "approved" ? "Disetujui" : "Ditolak"}`,
    message: `Pengajuan kasbon Rp${req.amount.toLocaleString()} telah ${status === "approved" ? "disetujui" : "ditolak"}`,
    type: status === "approved" ? "success" : "warning",
  });

  return req;
};
