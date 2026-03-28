/**
 * Seed script — run with: node src/seed.js
 * Seeds initial admin + employees + sample data into MongoDB
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const User = require("./models/User");
const Task = require("./models/Task");
const Message = require("./models/Message");
const Document = require("./models/Document");
const Notification = require("./models/Notification");
const Attendance = require("./models/Attendance");
const LeaveRequest = require("./models/LeaveRequest");
const LeaveBalance = require("./models/LeaveBalance");
const Reimbursement = require("./models/Reimbursement");
const CashAdvance = require("./models/CashAdvance");
const Payslip = require("./models/Payslip");
const Contract = require("./models/Contract");
const TeamGroup = require("./models/TeamGroup");
const DailyNote = require("./models/DailyNote");
const AdminNote = require("./models/AdminNote");
const BossNote = require("./models/BossNote");
const CompanyLink = require("./models/CompanyLink");
const Credential = require("./models/Credential");
const Activity = require("./models/Activity");

const seed = async () => {
  await connectDB();
  
  // Clear all collections
  const collections = [User, Task, Message, Document, Notification, Attendance, LeaveRequest, LeaveBalance, Reimbursement, CashAdvance, Payslip, Contract, TeamGroup, DailyNote, AdminNote, BossNote, CompanyLink, Credential, Activity];
  for (const Model of collections) {
    await Model.deleteMany({});
  }
  console.log("Cleared all collections");

  // Create users (password akan di-hash otomatis oleh model)
  const users = await User.create([
    {
      name: "Sari Dewi", email: "admin@telnet.co.id", password: "password123", role: "admin",
      joinDate: "2023-01-15", department: "HRD", position: "HR Manager",
      phone: "0812-3456-7890", emergencyContact: "0811-1234-5678", address: "Jl. T. Umar No. 12, Banda Aceh",
      contractType: "Tetap", pin: "1234",
      birthPlace: "Banda Aceh", birthDate: "1990-05-15", gender: "female", religion: "Islam", maritalStatus: "married",
      npwp: "12.345.678.9-001.000", bpjsKesehatan: "0001234567890", bpjsKetenagakerjaan: "0001234567890",
      bankName: "BCA", bankAccountNumber: "1234567890", bankAccountName: "Sari Dewi",
    },
    {
      name: "Andi Pratama", email: "andi@telnet.co.id", password: "password123", role: "employee",
      joinDate: "2023-06-20", department: "NOC", position: "Network Engineer",
      phone: "0813-5678-1234", emergencyContact: "0812-8765-4321", address: "Jl. Nyak Adam Kamil No. 5, Banda Aceh",
      contractType: "Tetap", pin: "1234",
      birthPlace: "Banda Aceh", birthDate: "1995-08-20", gender: "male", religion: "Islam", maritalStatus: "single",
    },
    {
      name: "Budi Santoso", email: "budi@telnet.co.id", password: "password123", role: "employee",
      joinDate: "2024-02-10", department: "Field Technician", position: "Teknisi Lapangan",
      phone: "0815-9876-5432", emergencyContact: "0814-1122-3344", address: "Jl. Iskandar Muda No. 78, Banda Aceh",
      contractType: "Kontrak", pin: "1234",
    },
    {
      name: "Citra Lestari", email: "citra@telnet.co.id", password: "password123", role: "employee",
      joinDate: "2024-08-01", department: "Customer Service", position: "CS Representative",
      phone: "0816-5544-3322", emergencyContact: "0817-6677-8899", address: "Jl. Diponegoro No. 45, Banda Aceh",
      contractType: "Kontrak", pin: "1234",
      birthPlace: "Medan", birthDate: "1998-03-10", gender: "female",
    },
  ]);
  console.log(`Created ${users.length} users`);

  const admin = users[0];
  const emp1 = users[1];
  const emp2 = users[2];
  const emp3 = users[3];

  // Tasks
  await Task.create([
    { title: "Troubleshoot gangguan jaringan Sektor 3", description: "Pelanggan di area Lampriet melaporkan koneksi lambat sejak pagi.", assigneeId: emp1._id.toString(), status: "in-progress", priority: "high", deadline: "2026-03-05", createdAt: "2026-03-03", notes: [{ text: "Sudah cek OLT, ada port yang drop", authorId: emp1._id.toString(), createdAt: "2026-03-03" }] },
    { title: "Instalasi pelanggan baru - Jl. Sudirman", description: "Pemasangan ODP dan ONT untuk pelanggan baru paket 50 Mbps.", assigneeId: emp2._id.toString(), status: "todo", priority: "high", deadline: "2026-03-04", createdAt: "2026-03-02" },
    { title: "Laporan gangguan mingguan", description: "Kompilasi data trouble ticket minggu ini untuk review NOC.", assigneeId: emp1._id.toString(), status: "needs-review", priority: "medium", deadline: "2026-03-07", createdAt: "2026-03-01", notes: [{ text: "Draft sudah selesai, menunggu review manager", authorId: emp1._id.toString(), createdAt: "2026-03-03" }] },
    { title: "Update firmware ONT batch 2", description: "Update firmware ONT ZTE di area Ulee Kareng.", assigneeId: emp2._id.toString(), status: "todo", priority: "low", deadline: "2026-03-10", createdAt: "2026-03-02" },
    { title: "Follow-up keluhan pelanggan #4521", description: "Pelanggan mengeluhkan putus-nyambung. Sudah di-eskalasi ke NOC.", assigneeId: emp3._id.toString(), status: "completed", priority: "high", deadline: "2026-03-02", createdAt: "2026-02-28", notes: [{ text: "Masalah sudah resolved, kabel FO putus sudah disambung", authorId: emp3._id.toString(), createdAt: "2026-03-01" }] },
    { title: "Survey lokasi pemasangan tower baru", description: "Survey di Jl. T. Hasan, Lampulo untuk rencana ekspansi.", assigneeId: emp2._id.toString(), status: "in-progress", priority: "medium", deadline: "2026-03-06", createdAt: "2026-03-01" },
  ]);
  console.log("Created tasks");

  // Attendance
  await Attendance.create([
    { userId: emp1._id.toString(), date: "2026-03-03", clockIn: "07:55", clockOut: "17:05", status: "present", location: "Kantor Pusat" },
    { userId: emp1._id.toString(), date: "2026-03-02", clockIn: "08:10", clockOut: "17:00", status: "late", location: "Kantor Pusat" },
    { userId: emp1._id.toString(), date: "2026-03-01", clockIn: "07:50", clockOut: "17:15", status: "present", location: "Site Lampriet" },
    { userId: emp2._id.toString(), date: "2026-03-03", clockIn: "07:45", clockOut: "17:30", status: "present", location: "Site Ulee Kareng" },
    { userId: emp3._id.toString(), date: "2026-03-03", clockIn: "07:50", clockOut: "17:00", status: "present", location: "Kantor Pusat" },
  ]);

  // Leave requests
  await LeaveRequest.create([
    { userId: emp1._id.toString(), type: "annual", startDate: "2026-03-15", endDate: "2026-03-17", attachments: ["surat-keterangan.pdf"], status: "approved", approvedBy: admin._id.toString(), createdAt: "2026-03-01" },
    { userId: emp3._id.toString(), type: "permission", startDate: "2026-03-10", endDate: "2026-03-10", attachments: ["undangan-acara.pdf"], status: "pending", createdAt: "2026-03-03" },
  ]);

  // Leave balances
  await LeaveBalance.create([
    { userId: emp1._id.toString(), annual: 12, used: 3, sick: 14, sickUsed: 1 },
    { userId: emp2._id.toString(), annual: 12, used: 1, sick: 14, sickUsed: 2 },
    { userId: emp3._id.toString(), annual: 12, used: 0, sick: 14, sickUsed: 0 },
  ]);

  // Reimbursements
  await Reimbursement.create([
    { userId: emp2._id.toString(), category: "Transportasi", amount: 150000, description: "Bensin survey lokasi tower Lampulo", attachments: ["struk-spbu.jpg"], status: "approved", approvedBy: admin._id.toString(), paymentNote: "Ditambahkan ke slip gaji bulan depan", paymentDate: "2026-04-01", createdAt: "2026-03-01" },
    { userId: emp2._id.toString(), category: "Operasional", amount: 85000, description: "Beli konektor RJ45 & kabel UTP darurat", attachments: ["struk-toko.jpg"], status: "pending", createdAt: "2026-03-03" },
    { userId: emp1._id.toString(), category: "Transportasi", amount: 50000, description: "Parkir & bensin ke site Lampriet", status: "pending", createdAt: "2026-03-02" },
  ]);

  // Cash advances
  await CashAdvance.create([
    { userId: emp2._id.toString(), amount: 500000, reason: "Dana operasional pembelian material instalasi", returnDate: "2026-03-15", status: "approved", approvedBy: admin._id.toString(), createdAt: "2026-02-28" },
    { userId: emp1._id.toString(), amount: 300000, reason: "Dana transport ke site remote", returnDate: "2026-03-10", status: "pending", createdAt: "2026-03-02" },
  ]);

  // Payslips
  await Payslip.create([
    { userId: emp1._id.toString(), month: 2, year: 2026, basicSalary: 6500000, allowances: [{ name: "Tunjangan Makan", amount: 600000 }, { name: "Tunjangan Transport", amount: 400000 }, { name: "Tunjangan Teknis", amount: 500000 }], deductions: [{ name: "BPJS Kesehatan", amount: 200000 }, { name: "BPJS Ketenagakerjaan", amount: 130000 }, { name: "PPh 21", amount: 150000 }], netSalary: 7520000 },
    { userId: emp2._id.toString(), month: 2, year: 2026, basicSalary: 5000000, allowances: [{ name: "Tunjangan Makan", amount: 500000 }, { name: "Tunjangan Transport", amount: 400000 }, { name: "Insentif Lapangan", amount: 300000 }], deductions: [{ name: "BPJS Kesehatan", amount: 150000 }, { name: "BPJS Ketenagakerjaan", amount: 100000 }, { name: "Kasbon", amount: 500000 }], netSalary: 5450000 },
    { userId: emp3._id.toString(), month: 2, year: 2026, basicSalary: 4500000, allowances: [{ name: "Tunjangan Makan", amount: 500000 }, { name: "Tunjangan Transport", amount: 300000 }], deductions: [{ name: "BPJS Kesehatan", amount: 135000 }, { name: "BPJS Ketenagakerjaan", amount: 90000 }, { name: "PPh 21", amount: 75000 }], netSalary: 5000000 },
  ]);

  // Contracts
  await Contract.create([
    { userId: emp1._id.toString(), type: "PKWT", startDate: "2023-06-20", endDate: "2024-06-19", position: "Jr. Network Engineer" },
    { userId: emp1._id.toString(), type: "PKWTT", startDate: "2024-06-20", endDate: "-", position: "Network Engineer" },
    { userId: emp2._id.toString(), type: "PKWT", startDate: "2024-02-10", endDate: "2025-02-09", position: "Teknisi Lapangan" },
    { userId: emp3._id.toString(), type: "PKWT", startDate: "2024-08-01", endDate: "2025-07-31", position: "CS Representative" },
  ]);

  // Teams
  await TeamGroup.create([
    { name: "Tim NOC", memberIds: [emp1._id.toString()], leaderId: emp1._id.toString(), description: "Tim Network Operations Center", createdAt: "2026-01-15" },
    { name: "Tim Lapangan", memberIds: [emp2._id.toString()], leaderId: emp2._id.toString(), description: "Tim instalasi & maintenance", createdAt: "2026-01-15" },
    { name: "Tim Support", memberIds: [emp3._id.toString()], leaderId: emp3._id.toString(), description: "Tim customer service", createdAt: "2026-02-01" },
  ]);

  // Company links
  await CompanyLink.create([
    { title: "Portal SDM", url: "https://sdm.telnet.co.id", icon: "Building2", category: "SDM", username: "karyawan@telnet.co.id", password: "sdm2026!", description: "Portal SDM", assignedTo: "all" },
    { title: "SIMO", url: "https://simo.telnet.co.id", icon: "LayoutDashboard", category: "Operasional", username: "operator", password: "simo@telnet", description: "Sistem Manajemen Operasional", assignedTo: emp1._id.toString() },
    { title: "Email Perusahaan", url: "https://mail.telnet.co.id", icon: "Mail", category: "Komunikasi", description: "Gunakan email @telnet.co.id", assignedTo: "all" },
  ]);

  // Credentials
  await Credential.create([
    { userId: emp1._id.toString(), systemName: "SIMO", url: "https://simo.telnet.co.id", username: "andi.pratama", password: "xxxxxx" },
    { userId: emp1._id.toString(), systemName: "NMS Monitoring", url: "https://nms.telnet.co.id", username: "andi-noc", password: "xxxxxx" },
  ]);

  // Boss notes
  await BossNote.create([
    { employeeId: emp1._id.toString(), content: "Andi sangat reliable untuk troubleshoot jaringan. Calon koordinator NOC.", updatedAt: "2026-02-15" },
    { employeeId: emp2._id.toString(), content: "Budi cepat belajar, perlu ditingkatkan skill splicing FO.", updatedAt: "2026-02-10" },
    { employeeId: emp3._id.toString(), content: "Citra komunikatif dengan pelanggan. Potensial untuk lead CS.", updatedAt: "2026-02-18" },
  ]);

  // Admin notes
  await AdminNote.create([
    { fromAdminId: admin._id.toString(), toEmployeeId: emp1._id.toString(), content: "Jangan lupa submit laporan mingguan sebelum Jumat jam 15:00!", priority: "important", createdAt: "2026-03-03" },
    { fromAdminId: admin._id.toString(), toEmployeeId: emp2._id.toString(), content: "Bawa toolkit lengkap untuk instalasi besok di Jl. Sudirman.", priority: "normal", createdAt: "2026-03-03" },
  ]);

  // Activities
  await Activity.create([
    { type: "task_completed", message: "Citra menyelesaikan 'Follow-up keluhan #4521'", timestamp: "2026-03-03T09:30:00", userId: emp3._id.toString() },
    { type: "note_added", message: "Andi menambahkan catatan di 'Troubleshoot Sektor 3'", timestamp: "2026-03-03T08:15:00", userId: emp1._id.toString() },
    { type: "status_changed", message: "Andi memindahkan 'Laporan gangguan' ke review", timestamp: "2026-03-02T16:45:00", userId: emp1._id.toString() },
    { type: "task_created", message: "Sari membuat 'Survey lokasi tower baru'", timestamp: "2026-03-01T14:00:00", userId: admin._id.toString() },
  ]);

  // Notifications
  await Notification.create([
    { userId: emp1._id.toString(), title: "Tenggat mendekat", message: "Instalasi pelanggan baru jatuh tempo besok", timestamp: "2026-03-03T08:00:00", type: "warning" },
    { userId: admin._id.toString(), title: "Tugas selesai", message: "Citra menyelesaikan follow-up keluhan pelanggan", timestamp: "2026-03-03T09:30:00", type: "success" },
    { userId: emp1._id.toString(), title: "Cuti disetujui", message: "Pengajuan cuti Anda tanggal 15-17 Maret disetujui", timestamp: "2026-03-02T14:00:00", read: true, type: "info" },
  ]);

  // Messages  
  await Message.create([
    { fromUserId: admin._id.toString(), toUserId: emp1._id.toString(), type: "message", content: "Andi, tolong update progress troubleshoot Sektor 3", status: "read", createdAt: "2026-03-03T07:30:00" },
    { fromUserId: emp1._id.toString(), toUserId: admin._id.toString(), type: "message", content: "Sudah cek OLT Bu, ada port drop. Sedang proses recovery.", status: "pending", createdAt: "2026-03-03T08:00:00" },
    { fromUserId: emp3._id.toString(), toUserId: emp1._id.toString(), type: "collaboration_request", content: "Bisa bantu cek koneksi pelanggan #4521 dari sisi NOC?", status: "accepted", createdAt: "2026-03-02T10:00:00" },
  ]);

  // Documents
  await Document.create([
    { userId: admin._id.toString(), type: "ktp", fileName: "ktp-sari-dewi.jpg", uploadedAt: "2023-01-15" },
    { userId: admin._id.toString(), type: "kk", fileName: "kk-sari-dewi.pdf", uploadedAt: "2023-01-15" },
    { userId: admin._id.toString(), type: "foto", fileName: "foto-formal-sari.jpg", uploadedAt: "2023-01-15" },
    { userId: emp1._id.toString(), type: "ktp", fileName: "ktp-andi.jpg", uploadedAt: "2023-06-20" },
    { userId: emp1._id.toString(), type: "foto", fileName: "foto-andi.jpg", uploadedAt: "2023-06-20" },
  ]);

  console.log("Seed completed successfully!");
  console.log("\nLogin credentials:");
  console.log("Admin: admin@telnet.co.id / password123");
  console.log("Employee: andi@telnet.co.id / password123");
  console.log("Employee: budi@telnet.co.id / password123");
  console.log("Employee: citra@telnet.co.id / password123");
  
  process.exit(0);
};

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
