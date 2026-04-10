const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/documentController");
const { auth } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.get("/", auth, ctrl.getAll);
router.get("/user/:userId", auth, ctrl.getByUserId);
router.post("/", auth, ctrl.prepareDocUpload, upload.single("file"), ctrl.upload);
router.delete("/:id", auth, ctrl.remove);

module.exports = router;
