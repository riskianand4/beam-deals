import type {
  User, Task, TaskNote, TaskAttachment, TeamMessage, UserDocument, Notification,
  AttendanceRecord, LeaveRequest, LeaveBalance, Reimbursement, CashAdvance,
  PayslipData, ContractHistory, TeamGroup, DailyNote, AdminNote, BossNote,
  CompanyLink, PersonalCredential, ActivityItem, AttendanceSummary, ApprovalRequest,
} from "@/types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export function getUploadUrl(filePath?: string | null): string {
  if (!filePath) return "";
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
  const baseUrl = API_BASE.replace(/\/api\/?$/, "");
  return `${baseUrl}${filePath}`;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem("auth_token");
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem("auth_token", token);
    else localStorage.removeItem("auth_token");
  }

  getToken() {
    return this.token || localStorage.getItem("auth_token");
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };
    
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }

    return res.json();
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  // Auth
  async login(email: string, password: string) {
    const result = await this.post<{ user: User; token: string }>("/auth/login", { email, password });
    this.setToken(result.token);
    return result;
  }

  async register(data: Partial<User> & { password: string }) {
    const result = await this.post<{ user: User; token: string }>("/auth/register", data);
    this.setToken(result.token);
    return result;
  }

  async getMe() {
    return this.get<User>("/auth/me");
  }

  async resetPassword(userId: string, password: string) {
    return this.put("/auth/reset-password/" + userId, { password });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.put<{ message: string }>("/auth/change-password", { currentPassword, newPassword });
  }

  logout() {
    this.setToken(null);
  }

  // Users
  getUsers(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<User[]>("/users" + q);
  }

  getUser(id: string) { return this.get<User>("/users/" + id); }
  createUser(data: Partial<User> & { password: string }) { return this.post<User>("/users", data); }
  updateUser(id: string, data: Partial<User>) { return this.put<User>("/users/" + id, data); }
  updateProfile(data: Partial<User>) { return this.put<User>("/users/profile", data); }
  deleteUser(id: string) { return this.delete("/users/" + id); }
  uploadAvatarForUser(userId: string, formData: FormData) { return this.post<{ avatar: string }>("/users/" + userId + "/avatar", formData); }

  // Menu Settings
  getMenuSettings() { return this.get<Record<string, boolean>>("/settings/menu"); }
  updateMenuSettings(settings: Record<string, boolean>) { return this.put<Record<string, boolean>>("/settings/menu", settings); }
  getPositionAccess() { return this.get<Record<string, Record<string, boolean>>>("/settings/position-access"); }
  updatePositionAccess(position: string, menus: Record<string, boolean>) { return this.put("/settings/position-access", { position, menus }); }

  // Dynamic Positions
  getPositions() { return this.get<{ id: string; position: string; description: string; menus: Record<string, boolean> }[]>("/settings/positions"); }
  createPosition(position: string, description: string) { return this.post<{ id: string; position: string; description: string; menus: Record<string, boolean> }>("/settings/positions", { position, description }); }
  deletePosition(id: string) { return this.delete("/settings/positions/" + id); }

  // Tasks
  getTasks(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<Task[]>("/tasks" + q);
  }
  getTask(id: string) { return this.get<Task>("/tasks/" + id); }
  createTask(data: Partial<Task>) { return this.post<Task>("/tasks", data); }
  updateTask(id: string, data: Partial<Task>) { return this.put<Task>("/tasks/" + id, data); }
  updateTaskStatus(id: string, status: string, reviewerIds?: string[]) { return this.put<Task>("/tasks/" + id + "/status", { status, reviewerIds }); }
  reviewTask(id: string, action: "approved" | "rejected", reason?: string) { return this.put<Task>("/tasks/" + id + "/review", { action, reason }); }
  getReviewers() { return this.get<User[]>("/users/reviewers"); }
  uploadTaskAttachments(id: string, formData: FormData) { return this.post<Task>("/tasks/" + id + "/attachments", formData); }
  addTaskNote(id: string, note: { text: string; authorId: string }) { return this.post<Task>("/tasks/" + id + "/notes", note); }
  deleteTask(id: string) { return this.delete("/tasks/" + id); }

  // Messages
  getMessages(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<TeamMessage[]>("/messages" + q);
  }
  getThread(threadId: string) { return this.get<TeamMessage[]>("/messages/thread/" + threadId); }
  sendMessage(data: Partial<TeamMessage>) { return this.post<TeamMessage>("/messages", data); }
  updateMessageStatus(id: string, status: string) { return this.put<TeamMessage>("/messages/" + id + "/status", { status }); }
  markMessageRead(id: string) { return this.put<TeamMessage>("/messages/" + id + "/read"); }
  approveMessage(id: string, action: "approved" | "rejected", reason?: string) { return this.put<TeamMessage>("/messages/" + id + "/approve", { action, reason }); }
  getUnreadMessageCount() { return this.get<{ count: number }>("/messages/unread-count"); }
  getPendingRequestCount() { return this.get<{ count: number }>("/messages/pending-requests"); }
  deleteMessage(id: string) { return this.delete("/messages/" + id); }
  getApprovers() { return this.get<User[]>("/users/approvers"); }

  // Documents
  getAllDocuments() { return this.get<UserDocument[]>("/documents"); }
  getUserDocuments(userId: string) { return this.get<UserDocument[]>("/documents/user/" + userId); }
  uploadDocument(formData: FormData) { return this.post<UserDocument>("/documents", formData); }
  deleteDocument(id: string) { return this.delete("/documents/" + id); }

  // Notifications
  getNotifications() { return this.get<Notification[]>("/notifications"); }
  markAllNotificationsRead() { return this.put("/notifications/mark-all-read"); }
  markNotificationRead(id: string) { return this.put("/notifications/" + id + "/read"); }
  getUnreadNotificationCount() { return this.get<{ count: number }>("/notifications/unread-count"); }

  // Attendance
  getAttendance(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<AttendanceRecord[]>("/attendance" + q);
  }
  clockIn(location: string) { return this.post<AttendanceRecord>("/attendance/clock-in", { location }); }
  clockOut() { return this.post<AttendanceRecord>("/attendance/clock-out"); }
  createAttendance(data: Partial<AttendanceRecord>) { return this.post<AttendanceRecord>("/attendance/manual", data); }
  updateAttendance(id: string, data: Partial<AttendanceRecord>) { return this.put<AttendanceRecord>("/attendance/" + id, data); }
  uploadAttendanceProof(id: string, formData: FormData) { return this.post<AttendanceRecord>("/attendance/" + id + "/proof", formData); }
  importAttendance(formData: FormData) { return this.post<{ imported: number }>("/attendance/import", formData); }
  getAttendanceSummary(userId: string, month?: string) {
    const q = month ? "?month=" + month : "";
    return this.get<AttendanceSummary>("/attendance/summary/" + userId + q);
  }
  getLeaveRequests(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<LeaveRequest[]>("/attendance/leave-requests" + q);
  }
  createLeaveRequest(data: Partial<LeaveRequest>) { return this.post<LeaveRequest>("/attendance/leave-requests", data); }
  approveLeaveRequest(id: string, status: string) { return this.put<LeaveRequest>("/attendance/leave-requests/" + id, { status }); }
  getLeaveBalance(userId?: string) { return this.get<LeaveBalance>("/attendance/leave-balance" + (userId ? "/" + userId : "")); }
  getLeaveBalances() { return this.get<LeaveBalance[]>("/attendance/leave-balances"); }

  // Finance
  getReimbursements(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<Reimbursement[]>("/finance/reimbursements" + q);
  }
  createReimbursement(data: Partial<Reimbursement>) { return this.post<Reimbursement>("/finance/reimbursements", data); }
  approveReimbursement(id: string, data: { status: string; paymentNote?: string; paymentDate?: string }) {
    return this.put<Reimbursement>("/finance/reimbursements/" + id, data);
  }
  getCashAdvances(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<CashAdvance[]>("/finance/cash-advances" + q);
  }
  createCashAdvance(data: Partial<CashAdvance>) { return this.post<CashAdvance>("/finance/cash-advances", data); }
  approveCashAdvance(id: string, status: string) { return this.put<CashAdvance>("/finance/cash-advances/" + id, { status }); }

  // Payslips
  getPayslips(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<PayslipData[]>("/payslips" + q);
  }
  getPayslip(id: string) { return this.get<PayslipData>("/payslips/" + id); }
  createPayslip(formData: FormData) { return this.post<PayslipData>("/payslips", formData); }
  updatePayslip(id: string, formData: FormData) {
    return this.request<PayslipData>("/payslips/" + id, { method: "PUT", body: formData });
  }
  deletePayslip(id: string) { return this.delete("/payslips/" + id); }

  // Notes
  getDailyNotes(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<DailyNote[]>("/notes/daily" + q);
  }
  createDailyNote(data: { date: string; content: string }) { return this.post<DailyNote>("/notes/daily", data); }
  updateDailyNote(id: string, content: string) { return this.put<DailyNote>("/notes/daily/" + id, { content }); }
  deleteDailyNote(id: string) { return this.delete("/notes/daily/" + id); }
  getAdminNotes(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<AdminNote[]>("/notes/admin" + q);
  }
  createAdminNote(data: { toEmployeeId: string; content: string; priority: string }) { return this.post<AdminNote>("/notes/admin", data); }
  deleteAdminNote(id: string) { return this.delete("/notes/admin/" + id); }
  getBossNotes() { return this.get<BossNote[]>("/notes/boss"); }
  getBossNote(employeeId: string) { return this.get<BossNote>("/notes/boss/" + employeeId); }
  upsertBossNote(employeeId: string, content: string) { return this.put<BossNote>("/notes/boss/" + employeeId, { content }); }

  // Avatar
  uploadAvatar(formData: FormData) { return this.post<{ avatar: string }>("/users/avatar", formData); }

  // Vault
  getCompanyLinks() { return this.get<CompanyLink[]>("/vault/links"); }
  createCompanyLink(data: Partial<CompanyLink>) { return this.post<CompanyLink>("/vault/links", data); }
  updateCompanyLink(id: string, data: Partial<CompanyLink>) { return this.put<CompanyLink>("/vault/links/" + id, data); }
  deleteCompanyLink(id: string) { return this.delete("/vault/links/" + id); }
  getCredentials() { return this.get<PersonalCredential[]>("/vault/credentials"); }
  createCredential(data: Partial<PersonalCredential>) { return this.post<PersonalCredential>("/vault/credentials", data); }
  updateCredential(id: string, data: Partial<PersonalCredential>) { return this.put<PersonalCredential>("/vault/credentials/" + id, data); }
  deleteCredential(id: string) { return this.delete("/vault/credentials/" + id); }

  // Teams
  getTeams() { return this.get<TeamGroup[]>("/teams"); }
  getTeam(id: string) { return this.get<TeamGroup>("/teams/" + id); }
  createTeam(data: Partial<TeamGroup>) { return this.post<TeamGroup>("/teams", data); }
  updateTeam(id: string, data: Partial<TeamGroup>) { return this.put<TeamGroup>("/teams/" + id, data); }
  deleteTeam(id: string) { return this.delete("/teams/" + id); }

  // Contracts
  getContracts(userId: string) { return this.get<ContractHistory[]>("/contracts/user/" + userId); }
  createContract(data: Partial<ContractHistory>) { return this.post<ContractHistory>("/contracts", data); }
  updateContract(id: string, data: Partial<ContractHistory>) { return this.put<ContractHistory>("/contracts/" + id, data); }
  deleteContract(id: string) { return this.delete("/contracts/" + id); }

  // Activities
  getActivities(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<ActivityItem[]>("/activities" + q);
  }

  // Approvals
  getApprovals() { return this.get<ApprovalRequest[]>("/approvals"); }
  createApproval(formData: FormData) { return this.post<ApprovalRequest>("/approvals", formData); }
  respondApproval(id: string, action: "approved" | "rejected", reason?: string) {
    return this.put<ApprovalRequest>("/approvals/" + id + "/respond", { action, reason });
  }
  deleteApproval(id: string) { return this.delete("/approvals/" + id); }
}

export const api = new ApiClient();
export default api;

// Re-export types
export type {
  User, Task, TaskNote, TaskAttachment, TeamMessage, UserDocument, Notification,
  AttendanceRecord, LeaveRequest, LeaveBalance, Reimbursement, CashAdvance,
  PayslipData, ContractHistory, TeamGroup, DailyNote, AdminNote, BossNote,
  CompanyLink, PersonalCredential, ActivityItem, AttendanceSummary, ApprovalRequest,
  Role, TaskStatus, Priority, Gender, MaritalStatus, DocumentType,
  LeaveType, RequestStatus, AttendanceStatus,
} from "@/types";
