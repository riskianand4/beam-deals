const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/messageController");
const { auth } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.get("/", auth, ctrl.getAll);
router.post("/", auth, upload.single("attachment"), ctrl.create);
router.put("/:id/status", auth, ctrl.updateStatus);
router.put("/:id/read", auth, ctrl.markAsRead);
router.put("/:id/approve", auth, ctrl.approve);
router.put("/:id/pin", auth, ctrl.pinMessage);
router.get("/unread-count", auth, ctrl.getUnreadCount);
router.get("/pending-requests", auth, ctrl.getPendingRequestCount);
router.get("/thread/:threadId", auth, ctrl.getThread);
router.post("/groups", auth, ctrl.createGroup);
router.get("/groups", auth, ctrl.getGroups);
router.get("/groups/:groupId/messages", auth, ctrl.getGroupMessages);
router.delete("/groups/:groupId", auth, ctrl.deleteGroup);
router.put("/groups/:groupId/leave", auth, ctrl.leaveGroup);
router.put("/groups/:groupId/avatar", auth, upload.single("avatar"), ctrl.updateGroupAvatar);
router.delete("/thread/:threadId", auth, ctrl.deleteThread);
router.delete("/:id", auth, ctrl.remove);

module.exports = router;
