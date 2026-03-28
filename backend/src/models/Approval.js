const mongoose = require("mongoose");

const approverSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  reason: { type: String, default: "" },
  reviewedAt: { type: Date, default: null },
}, { _id: false });

const approvalSchema = new mongoose.Schema({
  requesterId: { type: String, required: true },
  requesterName: { type: String, default: "" },
  type: { type: String, enum: ["leave", "reimbursement", "permission", "other"], required: true },
  subject: { type: String, required: true },
  description: { type: String, default: "" },
  approvers: [approverSchema],
  attachmentUrl: { type: String, default: "" },
  overallStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
}, { timestamps: true });

approvalSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("Approval", approvalSchema);
