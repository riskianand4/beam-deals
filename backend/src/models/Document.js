const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, enum: ["ktp", "kk", "sim", "ijazah", "foto", "other"], required: true },
  fileName: { type: String, required: true },
  fileUrl: { type: String, default: "" },
  label: { type: String, default: "" },
  uploadedAt: { type: String, default: () => new Date().toISOString().split("T")[0] },
}, { timestamps: true });

documentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("Document", documentSchema);
