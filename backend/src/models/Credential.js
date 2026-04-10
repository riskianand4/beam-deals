const mongoose = require("mongoose");

const credentialSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  systemName: { type: String, required: true },
  url: { type: String, default: "" },
  username: { type: String, default: "" },
  password: { type: String, default: "" },
}, { timestamps: true });

credentialSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("Credential", credentialSchema);
