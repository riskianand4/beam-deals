const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/activityController");
const { auth } = require("../middleware/auth");

router.get("/", auth, ctrl.getAll);

module.exports = router;
