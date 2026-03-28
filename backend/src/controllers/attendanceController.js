const attendanceService = require("../services/attendanceService");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const path = require("path");
const fs = require("fs");
const csv = require("csvtojson");

exports.getAttendance = async (req, res, next) => {
  try {
    const query = { ...req.query };
    // Admin always sees all; employees with attendance access also see all
    const hasAttendanceAccess = req.user.role === "admin" || req.hasPositionAccess;
    if (!hasAttendanceAccess) {
      query.userName = req.user.name;
      delete query.userId;
    }
    res.json(await attendanceService.getAttendance(query));
  } catch (err) { next(err); }
};

exports.clockIn = async (req, res, next) => {
  try { res.json(await attendanceService.clockIn(req.userId, req.body.location)); } catch (err) { next(err); }
};

exports.clockOut = async (req, res, next) => {
  try { res.json(await attendanceService.clockOut(req.userId)); } catch (err) { next(err); }
};

exports.handleWebhook = async (req, res, next) => {
  try {
    await attendanceService.processWebhook(req.body);

    res.set('Content-Type', 'text/plain');

    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook Error:", err.message);
    
    res.set('Content-Type', 'text/plain');
    res.status(400).send("ERROR");
  }
};

exports.updateAttendance = async (req, res, next) => {
  try { res.json(await attendanceService.updateAttendance(req.params.id, req.body)); } catch (err) { next(err); }
};

exports.uploadProof = async (req, res, next) => {
  try {
    if (!req.file) throw Object.assign(new Error("File tidak ditemukan"), { statusCode: 400 });
    const filePath = "/uploads/" + req.file.filename;
    res.json(await attendanceService.uploadProof(req.params.id, filePath));
  } catch (err) { next(err); }
};

exports.createManual = async (req, res, next) => {
  try { res.status(201).json(await attendanceService.createManual(req.body)); } catch (err) { next(err); }
};

exports.importCSV = async (req, res, next) => {
  try {
    if (!req.file) throw Object.assign(new Error("File tidak ditemukan"), { statusCode: 400 });
    const filePath = req.file.path;
    const rows = await csv().fromFile(filePath);
    const result = await attendanceService.importCSV(rows);
    // Clean up uploaded file
    fs.unlink(filePath, () => {});
    res.json(result);
  } catch (err) { next(err); }
};

exports.getSummary = async (req, res, next) => {
  try { res.json(await attendanceService.getSummary(req.params.userId, req.query.month)); } catch (err) { next(err); }
};

exports.getLeaveRequests = async (req, res, next) => {
  try { res.json(await attendanceService.getLeaveRequests(req.query)); } catch (err) { next(err); }
};

exports.createLeaveRequest = async (req, res, next) => {
  try { res.status(201).json(await attendanceService.createLeaveRequest(req.body)); } catch (err) { next(err); }
};

exports.approveLeaveRequest = async (req, res, next) => {
  try { res.json(await attendanceService.approveLeaveRequest(req.params.id, req.userId, req.body.status)); } catch (err) { next(err); }
};

exports.getLeaveBalance = async (req, res, next) => {
  try { res.json(await attendanceService.getLeaveBalance(req.params.userId || req.userId)); } catch (err) { next(err); }
};

exports.getLeaveBalances = async (req, res, next) => {
  try { res.json(await attendanceService.getLeaveBalances()); } catch (err) { next(err); }
};
