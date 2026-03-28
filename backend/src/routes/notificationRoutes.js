const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/notificationController");
const { auth } = require("../middleware/auth");

router.get("/", auth, ctrl.getMyNotifications);
router.put("/mark-all-read", auth, ctrl.markAllRead);
router.put("/:id/read", auth, ctrl.markRead);
router.get("/unread-count", auth, ctrl.getUnreadCount);

module.exports = router;
