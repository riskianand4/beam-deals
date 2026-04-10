const mongoose = require("mongoose");

const chatGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  memberIds: [{ type: String }],
  createdBy: { type: String, required: true },
  avatarUrl: { type: String, default: "" },
}, { timestamps: true });

chatGroupSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("ChatGroup", chatGroupSchema);
