const mongoose = require("mongoose");

const partnerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  company: { type: String, default: "", trim: true },
  email: { type: String, default: "", lowercase: true, trim: true },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  notes: { type: String, default: "" },
  // Link to a User account for login (optional)
  userId: { type: String, default: null },
}, { timestamps: true });

partnerSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("Partner", partnerSchema);
