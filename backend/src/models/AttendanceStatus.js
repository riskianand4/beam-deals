const mongoose = require("mongoose");

const attendanceStatusSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

attendanceStatusSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("AttendanceStatus", attendanceStatusSchema);
