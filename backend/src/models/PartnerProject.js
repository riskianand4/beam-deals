const mongoose = require("mongoose");

const partnerProjectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  partnerId: { type: String, required: true },
  status: { type: String, enum: ["active", "completed", "on-hold"], default: "active" },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  startDate: { type: String, default: "" },
  endDate: { type: String, default: "" },
}, { timestamps: true });

partnerProjectSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("PartnerProject", partnerProjectSchema);
