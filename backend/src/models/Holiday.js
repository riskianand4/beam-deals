const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // yyyy-MM-dd
  description: { type: String, default: "" },
  createdBy: { type: String, default: "" },
}, { timestamps: true });

holidaySchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("Holiday", holidaySchema);
