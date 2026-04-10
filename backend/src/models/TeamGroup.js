const mongoose = require("mongoose");

const teamGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  memberIds: [{ type: String }],
  leaderId: { type: String, default: "" },
  supervisorIds: [{ type: String }],
  description: { type: String, default: "" },
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

teamGroupSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("TeamGroup", teamGroupSchema);
