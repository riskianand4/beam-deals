const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/messageController");
const { auth } = require("../middleware/auth");

router.get("/", auth, ctrl.getAll);
router.post("/", auth, ctrl.create);
router.put("/:id/status", auth, ctrl.updateStatus);
router.put("/:id/read", auth, ctrl.markAsRead);
router.put("/:id/approve", auth, ctrl.approve);
router.get("/unread-count", auth, ctrl.getUnreadCount);
router.get("/pending-requests", auth, ctrl.getPendingRequestCount);
router.get("/thread/:threadId", auth, ctrl.getThread);
router.delete("/:id", auth, ctrl.remove);

module.exports = router;
