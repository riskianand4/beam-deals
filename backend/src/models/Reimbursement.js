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

const reimbursementSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  subject: { type: String, default: "" },
  description: { type: String, default: "" },
  attachments: [{ type: String }],
  attachmentUrl: { type: String, default: "" },
  approvers: [approverSchema],
  cc: [ccSchema],
  comments: [commentSchema],
  status: { type: String, enum: ["pending", "reviewing", "approved", "rejected"], default: "pending" },
  overallStatus: { type: String, enum: ["pending", "reviewing", "approved", "rejected"], default: "pending" },
  approvedBy: { type: String, default: "" },
  paymentNote: { type: String, default: "" },
  paymentDate: { type: String, default: "" },
  requesterName: { type: String, default: "" },
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

reimbursementSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("Reimbursement", reimbursementSchema);
