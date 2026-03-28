const financeService = require("../services/financeService");

exports.getReimbursements = async (req, res, next) => {
  try { res.json(await financeService.getReimbursements(req.query)); } catch (err) { next(err); }
};

exports.createReimbursement = async (req, res, next) => {
  try { res.status(201).json(await financeService.createReimbursement(req.body)); } catch (err) { next(err); }
};

exports.approveReimbursement = async (req, res, next) => {
  try {
    const { status, paymentNote, paymentDate } = req.body;
    res.json(await financeService.approveReimbursement(req.params.id, req.userId, status, paymentNote, paymentDate));
  } catch (err) { next(err); }
};

exports.getCashAdvances = async (req, res, next) => {
  try { res.json(await financeService.getCashAdvances(req.query)); } catch (err) { next(err); }
};

exports.createCashAdvance = async (req, res, next) => {
  try { res.status(201).json(await financeService.createCashAdvance(req.body)); } catch (err) { next(err); }
};

exports.approveCashAdvance = async (req, res, next) => {
  try { res.json(await financeService.approveCashAdvance(req.params.id, req.userId, req.body.status)); } catch (err) { next(err); }
};
