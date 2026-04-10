const whatsappService = require("../services/whatsappService");
const qrcode = require("qrcode");

const NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

exports.getStatus = async (req, res, next) => {
  try {
    Object.entries(NO_CACHE).forEach(([k, v]) => res.setHeader(k, v));
    res.json(whatsappService.getStatus());
  } catch (err) {
    next(err);
  }
};

exports.getQR = async (req, res, next) => {
  try {
    Object.entries(NO_CACHE).forEach(([k, v]) => res.setHeader(k, v));

    // If disconnected and no socket, kick off initialization
    if (whatsappService.status === "disconnected" && !whatsappService.sock) {
      whatsappService.initialize(true).catch(() => {});
    }

    const qr = whatsappService.getQR();
    if (!qr) {
      return res.json({ qr: null, status: whatsappService.getStatus().status });
    }

    const qrImage = await qrcode.toDataURL(qr, { width: 300 });
    res.json({ qr: qrImage, status: "waiting_qr" });
  } catch (err) {
    next(err);
  }
};

exports.connect = async (req, res, next) => {
  try {
    Object.entries(NO_CACHE).forEach(([k, v]) => res.setHeader(k, v));

    // Force fresh initialization, clearing stale session if present
    whatsappService.status = "connecting";
    whatsappService.qr = null;
    await whatsappService.initialize(true);

    res.json({ message: "WhatsApp initialization started", ...whatsappService.getStatus() });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await whatsappService.logout();
    res.json({ message: "WhatsApp berhasil logout" });
  } catch (err) {
    next(err);
  }
};
