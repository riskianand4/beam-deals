const mongoose = require("mongoose");

const explorerFileSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  folderId: { type: String, default: null },
  fileUrl: { type: String, required: true },
  fileSize: { type: Number, default: 0 },
  mimeType: { type: String, default: "" },
  ownerId: { type: String, default: null },
  pinned: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },
  createdBy: { type: String, required: true },
}, { timestamps: true });

explorerFileSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("ExplorerFile", explorerFileSchema);
