const mongoose = require("mongoose");

const menuSettingSchema = new mongoose.Schema({
  attendance: { type: Boolean, default: false },
  finance: { type: Boolean, default: false },
  payslip: { type: Boolean, default: false },
  vault: { type: Boolean, default: false },
  messages: { type: Boolean, default: false },
  team: { type: Boolean, default: false },
  notes: { type: Boolean, default: false },
  reports: { type: Boolean, default: false },
  accounts: { type: Boolean, default: false },
  review: { type: Boolean, default: false },
  approve: { type: Boolean, default: false },
  viewApproval: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("MenuSetting", menuSettingSchema);
