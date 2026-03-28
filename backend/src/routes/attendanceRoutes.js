const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/attendanceController");
const { auth, adminOnly, adminOrAccess } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Middleware to check attendance position access and set flag
const checkAttendanceAccess = async (req, res, next) => {
  if (req.user.role === "admin") {
    req.hasPositionAccess = true;
    return next();
  }
  const PositionAccess = require("../models/PositionAccess");
  try {
    const pa = await PositionAccess.findOne({ position: req.user.position || "" });
    req.hasPositionAccess = !!(pa && pa.menus && pa.menus.attendance === true);
  } catch {
    req.hasPositionAccess = false;
  }
  next();
};

router.get("/", auth, checkAttendanceAccess, ctrl.getAttendance);
router.post("/clock-in", auth, ctrl.clockIn);
router.post("/clock-out", auth, ctrl.clockOut);
router.post("/webhook", ctrl.handleWebhook); // No auth — from biometric device
router.post("/manual", auth, ctrl.createManual);
router.put("/:id", auth, ctrl.updateAttendance);
router.post("/:id/proof", auth, upload.single("proof"), ctrl.uploadProof);
router.post("/import", auth, adminOnly, upload.single("file"), ctrl.importCSV);
router.get("/summary/:userId", auth, ctrl.getSummary);
router.get("/leave-requests", auth, ctrl.getLeaveRequests);
router.post("/leave-requests", auth, ctrl.createLeaveRequest);
router.put("/leave-requests/:id", auth, adminOnly, ctrl.approveLeaveRequest);
router.get("/leave-balance/:userId?", auth, ctrl.getLeaveBalance);
router.get("/leave-balances", auth, adminOnly, ctrl.getLeaveBalances);

module.exports = router;
