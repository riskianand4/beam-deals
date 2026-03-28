// All shared types — no mock data, pure interfaces
export type Role = "admin" | "employee";
export type TaskStatus = "todo" | "in-progress" | "needs-review" | "completed";
export type Priority = "high" | "medium" | "low";
export type LeaveType = "annual" | "sick" | "permission";
export type RequestStatus = "pending" | "approved" | "rejected";
export type AttendanceStatus = "present" | "late" | "absent" | "leave";
export type Gender = "male" | "female";
export type MaritalStatus = "single" | "married" | "divorced" | "widowed";
export type DocumentType = "ktp" | "kk" | "sim" | "ijazah" | "foto" | "other";

export interface NotificationSettings {
  taskAssignments: boolean;
  deadlineReminders: boolean;
  teamUpdates: boolean;
}

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
  notificationSettings?: NotificationSettings;
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
  fileUrl: string;
  uploadedAt: string;
  label?: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface TaskReviewer {
  id?: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  reviewedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  teamId?: string;
  type: "personal" | "team";
  createdBy?: string;
  reviewers: TaskReviewer[];
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
  assignedTo?: string;
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
  id?: string;
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
  userId?: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "info" | "warning" | "success";
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breakOut?: string | null;
  breakIn?: string | null;
  overtimeIn?: string | null;
  overtimeOut?: string | null;
  status: AttendanceStatus;
  location: string;
  reason?: string;
  proofImage?: string;
  source?: "manual" | "webhook" | "import";
  userName?: string;
  tranId?: string;
  stateid?: string;
  verify?: string;
  workcod?: string;
  isMask?: number;
  bodyTemp?: number;
  deviceId?: string;
  biokey?: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  late: number;
  absent: number;
  leave: number;
  izin: number;
  sakit: number;
  alpa: number;
  dinasLuar: number;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  attachments: string[];
  status: RequestStatus;
  approvedBy?: string;
  createdAt: string;
}

export interface LeaveBalance {
  id?: string;
  userId: string;
  annual: number;
  used: number;
  sick: number;
  sickUsed: number;
}

export interface Reimbursement {
  id: string;
  userId: string;
  category: string;
  amount: number;
  description: string;
  attachments: string[];
  status: RequestStatus;
  approvedBy?: string;
  paymentNote?: string;
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

export interface PayslipData {
  id: string;
  userId: string;
  month: number;
  year: number;
  pdfUrl: string;
  paydayDate: number;
}

export interface ContractHistory {
  id: string;
  userId: string;
  type: string;
  startDate: string;
  endDate: string;
  position: string;
}

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

export interface TeamMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: "message" | "collaboration_request" | "announcement" | "approval_request";
  subject: string;
  content: string;
  status: "pending" | "accepted" | "rejected" | "read" | "approved";
  threadId: string | null;
  parentMessageId: string | null;
  isRead: boolean;
  approvalResponse: string;
  createdAt: string;
}

export interface ApprovalApprover {
  userId: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  reviewedAt: string | null;
}

export interface ApprovalRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  type: "leave" | "reimbursement" | "permission" | "other";
  subject: string;
  description: string;
  approvers: ApprovalApprover[];
  attachmentUrl: string;
  overallStatus: "pending" | "approved" | "rejected";
  createdAt: string;
}

// Constants (non-mock data)
export const WEEKLY_PRODUCTIVITY = [
  { day: "Sen", completed: 0 },
  { day: "Sel", completed: 0 },
  { day: "Rab", completed: 0 },
  { day: "Kam", completed: 0 },
  { day: "Jum", completed: 0 },
  { day: "Sab", completed: 0 },
  { day: "Min", completed: 0 },
];

export const MONTHLY_PRODUCTIVITY = [
  { month: "Jan", selesai: 0, dibuat: 0 },
  { month: "Feb", selesai: 0, dibuat: 0 },
  { month: "Mar", selesai: 0, dibuat: 0 },
  { month: "Apr", selesai: 0, dibuat: 0 },
  { month: "Mei", selesai: 0, dibuat: 0 },
  { month: "Jun", selesai: 0, dibuat: 0 },
];

export const CATEGORY_COLORS: Record<string, string> = {
  SDM: "bg-rose-100 text-rose-700",
  Operasional: "bg-blue-100 text-blue-700",
  Komunikasi: "bg-amber-100 text-amber-700",
};
