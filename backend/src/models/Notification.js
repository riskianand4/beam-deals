const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ["info", "warning", "success"], default: "info" },
  category: { type: String, enum: ["task", "payslip", "announcement", "message", "finance", "explorer", "partner", "approval", "attendance", "team", "work_report", "general"], default: "general" },
  read: { type: Boolean, default: false },
  timestamp: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

notificationSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("Notification", notificationSchema);
