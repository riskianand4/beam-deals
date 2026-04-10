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
router.post("/:id/notes", auth, upload.array("files", 5), ctrl.addNote);
router.put("/:id/notes/:noteId", auth, ctrl.editNote);
router.delete("/:id/notes/:noteId", auth, ctrl.deleteNote);
router.delete("/:id", auth, ctrl.remove);

module.exports = router;
