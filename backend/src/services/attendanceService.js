const Attendance = require("../models/Attendance");
const LeaveRequest = require("../models/LeaveRequest");
const LeaveBalance = require("../models/LeaveBalance");
const Notification = require("../models/Notification");
const User = require("../models/User");

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
  const isLate = time > "08:00";

  let record = await Attendance.findOne({ userId, date });
  if (record && record.clockIn) throw Object.assign(new Error("Sudah clock in hari ini"), { statusCode: 400 });

  const user = await User.findById(userId);
  const userName = user ? user.name : "";

  if (record) {
    record.clockIn = time;
    record.status = isLate ? "late" : "present";
    record.location = location;
    record.userName = userName;
    record.source = "manual";
    await record.save();
  } else {
    record = await Attendance.create({
      userId, date, clockIn: time, status: isLate ? "late" : "present", location, userName, source: "manual",
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

  if (existingRecord) {
    existingRecord[timeField] = clockTime;
    Object.assign(existingRecord, webhookFields);

    if (stateStr === "0") {
      existingRecord.status = clockTime > "09:00" ? "late" : "present";
    }

    await existingRecord.save();

    const stateLabels = { "0": "Masuk", "1": "Pulang", "2": "Istirahat Keluar", "3": "Istirahat Masuk", "4": "Lembur Masuk", "5": "Lembur Keluar" };
    return { success: true, message: `${stateLabels[stateStr] || "Record"} berhasil`, record: existingRecord };
  }

  const isLate = stateStr === "0" && clockTime > "09:00";
  const newData = {
    userId: resolvedUserId,
    date: datePart,
    status: isLate ? "late" : "present",
    ...webhookFields,
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
  await Notification.create({
    userId: req.userId,
    title: `Pengajuan Cuti ${status === "approved" ? "Disetujui" : "Ditolak"}`,
    message: `Pengajuan cuti Anda telah ${statusLabel}`,
    type: status === "approved" ? "success" : "warning",
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
