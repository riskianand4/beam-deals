const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/approvalController");
const { auth } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.get("/", auth, ctrl.getAll);
router.post("/", auth, upload.single("attachment"), ctrl.create);
router.put("/:id/respond", auth, ctrl.respond);
router.delete("/:id", auth, ctrl.remove);

module.exports = router;
