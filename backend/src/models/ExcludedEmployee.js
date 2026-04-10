const mongoose = require("mongoose");

const excludedEmployeeSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  userName: { type: String, default: "" },
  description: { type: String, default: "" },
}, { timestamps: true });

excludedEmployeeSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("ExcludedEmployee", excludedEmployeeSchema);
