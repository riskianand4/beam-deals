const mongoose = require("mongoose");

const positionAccessSchema = new mongoose.Schema({
  position: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: "", trim: true },
  menus: {
    attendance: { type: Boolean, default: false },
    finance: { type: Boolean, default: false },
    payslip: { type: Boolean, default: false },
    vault: { type: Boolean, default: false },
    messages: { type: Boolean, default: false },
    team: { type: Boolean, default: false },
    notes: { type: Boolean, default: false },
    reports: { type: Boolean, default: false },
    accounts: { type: Boolean, default: false },
    tasks: { type: Boolean, default: false },
    approve: { type: Boolean, default: false },
    viewApproval: { type: Boolean, default: false },
    mitra: { type: Boolean, default: false },
    pengumuman: { type: Boolean, default: false },
  },
}, { timestamps: true });

module.exports = mongoose.model("PositionAccess", positionAccessSchema);
