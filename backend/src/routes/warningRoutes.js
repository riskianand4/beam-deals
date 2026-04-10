const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/warningController");
const { auth, adminOnly } = require("../middleware/auth");

router.get("/me", auth, ctrl.getActiveForMe);
router.get("/:userId", auth, ctrl.getByUserId);
router.post("/", auth, adminOnly, ctrl.create);
router.delete("/:id", auth, adminOnly, ctrl.remove);

module.exports = router;
