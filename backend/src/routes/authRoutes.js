const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/authController");
const { auth, adminOnly } = require("../middleware/auth");

router.post("/login", ctrl.login);
router.post("/register", ctrl.register);
router.get("/me", auth, ctrl.getMe);
router.put("/reset-password/:userId", auth, adminOnly, ctrl.resetPassword);
router.put("/change-password", auth, ctrl.changePassword);

module.exports = router;
