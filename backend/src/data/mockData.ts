export type Role = "admin" | "employee";
export type TaskStatus = "todo" | "in-progress" | "needs-review" | "completed";
export type Priority = "high" | "medium" | "low";
export type LeaveType = "annual" | "sick" | "permission";
export type RequestStatus = "pending" | "approved" | "rejected";
export type AttendanceStatus = "present" | "late" | "absent" | "leave";
export type Gender = "male" | "female";
export type MaritalStatus = "single" | "married" | "divorced" | "widowed";
export type DocumentType = "ktp" | "kk" | "sim" | "ijazah" | "foto" | "other";

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  avatar?: string;
  joinDate: string;
  department: string;
  position: string;
  phone?: string;
  emergencyContact?: string;
  address?: string;
  contractType?: string;
  pin?: string;
  // Extended profile fields
  birthPlace?: string;
  birthDate?: string;
  gender?: Gender;
  religion?: string;
  maritalStatus?: MaritalStatus;
  npwp?: string;
  bpjsKesehatan?: string;
  bpjsKetenagakerjaan?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}

export interface UserDocument {
  id: string;
  userId: string;
  type: DocumentType;
  fileName: string;
  fileUrl: string; // base64 or URL
  uploadedAt: string;
  label?: string; // for "other" type
}

export interface TaskAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  teamId?: string;
  status: TaskStatus;
  priority: Priority;
  deadline: string;
  createdAt: string;
  notes: TaskNote[];
  attachments: TaskAttachment[];
}

export interface TaskNote {
  id: string;
  text: string;
  createdAt: string;
  authorId: string;
}

export interface CompanyLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  category: string;
  username?: string;
  password?: string;
  description?: string;
  assignedTo?: string; // employee ID or "all"
}

export interface PersonalCredential {
  id: string;
  userId: string;
  systemName: string;
  url: string;
  username: string;
  password: string;
}

export interface BossNote {
  employeeId: string;
  content: string;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  type: "task_created" | "task_completed" | "task_assigned" | "note_added" | "status_changed";
  message: string;
  timestamp: string;
  userId: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "info" | "warning" | "success";
}

// ===== ESS Types =====

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: AttendanceStatus;
  location: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  attachments: string[]; // multi-file names
  status: RequestStatus;
  approvedBy?: string;
  createdAt: string;
}

export interface ReimbursementRequest {
  id: string;
  userId: string;
  category: string;
  amount: number;
  description: string;
  attachments: string[]; // multi-file names
  status: RequestStatus;
  approvedBy?: string;
  paymentNote?: string; // "Transfer langsung" / "Masuk slip gaji"
  paymentDate?: string;
  createdAt: string;
}

export interface CashAdvance {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  returnDate: string;
  status: RequestStatus;
  approvedBy?: string;
  createdAt: string;
}

export interface PayslipAllowance {
  name: string;
  amount: number;
}

export interface PayslipDeduction {
  name: string;
  amount: number;
}

export interface PayslipData {
  id: string;
  userId: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: PayslipAllowance[];
  deductions: PayslipDeduction[];
  netSalary: number;
}

export interface ContractHistory {
  id: string;
  userId: string;
  type: string;
  startDate: string;
  endDate: string;
  position: string;
}

// ===== New Types =====

export interface TeamGroup {
  id: string;
  name: string;
  memberIds: string[];
  leaderId?: string;
  description?: string;
  createdAt: string;
}

export interface DailyNote {
  id: string;
  userId: string;
  date: string;
  content: string;
  createdAt: string;
}

export interface AdminNote {
  id: string;
  fromAdminId: string;
  toEmployeeId: string;
  content: string;
  priority: "normal" | "important";
  createdAt: string;
}

// ===== Mock Data =====

export const MOCK_USERS: User[] = [
  { 
    id: "admin-1", name: "Sari Dewi", email: "admin@telnet.co.id", role: "admin", avatar: "", 
    joinDate: "2023-01-15", department: "HRD", position: "HR Manager", 
    phone: "0812-3456-7890", emergencyContact: "0811-1234-5678", address: "Jl. T. Umar No. 12, Banda Aceh", 
    contractType: "Tetap", pin: "1234",
    birthPlace: "Banda Aceh", birthDate: "1990-05-15", gender: "female", religion: "Islam", maritalStatus: "married",
    npwp: "12.345.678.9-001.000", bpjsKesehatan: "0001234567890", bpjsKetenagakerjaan: "0001234567890",
    bankName: "BCA", bankAccountNumber: "1234567890", bankAccountName: "Sari Dewi"
  },
  { 
    id: "emp-1", name: "Andi Pratama", email: "andi@telnet.co.id", role: "employee", avatar: "", 
    joinDate: "2023-06-20", department: "NOC", position: "Network Engineer", 
    phone: "0813-5678-1234", emergencyContact: "0812-8765-4321", address: "Jl. Nyak Adam Kamil No. 5, Banda Aceh", 
    contractType: "Tetap", pin: "1234",
    birthPlace: "Banda Aceh", birthDate: "1995-08-20", gender: "male", religion: "Islam", maritalStatus: "single"
  },
  { 
    id: "emp-2", name: "Budi Santoso", email: "budi@telnet.co.id", role: "employee", avatar: "", 
    joinDate: "2024-02-10", department: "Field Technician", position: "Teknisi Lapangan", 
    phone: "0815-9876-5432", emergencyContact: "0814-1122-3344", address: "Jl. Iskandar Muda No. 78, Banda Aceh", 
    contractType: "Kontrak", pin: "1234"
  },
  { 
    id: "emp-3", name: "Citra Lestari", email: "citra@telnet.co.id", role: "employee", avatar: "", 
    joinDate: "2024-08-01", department: "Customer Service", position: "CS Representative", 
    phone: "0816-5544-3322", emergencyContact: "0817-6677-8899", address: "Jl. Diponegoro No. 45, Banda Aceh", 
    contractType: "Kontrak", pin: "1234",
    birthPlace: "Medan", birthDate: "1998-03-10", gender: "female"
  },
];

export const MOCK_USER_DOCUMENTS: UserDocument[] = [
  { id: "doc-1", userId: "admin-1", type: "ktp", fileName: "ktp-sari-dewi.jpg", fileUrl: "", uploadedAt: "2023-01-15" },
  { id: "doc-2", userId: "admin-1", type: "kk", fileName: "kk-sari-dewi.pdf", fileUrl: "", uploadedAt: "2023-01-15" },
  { id: "doc-3", userId: "admin-1", type: "foto", fileName: "foto-formal-sari.jpg", fileUrl: "", uploadedAt: "2023-01-15" },
  { id: "doc-4", userId: "emp-1", type: "ktp", fileName: "ktp-andi.jpg", fileUrl: "", uploadedAt: "2023-06-20" },
  { id: "doc-5", userId: "emp-1", type: "foto", fileName: "foto-andi.jpg", fileUrl: "", uploadedAt: "2023-06-20" },
];

export const MOCK_TASKS: Task[] = [
  {
    id: "task-1", title: "Troubleshoot gangguan jaringan Sektor 3",
    description: "Pelanggan di area Lampriet melaporkan koneksi lambat sejak pagi.",
    assigneeId: "emp-1", status: "in-progress", priority: "high", deadline: "2026-03-05", createdAt: "2026-03-03",
    notes: [{ id: "n1", text: "Sudah cek OLT, ada port yang drop", createdAt: "2026-03-03", authorId: "emp-1" }], attachments: [],
  },
  {
    id: "task-2", title: "Instalasi pelanggan baru - Jl. Sudirman",
    description: "Pemasangan ODP dan ONT untuk pelanggan baru paket 50 Mbps.",
    assigneeId: "emp-2", status: "todo", priority: "high", deadline: "2026-03-04", createdAt: "2026-03-02", notes: [], attachments: [],
  },
  {
    id: "task-3", title: "Laporan gangguan mingguan",
    description: "Kompilasi data trouble ticket minggu ini untuk review NOC.",
    assigneeId: "emp-1", status: "needs-review", priority: "medium", deadline: "2026-03-07", createdAt: "2026-03-01",
    notes: [{ id: "n2", text: "Draft sudah selesai, menunggu review manager", createdAt: "2026-03-03", authorId: "emp-1" }], attachments: [],
  },
  {
    id: "task-4", title: "Update firmware ONT batch 2",
    description: "Update firmware ONT ZTE di area Ulee Kareng.",
    assigneeId: "emp-2", status: "todo", priority: "low", deadline: "2026-03-10", createdAt: "2026-03-02", notes: [], attachments: [],
  },
  {
    id: "task-5", title: "Follow-up keluhan pelanggan #4521",
    description: "Pelanggan mengeluhkan putus-nyambung. Sudah di-eskalasi ke NOC.",
    assigneeId: "emp-3", status: "completed", priority: "high", deadline: "2026-03-02", createdAt: "2026-02-28",
    notes: [{ id: "n3", text: "Masalah sudah resolved, kabel FO putus sudah disambung", createdAt: "2026-03-01", authorId: "emp-3" }], attachments: [],
  },
  {
    id: "task-6", title: "Survey lokasi pemasangan tower baru",
    description: "Survey di Jl. T. Hasan, Lampulo untuk rencana ekspansi.",
    assigneeId: "emp-2", status: "in-progress", priority: "medium", deadline: "2026-03-06", createdAt: "2026-03-01", notes: [], attachments: [],
  },
];

export const MOCK_COMPANY_LINKS: CompanyLink[] = [
  { id: "cl-1", title: "Portal SDM", url: "https://sdm.telnet.co.id", icon: "Building2", category: "SDM", username: "karyawan@telnet.co.id", password: "sdm2026!", description: "Portal SDM untuk cek data kepegawaian", assignedTo: "all" },
  { id: "cl-2", title: "SIMO", url: "https://simo.telnet.co.id", icon: "LayoutDashboard", category: "Operasional", username: "operator", password: "simo@telnet", description: "Sistem Manajemen Operasional jaringan", assignedTo: "emp-1" },
  { id: "cl-3", title: "Email Perusahaan", url: "https://mail.telnet.co.id", icon: "Mail", category: "Komunikasi", description: "Gunakan email @telnet.co.id masing-masing", assignedTo: "all" },
];

export const MOCK_CREDENTIALS: PersonalCredential[] = [
  { id: "cred-1", userId: "emp-1", systemName: "SIMO", url: "https://simo.telnet.co.id", username: "andi.pratama", password: "xxxxxx" },
  { id: "cred-2", userId: "emp-1", systemName: "NMS Monitoring", url: "https://nms.telnet.co.id", username: "andi-noc", password: "xxxxxx" },
];

export const MOCK_BOSS_NOTES: BossNote[] = [
  { employeeId: "emp-1", content: "Andi sangat reliable untuk troubleshoot jaringan. Calon koordinator NOC.", updatedAt: "2026-02-15" },
  { employeeId: "emp-2", content: "Budi cepat belajar, perlu ditingkatkan skill splicing FO.", updatedAt: "2026-02-10" },
  { employeeId: "emp-3", content: "Citra komunikatif dengan pelanggan. Potensial untuk lead CS.", updatedAt: "2026-02-18" },
];

export const MOCK_ACTIVITIES: ActivityItem[] = [
  { id: "a1", type: "task_completed", message: "Citra menyelesaikan 'Follow-up keluhan #4521'", timestamp: "2026-03-03T09:30:00", userId: "emp-3" },
  { id: "a2", type: "note_added", message: "Andi menambahkan catatan di 'Troubleshoot Sektor 3'", timestamp: "2026-03-03T08:15:00", userId: "emp-1" },
  { id: "a3", type: "status_changed", message: "Andi memindahkan 'Laporan gangguan' ke review", timestamp: "2026-03-02T16:45:00", userId: "emp-1" },
  { id: "a4", type: "task_created", message: "Sari membuat 'Survey lokasi tower baru'", timestamp: "2026-03-01T14:00:00", userId: "admin-1" },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "notif-1", title: "Tenggat mendekat", message: "Instalasi pelanggan baru jatuh tempo besok", timestamp: "2026-03-03T08:00:00", read: false, type: "warning" },
  { id: "notif-2", title: "Tugas selesai", message: "Citra menyelesaikan follow-up keluhan pelanggan", timestamp: "2026-03-03T09:30:00", read: false, type: "success" },
  { id: "notif-3", title: "Cuti disetujui", message: "Pengajuan cuti Anda tanggal 15-17 Maret disetujui", timestamp: "2026-03-02T14:00:00", read: true, type: "info" },
];

export const WEEKLY_PRODUCTIVITY = [
  { day: "Sen", completed: 2 },
  { day: "Sel", completed: 1 },
  { day: "Rab", completed: 3 },
  { day: "Kam", completed: 0 },
  { day: "Jum", completed: 2 },
  { day: "Sab", completed: 1 },
  { day: "Min", completed: 0 },
];

export const MONTHLY_PRODUCTIVITY = [
  { month: "Jan", selesai: 12, dibuat: 15 },
  { month: "Feb", selesai: 18, dibuat: 20 },
  { month: "Mar", selesai: 15, dibuat: 17 },
  { month: "Apr", selesai: 22, dibuat: 25 },
  { month: "Mei", selesai: 20, dibuat: 22 },
  { month: "Jun", selesai: 25, dibuat: 28 },
];

export const CATEGORY_COLORS: Record<string, string> = {
  SDM: "bg-rose-100 text-rose-700",
  Operasional: "bg-blue-100 text-blue-700",
  Komunikasi: "bg-amber-100 text-amber-700",
};

// ===== ESS Mock Data =====

export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  { id: "att-1", userId: "emp-1", date: "2026-03-03", clockIn: "07:55", clockOut: "17:05", status: "present", location: "Kantor Pusat" },
  { id: "att-2", userId: "emp-1", date: "2026-03-02", clockIn: "08:10", clockOut: "17:00", status: "late", location: "Kantor Pusat" },
  { id: "att-3", userId: "emp-1", date: "2026-03-01", clockIn: "07:50", clockOut: "17:15", status: "present", location: "Site Lampriet" },
  { id: "att-4", userId: "emp-1", date: "2026-02-28", clockIn: null, clockOut: null, status: "leave", location: "-" },
  { id: "att-5", userId: "emp-1", date: "2026-02-27", clockIn: "07:58", clockOut: "17:02", status: "present", location: "Kantor Pusat" },
  { id: "att-6", userId: "emp-2", date: "2026-03-03", clockIn: "07:45", clockOut: "17:30", status: "present", location: "Site Ulee Kareng" },
  { id: "att-7", userId: "emp-2", date: "2026-03-02", clockIn: "08:20", clockOut: "17:10", status: "late", location: "Kantor Pusat" },
  { id: "att-8", userId: "emp-3", date: "2026-03-03", clockIn: "07:50", clockOut: "17:00", status: "present", location: "Kantor Pusat" },
];

export const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
  { id: "leave-1", userId: "emp-1", type: "annual", startDate: "2026-03-15", endDate: "2026-03-17", attachments: ["surat-keterangan.pdf"], status: "approved", approvedBy: "admin-1", createdAt: "2026-03-01" },
  { id: "leave-2", userId: "emp-2", type: "sick", startDate: "2026-02-28", endDate: "2026-02-28", attachments: ["surat-dokter.pdf"], status: "approved", approvedBy: "admin-1", createdAt: "2026-02-27" },
  { id: "leave-3", userId: "emp-3", type: "permission", startDate: "2026-03-10", endDate: "2026-03-10", attachments: ["undangan-acara.pdf"], status: "pending", createdAt: "2026-03-03" },
];

export const MOCK_REIMBURSEMENTS: ReimbursementRequest[] = [
  { id: "reimb-1", userId: "emp-2", category: "Transportasi", amount: 150000, description: "Bensin survey lokasi tower Lampulo", attachments: ["struk-spbu.jpg"], status: "approved", approvedBy: "admin-1", paymentNote: "Ditambahkan ke slip gaji bulan depan", paymentDate: "2026-04-01", createdAt: "2026-03-01" },
  { id: "reimb-2", userId: "emp-2", category: "Operasional", amount: 85000, description: "Beli konektor RJ45 & kabel UTP darurat", attachments: ["struk-toko.jpg"], status: "pending", createdAt: "2026-03-03" },
  { id: "reimb-3", userId: "emp-1", category: "Transportasi", amount: 50000, description: "Parkir & bensin ke site Lampriet", attachments: [], status: "pending", createdAt: "2026-03-02" },
];

export const MOCK_CASH_ADVANCES: CashAdvance[] = [
  { id: "kasbon-1", userId: "emp-2", amount: 500000, reason: "Dana operasional pembelian material instalasi", returnDate: "2026-03-15", status: "approved", approvedBy: "admin-1", createdAt: "2026-02-28" },
  { id: "kasbon-2", userId: "emp-1", amount: 300000, reason: "Dana transport ke site remote", returnDate: "2026-03-10", status: "pending", createdAt: "2026-03-02" },
];

export const MOCK_PAYSLIPS: PayslipData[] = [
  {
    id: "slip-1", userId: "emp-1", month: 2, year: 2026, basicSalary: 6500000,
    allowances: [{ name: "Tunjangan Makan", amount: 600000 }, { name: "Tunjangan Transport", amount: 400000 }, { name: "Tunjangan Teknis", amount: 500000 }],
    deductions: [{ name: "BPJS Kesehatan", amount: 200000 }, { name: "BPJS Ketenagakerjaan", amount: 130000 }, { name: "PPh 21", amount: 150000 }],
    netSalary: 7520000,
  },
  {
    id: "slip-2", userId: "emp-1", month: 1, year: 2026, basicSalary: 6500000,
    allowances: [{ name: "Tunjangan Makan", amount: 600000 }, { name: "Tunjangan Transport", amount: 400000 }, { name: "Tunjangan Teknis", amount: 500000 }],
    deductions: [{ name: "BPJS Kesehatan", amount: 200000 }, { name: "BPJS Ketenagakerjaan", amount: 130000 }, { name: "PPh 21", amount: 150000 }],
    netSalary: 7520000,
  },
  {
    id: "slip-3", userId: "emp-2", month: 2, year: 2026, basicSalary: 5000000,
    allowances: [{ name: "Tunjangan Makan", amount: 500000 }, { name: "Tunjangan Transport", amount: 400000 }, { name: "Insentif Lapangan", amount: 300000 }],
    deductions: [{ name: "BPJS Kesehatan", amount: 150000 }, { name: "BPJS Ketenagakerjaan", amount: 100000 }, { name: "Kasbon", amount: 500000 }],
    netSalary: 5450000,
  },
  {
    id: "slip-4", userId: "emp-3", month: 2, year: 2026, basicSalary: 4500000,
    allowances: [{ name: "Tunjangan Makan", amount: 500000 }, { name: "Tunjangan Transport", amount: 300000 }],
    deductions: [{ name: "BPJS Kesehatan", amount: 135000 }, { name: "BPJS Ketenagakerjaan", amount: 90000 }, { name: "PPh 21", amount: 75000 }],
    netSalary: 5000000,
  },
];

export const MOCK_CONTRACTS: ContractHistory[] = [
  { id: "cont-1", userId: "emp-1", type: "PKWT", startDate: "2023-06-20", endDate: "2024-06-19", position: "Jr. Network Engineer" },
  { id: "cont-2", userId: "emp-1", type: "PKWTT", startDate: "2024-06-20", endDate: "-", position: "Network Engineer" },
  { id: "cont-3", userId: "emp-2", type: "PKWT", startDate: "2024-02-10", endDate: "2025-02-09", position: "Teknisi Lapangan" },
  { id: "cont-4", userId: "emp-2", type: "PKWT", startDate: "2025-02-10", endDate: "2026-02-09", position: "Teknisi Lapangan" },
  { id: "cont-5", userId: "emp-3", type: "PKWT", startDate: "2024-08-01", endDate: "2025-07-31", position: "CS Representative" },
];

export const LEAVE_BALANCE: Record<string, { annual: number; used: number; sick: number; sickUsed: number }> = {
  "emp-1": { annual: 12, used: 3, sick: 14, sickUsed: 1 },
  "emp-2": { annual: 12, used: 1, sick: 14, sickUsed: 2 },
  "emp-3": { annual: 12, used: 0, sick: 14, sickUsed: 0 },
};

// ===== New Mock Data =====

export const MOCK_TEAM_GROUPS: TeamGroup[] = [
  { id: "team-1", name: "Tim NOC", memberIds: ["emp-1"], leaderId: "emp-1", description: "Tim Network Operations Center — monitoring & troubleshooting jaringan 24/7", createdAt: "2026-01-15" },
  { id: "team-2", name: "Tim Lapangan", memberIds: ["emp-2"], leaderId: "emp-2", description: "Tim instalasi, maintenance, dan survey lokasi pelanggan", createdAt: "2026-01-15" },
  { id: "team-3", name: "Tim Support", memberIds: ["emp-3"], leaderId: "emp-3", description: "Tim customer service & helpdesk untuk pelanggan Telnet", createdAt: "2026-02-01" },
];

export const MOCK_ADMIN_NOTES: AdminNote[] = [
  { id: "an-1", fromAdminId: "admin-1", toEmployeeId: "emp-1", content: "Jangan lupa submit laporan mingguan sebelum Jumat jam 15:00!", priority: "important", createdAt: "2026-03-03" },
  { id: "an-2", fromAdminId: "admin-1", toEmployeeId: "emp-2", content: "Bawa toolkit lengkap untuk instalasi besok di Jl. Sudirman.", priority: "normal", createdAt: "2026-03-03" },
];
