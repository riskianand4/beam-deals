const mongoose = require("mongoose");

const bossNoteSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  content: { type: String, default: "" },
  updatedAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

bossNoteSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("BossNote", bossNoteSchema);
