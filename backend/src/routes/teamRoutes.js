const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/teamController");
const { auth, adminOnly } = require("../middleware/auth");

router.get("/", auth, ctrl.getAll);
router.get("/:id", auth, ctrl.getById);
router.post("/", auth, adminOnly, ctrl.create);
router.put("/:id", auth, adminOnly, ctrl.update);
router.delete("/:id", auth, adminOnly, ctrl.remove);

module.exports = router;
