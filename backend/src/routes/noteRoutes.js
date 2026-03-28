const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/noteController");
const { auth, adminOrAccess } = require("../middleware/auth");

// Daily notes
router.get("/daily", auth, ctrl.getDailyNotes);
router.post("/daily", auth, ctrl.createDailyNote);
router.put("/daily/:id", auth, ctrl.updateDailyNote);
router.delete("/daily/:id", auth, ctrl.deleteDailyNote);

// Admin notes (admin OR employees with notes access)
router.get("/admin", auth, ctrl.getAdminNotes);
router.post("/admin", auth, adminOrAccess("notes"), ctrl.createAdminNote);
router.delete("/admin/:id", auth, adminOrAccess("notes"), ctrl.deleteAdminNote);

// Boss notes
router.get("/boss", auth, adminOrAccess("notes"), ctrl.getBossNotes);
router.get("/boss/:employeeId", auth, adminOrAccess("notes"), ctrl.getBossNote);
router.put("/boss/:employeeId", auth, adminOrAccess("notes"), ctrl.upsertBossNote);

module.exports = router;
