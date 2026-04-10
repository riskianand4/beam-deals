const mongoose = require("mongoose");

const partnerContractSchema = new mongoose.Schema({
  partnerId: { type: String, required: true },
  projectId: { type: String, default: null },
  title: { type: String, required: true, trim: true },
  fileUrl: { type: String, default: "" },
  startDate: { type: String, default: "" },
  endDate: { type: String, default: "" },
  status: { type: String, enum: ["active", "expired", "draft"], default: "draft" },
}, { timestamps: true });

partnerContractSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("PartnerContract", partnerContractSchema);
