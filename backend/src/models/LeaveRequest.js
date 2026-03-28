const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, enum: ["annual", "sick", "permission"], required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  attachments: [{ type: String }],
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  approvedBy: { type: String, default: "" },
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

leaveRequestSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
