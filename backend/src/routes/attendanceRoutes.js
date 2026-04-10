const  express = require("express");
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
router.post("/webhook", ctrl.handleWebhook); 
router.post("/manual", auth, ctrl.createManual);
router.put("/:id", auth, ctrl.updateAttendance);
router.delete("/:id", auth, adminOnly, ctrl.deleteAttendance);
router.post("/:id/proof", auth, upload.single("proof"), ctrl.uploadProof);
router.post("/import", auth, adminOnly, upload.single("file"), ctrl.importCSV);
router.get("/summary/:userId", auth, ctrl.getSummary);
router.get("/leave-requests", auth, ctrl.getLeaveRequests);
router.post("/leave-requests", auth, ctrl.createLeaveRequest);
router.put("/leave-requests/:id", auth, adminOnly, ctrl.approveLeaveRequest);
router.get("/leave-balance/:userId?", auth, ctrl.getLeaveBalance);
router.get("/leave-balances", auth, adminOnly, ctrl.getLeaveBalances);

// Excluded employees
router.get("/excluded", auth, ctrl.getExcludedEmployees);
router.post("/excluded", auth, adminOnly, ctrl.addExcludedEmployee);
router.delete("/excluded/:id", auth, adminOnly, ctrl.removeExcludedEmployee);

// Justification suggestions
router.get("/justifications", auth, ctrl.getJustificationSuggestions);

// Holidays
router.get("/holidays", auth, ctrl.getHolidays);
router.post("/holidays", auth, adminOrAccess("attendance"), ctrl.createHoliday);
router.delete("/holidays/:id", auth, adminOrAccess("attendance"), ctrl.deleteHoliday);

// Absent salary
router.get("/absent-salary/:userId?", auth, ctrl.getAbsentSalary);

// Export PDF
router.post("/export-pdf", auth, ctrl.exportPDF);

// Custom attendance statuses
router.get("/statuses", auth, ctrl.getStatuses);
router.post("/statuses", auth, adminOnly, ctrl.createStatus);
router.delete("/statuses/:id", auth, adminOnly, ctrl.deleteStatus);

module.exports = router;
