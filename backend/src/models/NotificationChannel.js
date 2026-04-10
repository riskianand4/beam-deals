const mongoose = require("mongoose");

const notificationChannelSchema = new mongoose.Schema({
  email: {
    enabled: { type: Boolean, default: false },
    provider: { type: String, default: "" },
    apiKey: { type: String, default: "" },
    from: { type: String, default: "" },
  },
  whatsapp: {
    enabled: { type: Boolean, default: false },
    provider: { type: String, default: "" },
    apiKey: { type: String, default: "" },
    from: { type: String, default: "" },
  },
  categories: {
    pengumuman: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false }, whatsapp: { type: Boolean, default: false } },
    persetujuan: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false }, whatsapp: { type: Boolean, default: false } },
    tugas: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false }, whatsapp: { type: Boolean, default: false } },
    kehadiran: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false }, whatsapp: { type: Boolean, default: false } },
    pesan: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false }, whatsapp: { type: Boolean, default: false } },
  },
}, { timestamps: true });

module.exports = mongoose.model("NotificationChannel", notificationChannelSchema);
