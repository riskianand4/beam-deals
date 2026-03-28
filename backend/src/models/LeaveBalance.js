const mongoose = require("mongoose");

const leaveBalanceSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  annual: { type: Number, default: 12 },
  used: { type: Number, default: 0 },
  sick: { type: Number, default: 14 },
  sickUsed: { type: Number, default: 0 },
}, { timestamps: true });

leaveBalanceSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("LeaveBalance", leaveBalanceSchema);
