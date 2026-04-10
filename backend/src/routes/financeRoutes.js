const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/financeController");
const { auth } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.get("/reimbursements", auth, ctrl.getReimbursements);
router.post("/reimbursements", auth, upload.single("attachment"), ctrl.createReimbursement);
router.put("/reimbursements/:id", auth, ctrl.approveReimbursement);
router.put("/reimbursements/:id/respond", auth, upload.array("responseAttachment", 10), ctrl.respondReimbursement);
router.post("/reimbursements/:id/comments", auth, upload.single("attachment"), ctrl.addReimbursementComment);
router.delete("/reimbursements/:id", auth, ctrl.deleteReimbursement);
router.get("/cash-advances", auth, ctrl.getCashAdvances);
router.post("/cash-advances", auth, ctrl.createCashAdvance);
router.put("/cash-advances/:id", auth, ctrl.approveCashAdvance);

module.exports = router;
