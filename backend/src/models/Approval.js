const mongoose = require("mongoose");

const approverSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  reason: { type: String, default: "" },
  attachmentUrl: { type: [String], default: [] },
  reviewedAt: { type: Date, default: null },
}, { _id: false });

const ccSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, default: "" },
}, { _id: false });

const commentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  text: { type: String, required: true },
  attachmentUrl: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const approvalSchema = new mongoose.Schema({
  requesterId: { type: String, required: true },
  requesterName: { type: String, default: "" },
  type: { type: String, enum: ["leave", "reimbursement", "permission", "kendaraan", "pencairan", "other"], required: true },
  subject: { type: String, required: true },
  description: { type: String, default: "" },
  approvers: [approverSchema],
  cc: [ccSchema],
  comments: [commentSchema],
  attachmentUrl: { type: String, default: "" },
  responseAttachmentUrl: { type: String, default: "" },
  overallStatus: { type: String, enum: ["pending", "reviewing", "approved", "rejected"], default: "pending" },
}, { timestamps: true });

approvalSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("Approval", approvalSchema);
