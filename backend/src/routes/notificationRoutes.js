const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/notificationController");
const { auth } = require("../middleware/auth");

router.get("/", auth, ctrl.getMyNotifications);
router.put("/mark-all-read", auth, ctrl.markAllRead);
router.put("/mark-category-read", auth, ctrl.markCategoryRead);
router.get("/badge-counts", auth, ctrl.getBadgeCounts);
router.delete("/clear-all", auth, ctrl.clearAll);
router.put("/:id/read", auth, ctrl.markRead);
router.delete("/:id", auth, ctrl.deleteNotification);
router.get("/unread-count", auth, ctrl.getUnreadCount);

module.exports = router;
