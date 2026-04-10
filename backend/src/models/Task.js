const mongoose = require("mongoose");

const taskAttachmentSchema = new mongoose.Schema({
  name: String,
  size: Number,
  type: String,
  url: String,
  uploadedBy: { type: String, default: "" },
});

const taskNoteSchema = new mongoose.Schema({
  text: { type: String, default: "" },
  authorId: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
  attachments: [taskAttachmentSchema],
});

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  assigneeId: { type: String, default: "" },
  teamId: { type: String, default: "" },
  type: { type: String, enum: ["personal", "team"], default: "personal" },
  createdBy: { type: String, default: "" },
  status: { type: String, enum: ["todo", "completed"], default: "todo" },
  priority: { type: String, enum: ["high", "medium", "low", "none"], default: "none" },
  deadline: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
  notes: [taskNoteSchema],
  attachments: [taskAttachmentSchema], // kept for backward compat
}, { timestamps: true });

taskSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  if (obj.notes) obj.notes = obj.notes.map(n => ({ ...n, id: n._id?.toString() || n.id, _id: undefined }));
  if (obj.attachments) obj.attachments = obj.attachments.map(a => ({ ...a, id: a._id?.toString() || a.id, _id: undefined }));
  return obj;
};

module.exports = mongoose.model("Task", taskSchema);
