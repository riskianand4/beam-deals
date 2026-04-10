const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/workReportController");
const { auth } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.get("/recent", auth, ctrl.getRecent);
router.get("/:userId", auth, ctrl.getByUserId);
router.post("/", auth, upload.single("file"), ctrl.create);
router.delete("/:id", auth, ctrl.remove);

module.exports = router;
