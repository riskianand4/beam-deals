const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  fromUserId: { type: String, required: true },
  toUserId: { type: String, required: true },
  type: { type: String, enum: ["message", "collaboration_request", "announcement", "approval_request", "group"], default: "message" },
  subject: { type: String, default: "" },
  content: { type: String, required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected", "read", "approved"], default: "pending" },
  threadId: { type: String, default: null },
  parentMessageId: { type: String, default: null },
  isRead: { type: Boolean, default: false },
  approvalResponse: { type: String, default: "" },
  attachmentUrl: { type: String, default: "" },
  ccUserIds: [{ type: String }],
  groupId: { type: String, default: null },
  groupName: { type: String, default: "" },
  pinned: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

messageSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("Message", messageSchema);
