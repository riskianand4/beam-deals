const express = require("express");
const router = express.Router();

router.use("/auth", require("./authRoutes"));
router.use("/users", require("./userRoutes"));
router.use("/tasks", require("./taskRoutes"));
router.use("/messages", require("./messageRoutes"));
router.use("/documents", require("./documentRoutes"));
router.use("/notifications", require("./notificationRoutes"));
router.use("/attendance", require("./attendanceRoutes"));
router.use("/finance", require("./financeRoutes"));
router.use("/payslips", require("./payslipRoutes"));
router.use("/notes", require("./noteRoutes"));
router.use("/vault", require("./vaultRoutes"));
router.use("/teams", require("./teamRoutes"));
router.use("/contracts", require("./contractRoutes"));
router.use("/activities", require("./activityRoutes"));
router.use("/settings", require("./settingsRoutes"));
router.use("/approvals", require("./approvalRoutes"));
router.use("/partners", require("./partnerRoutes"));
router.use("/warnings", require("./warningRoutes"));
router.use("/announcements", require("./announcementRoutes"));
router.use("/explorer", require("./explorerRoutes"));
router.use("/work-reports", require("./workReportRoutes"));
router.use("/whatsapp", require("./whatsappRoutes"));

module.exports = router;
