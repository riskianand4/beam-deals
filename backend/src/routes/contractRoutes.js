const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/contractController");
const { auth, adminOnly } = require("../middleware/auth");

router.get("/user/:userId", auth, ctrl.getByUserId);
router.post("/", auth, adminOnly, ctrl.create);
router.put("/:id", auth, adminOnly, ctrl.update);
router.delete("/:id", auth, adminOnly, ctrl.remove);

module.exports = router;
