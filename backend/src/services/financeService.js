const Reimbursement = require("../models/Reimbursement");
const CashAdvance = require("../models/CashAdvance");
const Notification = require("../models/Notification");
const User = require("../models/User");
const notificationService = require("./notificationService");

// Reimbursements
exports.getReimbursements = async (query = {}) => {
  const filter = {};
  if (query.userId) filter.userId = query.userId;
  if (query.status) filter.status = query.status;
  return Reimbursement.find(filter).sort({ createdAt: -1 });
};

exports.createReimbursement = async (data) => {
  const user = await User.findById(data.userId);
  const reimb = await Reimbursement.create({
    ...data,
    requesterName: user ? user.name : "",
    overallStatus: "pending",
  });

  if (reimb.approvers && reimb.approvers.length > 0) {
    for (const approver of reimb.approvers) {
      await notificationService.create({
        userId: approver.userId,
        title: "Pengajuan Pembayaran Baru",
        category: "finance",
        message: `${reimb.requesterName} mengajukan ${reimb.category}: ${reimb.subject || reimb.description}`,
        type: "info",
      });
    }
  }

  if (reimb.cc && reimb.cc.length > 0) {
    for (const cc of reimb.cc) {
      await notificationService.create({
        userId: cc.userId,
        title: "CC: Pengajuan Pembayaran Baru",
        category: "finance",
        message: `${reimb.requesterName} mengajukan ${reimb.category}: ${reimb.subject || reimb.description} (Anda di-CC)`,
        type: "info",
      });
    }
  }

  return reimb;
};

exports.approveReimbursement = async (id, adminId, status, paymentNote, paymentDate) => {
  const req = await Reimbursement.findById(id);
  if (!req) throw Object.assign(new Error("Pengajuan tidak ditemukan"), { statusCode: 404 });
  req.status = status;
  req.overallStatus = status;
  req.approvedBy = adminId;
  if (paymentNote) req.paymentNote = paymentNote;
  if (paymentDate) req.paymentDate = paymentDate;
  await req.save();

  await notificationService.create({
    userId: req.userId,
    title: `Reimbursement ${status === "approved" ? "Disetujui" : "Ditolak"}`,
    category: "finance",
    message: `Pengajuan reimbursement Rp${req.amount.toLocaleString()} telah ${status === "approved" ? "disetujui" : "ditolak"}`,
    type: status === "approved" ? "success" : "warning",
  });

  return req;
};

exports.respondReimbursement = async (id, approverId, action, reason, responseAttachmentUrls) => {
  const reimb = await Reimbursement.findById(id);
  if (!reimb) throw Object.assign(new Error("Tidak ditemukan"), { statusCode: 404 });

  const approver = reimb.approvers.find(a => a.userId === approverId);
  if (!approver) throw Object.assign(new Error("Anda bukan peninjau"), { statusCode: 403 });

  approver.status = action;
  approver.reason = reason || "";
  approver.reviewedAt = new Date();

  if (responseAttachmentUrls && responseAttachmentUrls.length > 0) {
    approver.attachmentUrl = [...(approver.attachmentUrl || []), ...responseAttachmentUrls];
  }

  const allApproved = reimb.approvers.every(a => a.status === "approved");
  const anyRejected = reimb.approvers.some(a => a.status === "rejected");

  if (allApproved) { reimb.overallStatus = "approved"; reimb.status = "approved"; }
  else if (anyRejected) { reimb.overallStatus = "rejected"; reimb.status = "rejected"; }
  else { reimb.overallStatus = "reviewing"; reimb.status = "reviewing"; }

  await reimb.save();

  const statusLabel = action === "approved" ? "disetujui" : "ditolak";
  const approverUser = await User.findById(approverId);
  await notificationService.create({
    userId: reimb.userId,
    title: `Pembayaran ${action === "approved" ? "Disetujui" : "Ditolak"}`,
    category: "finance",
    message: `${approverUser?.name || "Peninjau"} telah ${statusLabel} pengajuan "${reimb.subject || reimb.category}"`,
    type: action === "approved" ? "success" : "warning",
  });

  return reimb;
};

exports.addReimbursementComment = async (id, userId, text, attachmentUrl) => {
  const reimb = await Reimbursement.findById(id);
  if (!reimb) throw Object.assign(new Error("Tidak ditemukan"), { statusCode: 404 });

  reimb.comments.push({ userId, text, attachmentUrl: attachmentUrl || "", createdAt: new Date() });
  await reimb.save();

  if (userId !== reimb.userId) {
    const commenter = await User.findById(userId);
    await notificationService.create({
      userId: reimb.userId,
      title: "Komentar Baru pada Pengajuan",
      message: `${commenter?.name || "Seseorang"} berkomentar pada "${reimb.subject || reimb.category}"`,
      type: "info",
      category: "finance",
    });
  }

  return reimb;
};

exports.deleteReimbursement = async (id, userId, userRole) => {
  const reimb = await Reimbursement.findById(id);
  if (!reimb) throw Object.assign(new Error("Tidak ditemukan"), { statusCode: 404 });
  
  if (userRole !== "admin" && reimb.userId !== userId) {
    throw Object.assign(new Error("Tidak bisa menghapus"), { statusCode: 403 });
  }
  
  await Reimbursement.findByIdAndDelete(id);
  return { message: "Berhasil dihapus" };
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

  await notificationService.create({
    userId: req.userId,
    title: `Kasbon ${status === "approved" ? "Disetujui" : "Ditolak"}`,
    category: "finance",
    message: `Pengajuan kasbon Rp${req.amount.toLocaleString()} telah ${status === "approved" ? "disetujui" : "ditolak"}`,
    type: status === "approved" ? "success" : "warning",
  });

  return req;
};
