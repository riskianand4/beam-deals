const mongoose = require("mongoose");

const adminNoteSchema = new mongoose.Schema({
  fromAdminId: { type: String, required: true },
  toEmployeeId: { type: String, required: true },
  content: { type: String, required: true },
  priority: { type: String, enum: ["normal", "important"], default: "normal" },
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

adminNoteSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("AdminNote", adminNoteSchema);
