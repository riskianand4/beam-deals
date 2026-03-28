const Message = require("../models/Message");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");

exports.getAll = async (query = {}) => {
  const filter = {};
  if (query.userId) {
    filter.$or = [{ fromUserId: query.userId }, { toUserId: query.userId }];
  }
  if (query.fromUserId) filter.fromUserId = query.fromUserId;
  if (query.toUserId) filter.toUserId = query.toUserId;
  if (query.type) filter.type = query.type;
  if (query.status) filter.status = query.status;
  if (query.threadId) filter.threadId = query.threadId;
  return Message.find(filter).sort({ createdAt: -1 });
};

exports.getThreadMessages = async (threadId) => {
  return Message.find({ threadId }).sort({ createdAt: 1 });
};

exports.create = async (data, senderName) => {
  // Generate threadId for new conversations (not replies)
  if (!data.parentMessageId && !data.threadId) {
    data.threadId = new mongoose.Types.ObjectId().toString();
  }

  const message = await Message.create(data);

  // If this is a reply, set same threadId
  if (data.parentMessageId && !data.threadId) {
    const parent = await Message.findById(data.parentMessageId);
    if (parent) {
      message.threadId = parent.threadId || parent.id;
      await message.save();
    }
  }

  // Notify recipient
  const typeLabels = {
    message: "Pesan Baru",
    collaboration_request: "Permintaan Kolaborasi",
    announcement: "Pengumuman",
    approval_request: "Permintaan Approval",
  };
  if (data.toUserId && data.toUserId !== "all") {
    await Notification.create({
      userId: data.toUserId,
      title: typeLabels[data.type] || "Pesan Baru",
      message: `${senderName}: ${data.subject || data.content.substring(0, 100)}`,
      type: data.type === "approval_request" ? "warning" : "info",
    });
  }

  return message;
};

exports.updateStatus = async (id, status) => {
  const message = await Message.findByIdAndUpdate(id, { status }, { new: true });
  if (!message) throw Object.assign(new Error("Pesan tidak ditemukan"), { statusCode: 404 });
  return message;
};

exports.markAsRead = async (id) => {
  const message = await Message.findByIdAndUpdate(id, { isRead: true }, { new: true });
  if (!message) throw Object.assign(new Error("Pesan tidak ditemukan"), { statusCode: 404 });
  return message;
};

exports.approveMessage = async (id, action, reason, approverName) => {
  const message = await Message.findById(id);
  if (!message) throw Object.assign(new Error("Pesan tidak ditemukan"), { statusCode: 404 });
  if (message.type !== "approval_request") throw Object.assign(new Error("Bukan permintaan approval"), { statusCode: 400 });

  message.status = action; // "approved" or "rejected"
  message.approvalResponse = reason || "";
  await message.save();

  // Notify requester
  await Notification.create({
    userId: message.fromUserId,
    title: action === "approved" ? "Permintaan Disetujui" : "Permintaan Ditolak",
    message: `${approverName} ${action === "approved" ? "menyetujui" : "menolak"} permintaan: ${message.subject || message.content.substring(0, 50)}${reason ? ` - ${reason}` : ""}`,
    type: action === "approved" ? "success" : "warning",
  });

  return message;
};

exports.getUnreadCount = async (userId) => {
  return Message.countDocuments({
    toUserId: userId,
    isRead: false,
    fromUserId: { $ne: userId },
  });
};

exports.getPendingRequestCount = async (userId) => {
  return Message.countDocuments({
    toUserId: userId,
    type: { $in: ["collaboration_request", "approval_request"] },
    status: "pending",
  });
};

exports.remove = async (id, userId) => {
  const message = await Message.findById(id);
  if (!message) throw Object.assign(new Error("Pesan tidak ditemukan"), { statusCode: 404 });
  if (message.fromUserId !== userId && message.toUserId !== userId) {
    throw Object.assign(new Error("Tidak memiliki akses"), { statusCode: 403 });
  }
  await Message.findByIdAndDelete(id);
  return { message: "Pesan berhasil dihapus" };
};
