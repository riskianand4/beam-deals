const mongoose = require("mongoose");

const warningLetterSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  level: { type: String, enum: ["SP1", "SP2", "SP3", "pemecatan"], required: true },
  reason: { type: String, required: true },
  issuedDate: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  documentBase64: { type: String, default: "" },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["active", "expired"], default: "active" },
}, { timestamps: true });

warningLetterSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("WarningLetter", warningLetterSchema);
