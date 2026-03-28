const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/taskController");
const { auth } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.get("/", auth, ctrl.getAll);
router.get("/:id", auth, ctrl.getById);
router.post("/", auth, ctrl.create);
router.put("/:id", auth, ctrl.update);
router.put("/:id/status", auth, ctrl.updateStatus);
router.put("/:id/review", auth, ctrl.reviewTask);
router.post("/:id/attachments", auth, upload.array("files", 10), ctrl.uploadAttachments);
router.post("/:id/notes", auth, ctrl.addNote);
router.delete("/:id", auth, ctrl.remove);

module.exports = router;
