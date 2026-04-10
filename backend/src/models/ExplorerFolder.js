const mongoose = require("mongoose");

const explorerFolderSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  parentId: { type: String, default: null },
  ownerId: { type: String, default: null },
  accessType: { type: String, enum: ["all", "team", "specific", "partner"], default: "all" },
  accessIds: [{ type: String }],
  accessPermissions: [{
    userId: { type: String, required: true },
    permission: { type: String, enum: ["view", "edit"], default: "view" },
  }],
  linkedPartnerId: { type: String, default: null },
  pinned: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },
  createdBy: { type: String, required: true },
}, { timestamps: true });

explorerFolderSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("ExplorerFolder", explorerFolderSchema);
