const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/payslipController");
const { auth, adminOnly } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.get("/", auth, ctrl.getAll);
router.get("/:id", auth, ctrl.getById);
router.post("/", auth, adminOnly, upload.single("pdf"), ctrl.create);
router.post("/bulk", auth, adminOnly, upload.array("pdfs", 50), ctrl.bulkCreate);
router.put("/:id", auth, adminOnly, upload.single("pdf"), ctrl.update);
router.delete("/:id", auth, adminOnly, ctrl.remove);

module.exports = router;
