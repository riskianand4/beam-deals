const Attendance = require("../models/Attendance");
const LeaveRequest = require("../models/LeaveRequest");
const LeaveBalance = require("../models/LeaveBalance");
const Notification = require("../models/Notification");
const User = require("../models/User");
const notificationService = require("./notificationService");

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// stateid mapping: 0=masuk, 1=pulang, 2=istirahat keluar, 3=istirahat masuk, 4=lembur masuk, 5=lembur keluar
const STATEID_FIELD_MAP = {
  "0": "clockIn",
  "1": "clockOut",
  "2": "breakOut",
  "3": "breakIn",
  "4": "overtimeIn",
  "5": "overtimeOut",
};

// Device ID → Office location mapping
const DEVICE_LOCATION_MAP = {
  "CQU4231260004": "Meulaboh",
  "FYA1242800387": "Banda Aceh",
};

exports.getAttendance = async (query = {}) => {
  const filter = {};
  if (query.userId) filter.userId = query.userId;
  if (query.userName) filter.userName = { $regex: new RegExp(`^${escapeRegex(query.userName.trim())}$`, "i") };
  if (query.date) filter.date = query.date;
  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) filter.date.$gte = query.startDate;
    if (query.endDate) filter.date.$lte = query.endDate;
  }
  return Attendance.find(filter).sort({ date: -1, clockIn: -1 });
};

exports.clockIn = async (userId, location) => {
  const date = new Date().toISOString().split("T")[0];
  const time = new Date().toTimeString().slice(0, 5);

  let record = await Attendance.findOne({ userId, date });
  if (record && record.clockIn) throw Object.assign(new Error("Sudah clock in hari ini"), { statusCode: 400 });

  const user = await User.findById(userId);
  const userName = user ? user.name : "";
  const userOffice = user ? user.office || "" : "";

  // Check for permanent justification from previous record
  const prevRecord = await Attendance.findOne({ userId, justificationPermanent: true }).sort({ date: -1 });
  const justFields = prevRecord ? { justification: prevRecord.justification, justificationPermanent: true } : {};

  if (record) {
    record.clockIn = time;
    record.status = "clock_in";
    record.location = location || userOffice;
    record.userName = userName;
    record.source = "manual";
    if (justFields.justification) {
      record.justification = justFields.justification;
      record.justificationPermanent = true;
    }
    await record.save();
  } else {
    record = await Attendance.create({
      userId, date, clockIn: time, status: "clock_in", location: location || userOffice, userName, source: "manual",
      ...justFields,
    });
  }
  return record;
};

exports.clockOut = async (userId) => {
  const date = new Date().toISOString().split("T")[0];
  const time = new Date().toTimeString().slice(0, 5);

  const record = await Attendance.findOne({ userId, date });
  if (!record || !record.clockIn) throw Object.assign(new Error("Belum clock in"), { statusCode: 400 });
  if (record.clockOut) throw Object.assign(new Error("Sudah clock out"), { statusCode: 400 });

  record.clockOut = time;
  // Determine final status based on clock in time
  const isLate = record.clockIn > "09:00";
  record.status = isLate ? "late" : "present";
  await record.save();
  return record;
};

exports.processWebhook = async (payload) => {
  if (!payload || !payload.biodata) throw Object.assign(new Error("Invalid payload"), { statusCode: 400 });

  const { user_id, disp_nm, tran_dt, tran_id, stateid, verify, workcod, is_mask, bodytem } = payload.biodata;
  const deviceId = payload.biopush?.device || "";
  const biokey = payload.biopush?.biokey || "";

  if (!user_id || !tran_dt) throw Object.assign(new Error("Missing user_id or tran_dt"), { statusCode: 400 });

  const [datePart, timePart] = tran_dt.split(" ");
  const clockTime = timePart ? timePart.slice(0, 5) : null;

  let resolvedUserId = user_id;
  if (disp_nm) {
    const matchedUser = await User.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(disp_nm)}$`, "i") },
    });
    if (matchedUser) {
      resolvedUserId = matchedUser._id.toString();
    }
  }

  const stateStr = String(stateid ?? "0");
  const timeField = STATEID_FIELD_MAP[stateStr] || "clockIn";

  const existingRecord = await Attendance.findOne({ userId: resolvedUserId, date: datePart });

  // Map device ID to office location
  const location = DEVICE_LOCATION_MAP[deviceId] || "Tidak Diketahui";

  const webhookFields = {
    userName: disp_nm || "",
    deviceId,
    biokey,
    tranId: tran_id ? String(tran_id) : "",
    stateid: stateStr,
    verify: verify != null ? String(verify) : "",
    workcod: workcod || "",
    isMask: is_mask ?? 0,
    bodyTemp: bodytem ?? 0,
    source: "webhook",
    location,
  };

  // Check for permanent justification
  const prevRecord = await Attendance.findOne({ userId: resolvedUserId, justificationPermanent: true }).sort({ date: -1 });
  const justFields = prevRecord ? { justification: prevRecord.justification, justificationPermanent: true } : {};

  if (existingRecord) {
    existingRecord[timeField] = clockTime;
    Object.assign(existingRecord, webhookFields);

    if (stateStr === "0") {
      existingRecord.status = "clock_in";
    } else if (stateStr === "1") {
      const isLate = existingRecord.clockIn > "09:00";
      existingRecord.status = isLate ? "late" : "present";
    }

    // Apply permanent justification if not already set
    if (justFields.justification && !existingRecord.justification) {
      existingRecord.justification = justFields.justification;
      existingRecord.justificationPermanent = true;
    }

    await existingRecord.save();

    const stateLabels = { "0": "Masuk", "1": "Pulang", "2": "Istirahat Keluar", "3": "Istirahat Masuk", "4": "Lembur Masuk", "5": "Lembur Keluar" };
    return { success: true, message: `${stateLabels[stateStr] || "Record"} berhasil`, record: existingRecord };
  }

  const newData = {
    userId: resolvedUserId,
    date: datePart,
    status: stateStr === "0" ? "clock_in" : "present",
    ...webhookFields,
    ...justFields,
  };
  newData[timeField] = clockTime;

  const record = await Attendance.create(newData);

  const stateLabels = { "0": "Clock in", "1": "Clock out", "2": "Istirahat keluar", "3": "Istirahat masuk", "4": "Lembur masuk", "5": "Lembur keluar" };
  return { success: true, message: `${stateLabels[stateStr] || "Record"} berhasil`, record };
};

// Import CSV
exports.importCSV = async (rows) => {
  const results = [];
  for (const row of rows) {
    const record = await Attendance.create({ ...row, source: "import" });
    results.push(record);
  }
  return { imported: results.length };
};

// Summary per user
exports.getSummary = async (userId, month) => {
  const filter = { userId };
  if (month) filter.date = { $regex: `^${month}` };
  const records = await Attendance.find(filter);

  const summary = { total: records.length, present: 0, late: 0, absent: 0, leave: 0, izin: 0, sakit: 0, alpa: 0, dinasLuar: 0 };
  for (const r of records) {
    if (r.status === "present") summary.present++;
    else if (r.status === "late") summary.late++;
    else if (r.status === "absent") summary.absent++;
    else if (r.status === "leave") summary.leave++;

    if (r.reason === "izin") summary.izin++;
    else if (r.reason === "sakit") summary.sakit++;
    else if (r.reason === "alpa") summary.alpa++;
    else if (r.reason === "dinas luar") summary.dinasLuar++;
  }
  return summary;
};

// Update record
exports.updateAttendance = async (id, data) => {
  const record = await Attendance.findById(id);
  if (!record) throw Object.assign(new Error("Record tidak ditemukan"), { statusCode: 404 });
  Object.assign(record, data);
  await record.save();
  return record;
};

// Upload proof
exports.uploadProof = async (id, filePath) => {
  const record = await Attendance.findById(id);
  if (!record) throw Object.assign(new Error("Record tidak ditemukan"), { statusCode: 404 });
  record.proofImage = filePath;
  await record.save();
  return record;
};

// Create manual record
exports.createManual = async (data) => {
  return Attendance.create({ ...data, source: "manual" });
};

// Delete attendance record
exports.deleteAttendance = async (id) => {
  const record = await Attendance.findByIdAndDelete(id);
  if (!record) throw Object.assign(new Error("Record tidak ditemukan"), { statusCode: 404 });
  return { message: "Data kehadiran berhasil dihapus" };
};

// Leave requests
exports.getLeaveRequests = async (query = {}) => {
  const filter = {};
  if (query.userId) filter.userId = query.userId;
  if (query.status) filter.status = query.status;
  return LeaveRequest.find(filter).sort({ createdAt: -1 });
};

exports.createLeaveRequest = async (data) => {
  return LeaveRequest.create(data);
};

exports.approveLeaveRequest = async (id, adminId, status) => {
  const req = await LeaveRequest.findById(id);
  if (!req) throw Object.assign(new Error("Pengajuan tidak ditemukan"), { statusCode: 404 });
  req.status = status;
  req.approvedBy = adminId;
  await req.save();

  const statusLabel = status === "approved" ? "disetujui" : "ditolak";
  await notificationService.create({
    userId: req.userId,
    title: `Pengajuan Cuti ${status === "approved" ? "Disetujui" : "Ditolak"}`,
    message: `Pengajuan cuti Anda telah ${statusLabel}`,
    type: status === "approved" ? "success" : "warning",
    category: "attendance",
  });

  return req;
};

// Leave balance
exports.getLeaveBalance = async (userId) => {
  let balance = await LeaveBalance.findOne({ userId });
  if (!balance) {
    balance = await LeaveBalance.create({ userId });
  }
  return balance;
};

exports.getLeaveBalances = async () => {
  return LeaveBalance.find();
};

// Excluded employees
const ExcludedEmployee = require("../models/ExcludedEmployee");

exports.getExcludedEmployees = async () => {
  return ExcludedEmployee.find().sort({ createdAt: -1 });
};

exports.addExcludedEmployee = async (data) => {
  const existing = await ExcludedEmployee.findOne({ userId: data.userId });
  if (existing) throw Object.assign(new Error("Karyawan sudah ada dalam daftar"), { statusCode: 400 });
  return ExcludedEmployee.create(data);
};

exports.removeExcludedEmployee = async (id) => {
  const doc = await ExcludedEmployee.findByIdAndDelete(id);
  if (!doc) throw Object.assign(new Error("Data tidak ditemukan"), { statusCode: 404 });
  return { message: "Berhasil dihapus" };
};

// Justification suggestions (autocomplete)
exports.getJustificationSuggestions = async () => {
  return Attendance.distinct("justification", { justification: { $ne: "" }, justification: { $exists: true } });
};

// Holidays CRUD
const Holiday = require("../models/Holiday");

exports.getHolidays = async () => {
  return Holiday.find().sort({ date: 1 });
};

exports.createHoliday = async (data) => {
  const existing = await Holiday.findOne({ date: data.date });
  if (existing) throw Object.assign(new Error("Tanggal libur sudah ada"), { statusCode: 400 });
  return Holiday.create(data);
};

exports.deleteHoliday = async (id) => {
  const doc = await Holiday.findByIdAndDelete(id);
  if (!doc) throw Object.assign(new Error("Data tidak ditemukan"), { statusCode: 404 });
  return { message: "Hari libur berhasil dihapus" };
};

// Absent salary calculation
const Payslip = require("../models/Payslip");

exports.getAbsentSalary = async (userId) => {
  // Find latest payslip for this user
  const latestPayslip = await Payslip.findOne({ userId }).sort({ createdAt: -1 });
  
  const filter = { userId };
  if (latestPayslip) {
    // Only count records after the latest payslip was created
    const payslipDate = latestPayslip.createdAt.toISOString().split("T")[0];
    filter.date = { $gt: payslipDate };
  }
  
  // Count records where both clockIn and clockOut exist
  const records = await Attendance.find({
    ...filter,
    clockIn: { $ne: null, $exists: true },
    clockOut: { $ne: null, $exists: true },
    status: { $in: ["present", "late"] },
  });
  
  const dailyRate = 50000;
  const days = records.length;
  const total = days * dailyRate;
  
  return { days, dailyRate, total, since: latestPayslip ? latestPayslip.createdAt : null };
};

// Export PDF — receives pre-filtered records from frontend
exports.generatePDF = async (records, dateLabel, logoPath) => {
  // Build status labels from DB + fallback
  const dbStatuses = await AttendanceStatus.find();
  const statusLabel = {
    present: "Hadir", late: "Terlambat", absent: "Alpa", leave: "Cuti/Izin",
    izin: "Izin", sakit: "Sakit", "---": "---", clock_in: "Clock In", clock_out: "Clock Out",
  };
  for (const s of dbStatuses) { statusLabel[s.name] = s.label; }

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "-";

  const logoImg = logoPath ? `<img src="${logoPath}" class="logo-hd" />` : "";
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
  .header h2 { margin: 0; font-size: 16px; }
  .header .subtitle { color: #666; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
  th { background: #f5f5f5; font-weight: bold; font-size: 10px; }
  td { font-size: 10px; }
  .footer { margin-top: 15px; text-align: right; font-size: 9px; color: #999; }
  .logo-hd { height: 55px; object-fit: contain; image-rendering: crisp-edges; }
</style></head><body>
  <div class="header">
    <div>
      <h2>Daftar Hadir Karyawan</h2>
      <p class="subtitle">Tanggal: ${dateLabel || "-"}</p>
    </div>
    <div>${logoImg}</div>
  </div>
  <table>
    <thead><tr>
      <th>No</th><th>Nama</th><th>Masuk</th><th>Pulang</th><th>Status</th><th>Kantor</th><th>Justifikasi</th>
    </tr></thead>
    <tbody>
      ${(records || []).map((r, i) => `<tr>
        <td>${i + 1}</td>
        <td>${(r.employeeName || r.userName || "-").toUpperCase()}</td>
        <td>${r.clockIn || "-"}</td>
        <td>${r.clockOut || "-"}</td>
        <td>${statusLabel[r.status] || r.status}</td>
        <td>${(r.location || "-").toUpperCase()}</td>
        <td>${r.justification || "-"}</td>
      </tr>`).join("")}
    </tbody>
  </table>
  <div class="footer">Dicetak pada: ${new Date().toLocaleString("id-ID")}</div>
</body></html>`;

  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "15mm", bottom: "15mm", left: "10mm", right: "10mm" } });
  await browser.close();
  return pdfBuffer;
};

// ========== Custom Attendance Statuses ==========
const AttendanceStatus = require("../models/AttendanceStatus");

const DEFAULT_STATUSES = [
  { name: "present", label: "Hadir", isDefault: true },
  { name: "late", label: "Terlambat", isDefault: true },
  { name: "absent", label: "Alpa", isDefault: true },
  { name: "izin", label: "Izin", isDefault: true },
  { name: "sakit", label: "Sakit", isDefault: true },
  { name: "---", label: "---", isDefault: true },
  { name: "clock_in", label: "Clock In", isDefault: true },
  { name: "clock_out", label: "Clock Out", isDefault: true },
  { name: "leave", label: "Cuti/Izin", isDefault: true },
];

exports.getStatuses = async () => {
  let statuses = await AttendanceStatus.find().sort({ isDefault: -1, label: 1 });
  if (statuses.length === 0) {
    // Seed defaults
    await AttendanceStatus.insertMany(DEFAULT_STATUSES);
    statuses = await AttendanceStatus.find().sort({ isDefault: -1, label: 1 });
  }
  return statuses;
};

exports.createStatus = async (data) => {
  const existing = await AttendanceStatus.findOne({ name: data.name });
  if (existing) throw Object.assign(new Error("Status sudah ada"), { statusCode: 400 });
  return AttendanceStatus.create({ name: data.name, label: data.label || data.name, isDefault: false });
};

exports.deleteStatus = async (id) => {
  const status = await AttendanceStatus.findById(id);
  if (!status) throw Object.assign(new Error("Status tidak ditemukan"), { statusCode: 404 });
  if (status.isDefault) throw Object.assign(new Error("Status default tidak bisa dihapus"), { statusCode: 400 });
  await AttendanceStatus.findByIdAndDelete(id);
  return { message: "Status berhasil dihapus" };
};
