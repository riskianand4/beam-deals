const mongoose = require("mongoose");

const companyLinkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  icon: { type: String, default: "" },
  category: { type: String, default: "" },
  username: { type: String, default: "" },
  password: { type: String, default: "" },
  description: { type: String, default: "" },
  assignedTo: { type: String, default: "all" },
}, { timestamps: true });

companyLinkSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("CompanyLink", companyLinkSchema);
