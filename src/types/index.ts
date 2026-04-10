// All shared types — no mock data, pure interfaces
export type Role = "admin" | "employee";
export type TaskStatus = "todo" | "completed";
export type Priority = "high" | "medium" | "low" | "none";
export type LeaveType = "annual" | "sick" | "permission";
export type RequestStatus = "pending" | "approved" | "rejected";
export type AttendanceStatus = string;
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
  whatsapp?: string | null;
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
  office?: string;
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
  uploadedBy?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  teamId?: string;
  type: "personal" | "team";
  createdBy?: string;
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
  attachments?: TaskAttachment[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  expiresAt?: string;
  status?: "active" | "draft";
  createdAt: string;
  updatedAt?: string;
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

export type NotificationCategory = "task" | "payslip" | "announcement" | "message" | "finance" | "explorer" | "partner" | "approval" | "attendance" | "team" | "work_report" | "general";

export interface Notification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "info" | "warning" | "success";
  category?: NotificationCategory;
}

export interface WorkReport {
  id: string;
  userId: string;
  title: string;
  description: string;
  fileUrl?: string;
  createdAt: string;
  updatedAt?: string;
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
  justification?: string;
  justificationPermanent?: boolean;
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

export interface ReimbursementComment {
  _id?: string;
  userId: string;
  text: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface ReimbursementApprover {
  userId: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  attachmentUrl?: string[];
  reviewedAt: string | null;
}

export interface Reimbursement {
  id: string;
  userId: string;
  category: string;
  amount: number;
  subject?: string;
  description: string;
  attachments: string[];
  attachmentUrl?: string;
  approvers?: ReimbursementApprover[];
  cc?: { userId: string; name?: string }[];
  comments?: ReimbursementComment[];
  status: RequestStatus | "reviewing";
  overallStatus?: "pending" | "reviewing" | "approved" | "rejected";
  approvedBy?: string;
  requesterName?: string;
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
  leaderIds?: string[];
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
  type: "message" | "collaboration_request" | "announcement" | "approval_request" | "group";
  subject: string;
  content: string;
  status: "pending" | "accepted" | "rejected" | "read" | "approved";
  threadId: string | null;
  parentMessageId: string | null;
  isRead: boolean;
  approvalResponse: string;
  attachmentUrl?: string;
  ccUserIds?: string[];
  groupId?: string;
  groupName?: string;
  pinned?: boolean;
  createdAt: string;
}

export interface ChatGroupData {
  id: string;
  name: string;
  memberIds: string[];
  createdBy: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface ApprovalComment {
  _id?: string;
  userId: string;
  text: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface ApprovalApprover {
  userId: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  attachmentUrl?: string[];
  reviewedAt: string | null;
}

export interface ApprovalRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  type: "leave" | "reimbursement" | "permission" | "kendaraan" | "pencairan" | "other";
  subject: string;
  description: string;
  approvers: ApprovalApprover[];
  cc?: { userId: string; name?: string }[];
  comments?: ApprovalComment[];
  attachmentUrl: string;
  responseAttachmentUrl?: string;
  overallStatus: "pending" | "reviewing" | "approved" | "rejected";
  createdAt: string;
}

export interface ExcludedEmployee {
  id: string;
  userId: string;
  userName: string;
  description: string;
  createdAt?: string;
}

export interface PartnerData {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  status: "active" | "inactive";
  notes: string;
  userId?: string | null;
  createdAt?: string;
}

export interface PartnerProject {
  id: string;
  title: string;
  description: string;
  partnerId: string;
  status: "active" | "completed" | "on-hold";
  progress: number;
  startDate: string;
  endDate: string;
  createdAt?: string;
}

export interface PartnerReport {
  id: string;
  projectId: string;
  partnerId: string;
  title: string;
  content: string;
  fileUrl: string;
  createdAt?: string;
}

export interface PartnerContract {
  id: string;
  partnerId: string;
  projectId?: string | null;
  title: string;
  fileUrl: string;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "draft";
  createdAt?: string;
}

export interface WarningLetter {
  id: string;
  userId: string;
  level: "SP1" | "SP2" | "SP3" | "pemecatan";
  reason: string;
  issuedDate: string;
  expiresAt: string;
  documentBase64?: string;
  issuedBy: string;
  status: "active" | "expired";
  createdAt?: string;
}
export interface AccessPermission {
  userId: string;
  permission: "view" | "edit";
}

export interface ExplorerFolder {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string | null;
  accessType: "all" | "team" | "specific" | "partner";
  accessIds: string[];
  accessPermissions?: AccessPermission[];
  linkedPartnerId?: string | null;
  pinned?: boolean;
  locked?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ExplorerFile {
  id: string;
  name: string;
  folderId: string | null;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  ownerId: string | null;
  pinned?: boolean;
  locked?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

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
