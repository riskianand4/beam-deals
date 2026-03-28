const Approval = require("../models/Approval");
const Notification = require("../models/Notification");
const User = require("../models/User");
const PositionAccess = require("../models/PositionAccess");

exports.getAll = async (userId, role, position) => {
  if (role === "admin") return Approval.find().sort({ createdAt: -1 });

  // Check if user has viewApproval or approve access
  let hasViewAccess = false;
  let hasApproveAccess = false;
  if (position) {
    const pa = await PositionAccess.findOne({ position });
    if (pa && pa.menus) {
      hasViewAccess = pa.menus.viewApproval === true;
      hasApproveAccess = pa.menus.approve === true;
    }
  }

  if (hasViewAccess || hasApproveAccess) {
    return Approval.find().sort({ createdAt: -1 });
  }

  // Regular employee: only own requests or requests where they're an approver
  return Approval.find({
    $or: [
      { requesterId: userId },
      { "approvers.userId": userId },
    ],
  }).sort({ createdAt: -1 });
};

exports.create = async (data) => {
  const user = await User.findById(data.requesterId);
  const approval = await Approval.create({
    ...data,
    requesterName: user ? user.name : "",
  });

  // Notify approvers
  for (const approver of approval.approvers) {
    await Notification.create({
      userId: approver.userId,
      title: "Permintaan Persetujuan Baru",
      message: `${approval.requesterName} mengajukan ${approval.type}: ${approval.subject}`,
      type: "info",
    });
  }

  return approval;
};

exports.respond = async (id, approverId, action, reason) => {
  const approval = await Approval.findById(id);
  if (!approval) throw Object.assign(new Error("Tidak ditemukan"), { statusCode: 404 });

  const approver = approval.approvers.find(a => a.userId === approverId);
  if (!approver) throw Object.assign(new Error("Anda bukan peninjau"), { statusCode: 403 });

  approver.status = action;
  approver.reason = reason || "";
  approver.reviewedAt = new Date();

  // Update overall status
  const allApproved = approval.approvers.every(a => a.status === "approved");
  const anyRejected = approval.approvers.some(a => a.status === "rejected");

  if (allApproved) approval.overallStatus = "approved";
  else if (anyRejected) approval.overallStatus = "rejected";

  await approval.save();

  // Notify requester
  const statusLabel = action === "approved" ? "disetujui" : "ditolak";
  const approverUser = await User.findById(approverId);
  await Notification.create({
    userId: approval.requesterId,
    title: `Persetujuan ${action === "approved" ? "Disetujui" : "Ditolak"}`,
    message: `${approverUser?.name || "Peninjau"} telah ${statusLabel} permintaan "${approval.subject}"`,
    type: action === "approved" ? "success" : "warning",
  });

  return approval;
};

exports.remove = async (id, userId) => {
  const approval = await Approval.findById(id);
  if (!approval) throw Object.assign(new Error("Tidak ditemukan"), { statusCode: 404 });
  if (approval.requesterId !== userId) throw Object.assign(new Error("Tidak bisa menghapus"), { statusCode: 403 });
  await Approval.findByIdAndDelete(id);
  return { message: "Berhasil dihapus" };
};
