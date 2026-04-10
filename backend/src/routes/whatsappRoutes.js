const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/whatsappController");
const { auth, adminOnly } = require("../middleware/auth");

router.get("/status", auth, adminOnly, ctrl.getStatus);
router.get("/qr", auth, adminOnly, ctrl.getQR);
router.post("/connect", auth, adminOnly, ctrl.connect);
router.post("/logout", auth, adminOnly, ctrl.logout);

module.exports = router;
