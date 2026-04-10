const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdBy: { type: String, required: true },
  expiresAt: { type: Date, default: null },
  status: { type: String, enum: ["active", "draft"], default: "active" },
}, { timestamps: true });

announcementSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("Announcement", announcementSchema);
