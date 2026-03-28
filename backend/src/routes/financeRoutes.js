const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/financeController");
const { auth, adminOnly } = require("../middleware/auth");

router.get("/reimbursements", auth, ctrl.getReimbursements);
router.post("/reimbursements", auth, ctrl.createReimbursement);
router.put("/reimbursements/:id", auth, adminOnly, ctrl.approveReimbursement);
router.get("/cash-advances", auth, ctrl.getCashAdvances);
router.post("/cash-advances", auth, ctrl.createCashAdvance);
router.put("/cash-advances/:id", auth, adminOnly, ctrl.approveCashAdvance);

module.exports = router;
