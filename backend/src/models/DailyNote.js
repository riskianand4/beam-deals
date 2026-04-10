const mongoose = require("mongoose");

const dailyNoteSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: String, required: true },
  content: { type: String, default: "" },
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

dailyNoteSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("DailyNote", dailyNoteSchema);
