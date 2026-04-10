const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  type: { type: String, enum: ["task_created", "task_completed", "task_assigned", "note_added", "status_changed"], required: true },
  message: { type: String, required: true },
  userId: { type: String, required: true },
  timestamp: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

activitySchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("Activity", activitySchema);
