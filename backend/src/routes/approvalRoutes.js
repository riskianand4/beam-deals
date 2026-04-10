const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/approvalController");
const { auth } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.get("/", auth, ctrl.getAll);
router.post("/", auth, upload.single("attachment"), ctrl.create);
router.put("/:id/status", auth, ctrl.updateStatus);
router.put("/:id/respond", auth, upload.array("responseAttachment", 10), ctrl.respond);
router.post("/:id/comments", auth, upload.single("attachment"), ctrl.addComment);
router.put("/:id/edit-response", auth, upload.array("responseAttachment", 10), ctrl.editResponse);
router.put("/:id/reset-response", auth, ctrl.resetResponse);
router.delete("/:id", auth, ctrl.remove);

module.exports = router;
