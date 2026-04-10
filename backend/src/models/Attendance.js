const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, default: "" },
  date: { type: String, required: true },
  clockIn: { type: String, default: null },
  clockOut: { type: String, default: null },
  breakOut: { type: String, default: null },
  breakIn: { type: String, default: null },
  overtimeIn: { type: String, default: null },
  overtimeOut: { type: String, default: null },
  status: { type: String, default: "present" },
  justificationPermanent: { type: Boolean, default: false },
  location: { type: String, default: "" },
  reason: { type: String, default: "" },
  proofImage: { type: String, default: "" },
  deviceId: { type: String, default: "" },
  biokey: { type: String, default: "" },
  tranId: { type: String, default: "" },
  stateid: { type: String, default: "" },
  verify: { type: String, default: "" },
  workcod: { type: String, default: "" },
  isMask: { type: Number, default: 0 },
  bodyTemp: { type: Number, default: 0 },
  source: { type: String, enum: ["manual", "webhook", "import"], default: "manual" },
  justification: { type: String, default: "" },
}, { timestamps: true });

attendanceSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("Attendance", attendanceSchema);
