const mongoose = require("mongoose");

const workReportSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  fileUrl: { type: String, default: "" },
}, { timestamps: true });

workReportSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("WorkReport", workReportSchema);
