const mongoose = require("mongoose");

const cashAdvanceSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  returnDate: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  approvedBy: { type: String, default: "" },
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

cashAdvanceSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("CashAdvance", cashAdvanceSchema);
