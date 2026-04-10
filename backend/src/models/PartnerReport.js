const mongoose = require("mongoose");

const partnerReportSchema = new mongoose.Schema({
  projectId: { type: String, required: true },
  partnerId: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  content: { type: String, default: "" },
  fileUrl: { type: String, default: "" },
}, { timestamps: true });

partnerReportSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("PartnerReport", partnerReportSchema);
