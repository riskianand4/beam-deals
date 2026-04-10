const Message = require("../models/Message");
const ChatGroup = require("../models/ChatGroup");
const notificationService = require("./notificationService");
const mongoose = require("mongoose");

exports.getAll = async (query = {}) => {
  const filter = {};
  if (query.userId) {
    const userGroups = await ChatGroup.find({ memberIds: query.userId });
    const groupIds = userGroups.map(g => g._id.toString());
    filter.$or = [
      { fromUserId: query.userId },
      { toUserId: query.userId },
      { toUserId: "all" },
      ...(groupIds.length > 0 ? [{ groupId: { $in: groupIds } }] : []),
    ];
  }
  if (query.fromUserId) filter.fromUserId = query.fromUserId;
  if (query.toUserId) filter.toUserId = query.toUserId;
  if (query.type) filter.type = query.type;
  if (query.status) filter.status = query.status;
  if (query.threadId) filter.threadId = query.threadId;
  if (query.groupId) filter.groupId = query.groupId;
  return Message.find(filter).sort({ createdAt: -1 });
};

exports.getThreadMessages = async (threadId) => {
  return Message.find({ threadId }).sort({ createdAt: 1 });
};

exports.create = async (data, senderName) => {
  if (!data.parentMessageId && !data.threadId) {
    data.threadId = new mongoose.Types.ObjectId().toString();
  }
  const message = await Message.create(data);
  if (data.parentMessageId && !data.threadId) {
    const parent = await Message.findById(data.parentMessageId);
    if (parent) {
      message.threadId = parent.threadId || parent.id;
      await message.save();
    }
  }
  const typeLabels = {
    message: "Pesan Baru",
    collaboration_request: "Permintaan Kolaborasi",
    announcement: "Pengumuman",
    approval_request: "Permintaan Approval",
    group: "Pesan Grup",
  };
  if (data.groupId) {
    const group = await ChatGroup.findById(data.groupId);
    if (group) {
      for (const memberId of group.memberIds) {
        if (memberId !== data.fromUserId) {
          await notificationService.create({
            userId: memberId,
            title: `Pesan di ${group.name}`,
            message: `${senderName}: ${data.content.substring(0, 100)}`,
            type: "info",
            category: "message",
            sender: senderName,
          });
        }
      }
    }
  } else if (data.toUserId && data.toUserId !== "all") {
    await notificationService.create({
      userId: data.toUserId,
      title: typeLabels[data.type] || "Pesan Baru",
      message: `${senderName}: ${data.subject || data.content.substring(0, 100)}`,
      type: data.type === "approval_request" ? "warning" : "info",
      category: "message",
      sender: senderName,
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
  message.status = action;
  message.approvalResponse = reason || "";
  await message.save();
  await notificationService.create({
    userId: message.fromUserId,
    title: action === "approved" ? "Permintaan Disetujui" : "Permintaan Ditolak",
    message: `${approverName} ${action === "approved" ? "menyetujui" : "menolak"} permintaan: ${message.subject || message.content.substring(0, 50)}${reason ? ` - ${reason}` : ""}`,
    type: action === "approved" ? "success" : "warning",
    category: "message",
    sender: approverName,
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

// Group chat methods
exports.createGroup = async (name, memberIds, createdBy) => {
  const group = await ChatGroup.create({ name, memberIds, createdBy });
  return group;
};

exports.getGroups = async (userId) => {
  return ChatGroup.find({ memberIds: userId }).sort({ createdAt: -1 });
};

exports.getGroupMessages = async (groupId) => {
  return Message.find({ groupId }).sort({ createdAt: 1 });
};

exports.deleteGroup = async (groupId, userId) => {
  const group = await ChatGroup.findById(groupId);
  if (!group) throw Object.assign(new Error("Grup tidak ditemukan"), { statusCode: 404 });
  if (group.createdBy !== userId) throw Object.assign(new Error("Hanya pembuat grup yang bisa menghapus"), { statusCode: 403 });
  await Message.deleteMany({ groupId });
  await ChatGroup.findByIdAndDelete(groupId);
  return { message: "Grup berhasil dihapus" };
};

exports.leaveGroup = async (groupId, userId) => {
  const group = await ChatGroup.findById(groupId);
  if (!group) throw Object.assign(new Error("Grup tidak ditemukan"), { statusCode: 404 });
  group.memberIds = group.memberIds.filter(id => id !== userId);
  await group.save();
  return { message: "Berhasil keluar dari grup" };
};

exports.updateGroupAvatar = async (groupId, userId, avatarUrl) => {
  const group = await ChatGroup.findById(groupId);
  if (!group) throw Object.assign(new Error("Grup tidak ditemukan"), { statusCode: 404 });
  if (group.createdBy !== userId) throw Object.assign(new Error("Hanya pembuat grup yang bisa ubah avatar"), { statusCode: 403 });
  group.avatarUrl = avatarUrl;
  await group.save();
  return group;
};

exports.pinMessage = async (id) => {
  const message = await Message.findById(id);
  if (!message) throw Object.assign(new Error("Pesan tidak ditemukan"), { statusCode: 404 });
  message.pinned = !message.pinned;
  await message.save();
  return message;
};

// Delete entire thread (all messages between two users)
exports.deleteThread = async (threadId, userId) => {
  // For personal chats: threadId is the other user's ID
  // Delete all messages where (from=userId & to=otherId) or (from=otherId & to=userId)
  const otherId = threadId;
  const result = await Message.deleteMany({
    $or: [
      { fromUserId: userId, toUserId: otherId },
      { fromUserId: otherId, toUserId: userId },
    ],
    $and: [
      { $or: [{ groupId: null }, { groupId: { $exists: false } }] },
    ],
  });
  return { message: "Thread berhasil dihapus", deleted: result.deletedCount };
};
