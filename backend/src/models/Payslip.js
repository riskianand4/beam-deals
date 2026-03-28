const mongoose = require("mongoose");

const payslipSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  pdfUrl: { type: String, required: true },
  paydayDate: { type: Number, default: 20 },
}, { timestamps: true });

payslipSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("Payslip", payslipSchema);
