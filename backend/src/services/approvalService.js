const Approval = require("../models/Approval");
const Notification = require("../models/Notification");
const User = require("../models/User");
const PositionAccess = require("../models/PositionAccess");
const notificationService = require("./notificationService");

exports.getAll = async (userId, role) => {
  if (role === "admin") return Approval.find().sort({ createdAt: -1 });

  return Approval.find({
    $or: [
      { requesterId: userId },
      { "approvers.userId": userId },
      { "cc.userId": userId },
    ],
  }).sort({ createdAt: -1 });
};

exports.create = async (data) => {
  const user = await User.findById(data.requesterId);
  const approval = await Approval.create({
    ...data,
    requesterName: user ? user.name : "",
  });

  for (const approver of approval.approvers) {
    await notificationService.create({
      userId: approver.userId,
      title: "Permintaan Persetujuan Baru",
      category: "approval",
      message: `${approval.requesterName} mengajukan ${approval.type}: ${approval.subject}`,
      type: "info",
    });
  }

  if (approval.cc && approval.cc.length > 0) {
    for (const cc of approval.cc) {
      await notificationService.create({
        userId: cc.userId,
        title: "CC: Permintaan Persetujuan Baru",
        category: "approval",
        message: `${approval.requesterName} mengajukan ${approval.type}: ${approval.subject} (Anda di-CC)`,
        type: "info",
      });
    }
  }

  return approval;
};

exports.updateStatus = async (id, newStatus, userId) => {
  const approval = await Approval.findById(id);
  if (!approval) throw Object.assign(new Error("Tidak ditemukan"), { statusCode: 404 });
  approval.overallStatus = newStatus;
  await approval.save();

  if (newStatus === "reviewing") {
    const reviewer = await User.findById(userId);
    await notificationService.create({
      userId: approval.requesterId,
      title: "Pengajuan Sedang Ditinjau",
      category: "approval",
      message: `${reviewer?.name || "Peninjau"} sedang meninjau permintaan "${approval.subject}"`,
      type: "info",
    });
  }

  return approval;
};

exports.respond = async (id, approverId, action, reason, responseAttachmentUrls) => {
  const approval = await Approval.findById(id);
  if (!approval) throw Object.assign(new Error("Tidak ditemukan"), { statusCode: 404 });

  if (approval.overallStatus === "approved" || approval.overallStatus === "rejected") {
    const responder = await User.findById(approverId);
    if (!responder || responder.role !== "admin") {
      throw Object.assign(new Error("Pengajuan sudah selesai, tidak bisa diubah"), { statusCode: 403 });
    }
  }

  const approver = approval.approvers.find(a => a.userId === approverId);
  if (!approver) throw Object.assign(new Error("Anda bukan peninjau"), { statusCode: 403 });

  approver.status = action;
  approver.reason = reason || "";
  approver.reviewedAt = new Date();

  if (responseAttachmentUrls && responseAttachmentUrls.length > 0) {
    approver.attachmentUrl = [...(approver.attachmentUrl || []), ...responseAttachmentUrls];
    approval.responseAttachmentUrl = responseAttachmentUrls[0];
  }

  const allApproved = approval.approvers.every(a => a.status === "approved");
  const anyRejected = approval.approvers.some(a => a.status === "rejected");

  if (allApproved) approval.overallStatus = "approved";
  else if (anyRejected) approval.overallStatus = "rejected";

  await approval.save();

  const statusLabel = action === "approved" ? "disetujui" : "ditolak";
  const approverUser = await User.findById(approverId);
  await notificationService.create({
    userId: approval.requesterId,
    title: `Persetujuan ${action === "approved" ? "Disetujui" : "Ditolak"}`,
    category: "approval",
    message: `${approverUser?.name || "Peninjau"} telah ${statusLabel} permintaan "${approval.subject}"`,
    type: action === "approved" ? "success" : "warning",
  });

  return approval;
};

exports.addComment = async (id, userId, text, attachmentUrl) => {
  const approval = await Approval.findById(id);
  if (!approval) throw Object.assign(new Error("Tidak ditemukan"), { statusCode: 404 });

  approval.comments.push({ userId, text, attachmentUrl: attachmentUrl || "", createdAt: new Date() });
  await approval.save();

  // Notify requester if commenter is not requester
  if (userId !== approval.requesterId) {
    const commenter = await User.findById(userId);
    await notificationService.create({
      userId: approval.requesterId,
      title: "Komentar Baru pada Pengajuan",
      message: `${commenter?.name || "Seseorang"} berkomentar pada "${approval.subject}"`,
      type: "info",
      category: "approval",
    });
  }

  return approval;
};

exports.editResponse = async (id, approverId, data) => {
  const approval = await Approval.findById(id);
  if (!approval) throw Object.assign(new Error("Tidak ditemukan"), { statusCode: 404 });

  if (approval.overallStatus === "approved" || approval.overallStatus === "rejected") {
    const responder = await User.findById(approverId);
    if (!responder || responder.role !== "admin") {
      throw Object.assign(new Error("Pengajuan sudah selesai, tidak bisa diubah"), { statusCode: 403 });
    }
  }

  const approver = approval.approvers.find(a => a.userId === approverId);
  if (!approver) throw Object.assign(new Error("Anda bukan peninjau"), { statusCode: 403 });

  if (data.reason !== undefined) approver.reason = data.reason;
  if (data.status) approver.status = data.status;
  if (data.attachmentUrls && data.attachmentUrls.length > 0) {
    approver.attachmentUrl = [...(approver.attachmentUrl || []), ...data.attachmentUrls];
  }
  approver.reviewedAt = new Date();

  const allApproved = approval.approvers.every(a => a.status === "approved");
  const anyRejected = approval.approvers.some(a => a.status === "rejected");
  if (allApproved) approval.overallStatus = "approved";
  else if (anyRejected) approval.overallStatus = "rejected";
  else approval.overallStatus = "reviewing";

  await approval.save();
  return approval;
};

exports.resetResponse = async (id, approverId) => {
  const approval = await Approval.findById(id);
  if (!approval) throw Object.assign(new Error("Tidak ditemukan"), { statusCode: 404 });
  const approver = approval.approvers.find(a => a.userId === approverId);
  if (!approver) throw Object.assign(new Error("Anda bukan peninjau"), { statusCode: 403 });

  approver.status = "pending";
  approver.reason = "";
  approver.attachmentUrl = [];
  approver.reviewedAt = null;

  const anyRejected = approval.approvers.some(a => a.status === "rejected");
  const allApproved = approval.approvers.every(a => a.status === "approved");
  if (allApproved) approval.overallStatus = "approved";
  else if (anyRejected) approval.overallStatus = "rejected";
  else approval.overallStatus = "reviewing";

  await approval.save();
  return approval;
};

exports.remove = async (id, userId, userRole, userPosition) => {
  const approval = await Approval.findById(id);
  if (!approval) throw Object.assign(new Error("Tidak ditemukan"), { statusCode: 404 });

  const isOwner = approval.requesterId === userId;
  const isAdminRole = userRole === "admin";
  let hasApproveAccess = false;
  if (userPosition) {
    const pa = await PositionAccess.findOne({ position: userPosition });
    if (pa && pa.menus && pa.menus.approve === true) hasApproveAccess = true;
  }

  if (!isOwner && !isAdminRole && !hasApproveAccess) {
    throw Object.assign(new Error("Tidak bisa menghapus"), { statusCode: 403 });
  }

  await Approval.findByIdAndDelete(id);
  return { message: "Berhasil dihapus" };
};
