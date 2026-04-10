const mongoose = require("mongoose");

const contractSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  position: { type: String, required: true },
}, { timestamps: true });

contractSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("Contract", contractSchema);
