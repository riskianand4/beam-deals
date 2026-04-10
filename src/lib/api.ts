import type {
  ActivityItem,
  AdminNote,
  Announcement,
  ApprovalRequest,
  AttendanceRecord,
  AttendanceSummary,
  BossNote,
  CashAdvance,
  ChatGroupData,
  CompanyLink,
  ContractHistory,
  DailyNote,
  ExcludedEmployee,
  ExplorerFile,
  ExplorerFolder,
  LeaveBalance,
  LeaveRequest,
  Notification,
  NotificationCategory,
  PartnerContract,
  PartnerData,
  PartnerProject,
  PartnerReport,
  PayslipData,
  PersonalCredential,
  Reimbursement,
  Task,
  TaskAttachment,
  TaskNote,
  TeamGroup,
  TeamMessage,
  User,
  UserDocument,
  WarningLetter,
  WorkReport,
} from "@/types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export function getUploadUrl(filePath?: string | null): string {
  if (!filePath) return "";
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }
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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
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
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  // Auth
  async login(email: string, password: string) {
    const result = await this.post<{ user: User; token: string }>(
      "/auth/login",
      { email, password },
    );
    this.setToken(result.token);
    return result;
  }

  async register(data: Partial<User> & { password: string }) {
    const result = await this.post<{ user: User; token: string }>(
      "/auth/register",
      data,
    );
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
    return this.put<{ message: string }>("/auth/change-password", {
      currentPassword,
      newPassword,
    });
  }

  logout() {
    this.setToken(null);
  }

  // Users
  getUsers(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<User[]>("/users" + q);
  }

  getUser(id: string) {
    return this.get<User>("/users/" + id);
  }
  createUser(data: Partial<User> & { password: string }) {
    return this.post<User>("/users", data);
  }
  updateUser(id: string, data: Partial<User>) {
    return this.put<User>("/users/" + id, data);
  }
  updateProfile(data: Partial<User>) {
    return this.put<User>("/users/profile", data);
  }
  deleteUser(id: string) {
    return this.delete("/users/" + id);
  }
  // (uploadAvatarForUser moved to Avatar section below)

  // Menu Settings
  getMenuSettings() {
    return this.get<Record<string, boolean>>("/settings/menu");
  }
  updateMenuSettings(settings: Record<string, boolean>) {
    return this.put<Record<string, boolean>>("/settings/menu", settings);
  }
  getPositionAccess() {
    return this.get<Record<string, Record<string, boolean>>>(
      "/settings/position-access",
    );
  }
  updatePositionAccess(position: string, menus: Record<string, boolean>) {
    return this.put("/settings/position-access", { position, menus });
  }

  // Dynamic Positions
  getPositions() {
    return this.get<
      {
        id: string;
        position: string;
        description: string;
        menus: Record<string, boolean>;
      }[]
    >("/settings/positions");
  }
  createPosition(position: string, description: string) {
    return this.post<
      {
        id: string;
        position: string;
        description: string;
        menus: Record<string, boolean>;
      }
    >("/settings/positions", { position, description });
  }
  deletePosition(id: string) {
    return this.delete("/settings/positions/" + id);
  }

  // Tasks
  getTasks(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<Task[]>("/tasks" + q);
  }
  getTask(id: string) {
    return this.get<Task>("/tasks/" + id);
  }
  createTask(data: Partial<Task>) {
    return this.post<Task>("/tasks", data);
  }
  updateTask(id: string, data: Partial<Task>) {
    return this.put<Task>("/tasks/" + id, data);
  }
  updateTaskStatus(id: string, status: string) {
    return this.put<Task>("/tasks/" + id + "/status", { status });
  }
  addTaskNote(id: string, formData: FormData) {
    return this.post<Task>("/tasks/" + id + "/notes", formData);
  }
  editTaskNote(taskId: string, noteId: string, data: { text?: string }) {
    return this.put<Task>("/tasks/" + taskId + "/notes/" + noteId, data);
  }
  deleteTaskNote(taskId: string, noteId: string) {
    return this.delete<Task>("/tasks/" + taskId + "/notes/" + noteId);
  }
  deleteTask(id: string) {
    return this.delete("/tasks/" + id);
  }

  // Messages
  getMessages(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<TeamMessage[]>("/messages" + q);
  }
  getThread(threadId: string) {
    return this.get<TeamMessage[]>("/messages/thread/" + threadId);
  }
  sendMessage(data: Partial<TeamMessage> | FormData) {
    return this.post<TeamMessage>("/messages", data);
  }
  updateMessageStatus(id: string, status: string) {
    return this.put<TeamMessage>("/messages/" + id + "/status", { status });
  }
  markMessageRead(id: string) {
    return this.put<TeamMessage>("/messages/" + id + "/read");
  }
  approveMessage(id: string, action: "approved" | "rejected", reason?: string) {
    return this.put<TeamMessage>("/messages/" + id + "/approve", {
      action,
      reason,
    });
  }
  getUnreadMessageCount() {
    return this.get<{ count: number }>("/messages/unread-count");
  }
  getPendingRequestCount() {
    return this.get<{ count: number }>("/messages/pending-requests");
  }
  deleteMessage(id: string) {
    return this.delete("/messages/" + id);
  }
  createChatGroup(name: string, memberIds: string[]) {
    return this.post<ChatGroupData>("/messages/groups", { name, memberIds });
  }
  getChatGroups() {
    return this.get<ChatGroupData[]>("/messages/groups");
  }
  getChatGroupMessages(groupId: string) {
    return this.get<TeamMessage[]>("/messages/groups/" + groupId + "/messages");
  }
  deleteChatGroup(groupId: string) {
    return this.delete("/messages/groups/" + groupId);
  }
  leaveChatGroup(groupId: string) {
    return this.put("/messages/groups/" + groupId + "/leave");
  }
  updateGroupAvatar(groupId: string, data: { avatar: string } | FormData) {
    return this.put<ChatGroupData>("/messages/groups/" + groupId + "/avatar", data);
  }
  deleteThread(otherId: string) {
    return this.delete("/messages/thread/" + otherId);
  }
  pinMessage(id: string) {
    return this.put<TeamMessage>("/messages/" + id + "/pin");
  }
  getApprovers() {
    return this.get<User[]>("/users/approvers");
  }

  // Documents
  getAllDocuments() {
    return this.get<UserDocument[]>("/documents");
  }
  getUserDocuments(userId: string) {
    return this.get<UserDocument[]>("/documents/user/" + userId);
  }
  uploadDocument(formData: FormData) {
    return this.post<UserDocument>("/documents", formData);
  }
  deleteDocument(id: string) {
    return this.delete("/documents/" + id);
  }

  // Notifications
  getNotifications() {
    return this.get<Notification[]>("/notifications");
  }
  markAllNotificationsRead() {
    return this.put("/notifications/mark-all-read");
  }
  markNotificationRead(id: string) {
    return this.put("/notifications/" + id + "/read");
  }
  markNotificationCategoryRead(category: NotificationCategory) {
    return this.put("/notifications/mark-category-read", { category });
  }
  getNotificationBadgeCounts() {
    return this.get<Record<string, number>>("/notifications/badge-counts");
  }
  getUnreadNotificationCount() {
    return this.get<{ count: number }>("/notifications/unread-count");
  }
  deleteNotification(id: string) {
    return this.delete("/notifications/" + id);
  }
  clearAllNotifications() {
    return this.delete("/notifications/clear-all");
  }

  // Work Reports
  getWorkReports(userId: string) {
    return this.get<WorkReport[]>("/work-reports/" + userId);
  }
  getRecentWorkReports() {
    return this.get<WorkReport[]>("/work-reports/recent");
  }
  createWorkReport(formData: FormData) {
    return this.post<WorkReport>("/work-reports", formData);
  }
  deleteWorkReport(id: string) {
    return this.delete("/work-reports/" + id);
  }

  // Attendance
  getAttendance(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<AttendanceRecord[]>("/attendance" + q);
  }
  clockIn(location: string) {
    return this.post<AttendanceRecord>("/attendance/clock-in", { location });
  }
  clockOut() {
    return this.post<AttendanceRecord>("/attendance/clock-out");
  }
  createAttendance(data: Partial<AttendanceRecord>) {
    return this.post<AttendanceRecord>("/attendance/manual", data);
  }
  updateAttendance(id: string, data: Partial<AttendanceRecord>) {
    return this.put<AttendanceRecord>("/attendance/" + id, data);
  }
  uploadAttendanceProof(id: string, formData: FormData) {
    return this.post<AttendanceRecord>(
      "/attendance/" + id + "/proof",
      formData,
    );
  }
  deleteAttendance(id: string) {
    return this.delete("/attendance/" + id);
  }
  importAttendance(formData: FormData) {
    return this.post<{ imported: number }>("/attendance/import", formData);
  }
  getAttendanceSummary(userId: string, month?: string) {
    const q = month ? "?month=" + month : "";
    return this.get<AttendanceSummary>("/attendance/summary/" + userId + q);
  }
  getLeaveRequests(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<LeaveRequest[]>("/attendance/leave-requests" + q);
  }
  createLeaveRequest(data: Partial<LeaveRequest>) {
    return this.post<LeaveRequest>("/attendance/leave-requests", data);
  }
  approveLeaveRequest(id: string, status: string) {
    return this.put<LeaveRequest>("/attendance/leave-requests/" + id, {
      status,
    });
  }
  getLeaveBalance(userId?: string) {
    return this.get<LeaveBalance>(
      "/attendance/leave-balance" + (userId ? "/" + userId : ""),
    );
  }
  getLeaveBalances() {
    return this.get<LeaveBalance[]>("/attendance/leave-balances");
  }
  getJustificationSuggestions() {
    return this.get<string[]>("/attendance/justifications");
  }
  getAttendanceStatuses() {
    return this.get<Array<{ id: string; name: string; label: string; isDefault: boolean }>>("/attendance/statuses");
  }
  createAttendanceStatus(data: { name: string; label: string }) {
    return this.post<{ id: string; name: string; label: string; isDefault: boolean }>("/attendance/statuses", data);
  }
  deleteAttendanceStatus(id: string) {
    return this.delete("/attendance/statuses/" + id);
  }
  async exportAttendancePDF(data: { records: any[]; date: string }) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/attendance/export-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to export PDF");
    return res.blob();
  }

  // Finance
  getReimbursements(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<Reimbursement[]>("/finance/reimbursements" + q);
  }
  createReimbursement(data: Partial<Reimbursement>) {
    return this.post<Reimbursement>("/finance/reimbursements", data);
  }
  approveReimbursement(
    id: string,
    data: { status: string; paymentNote?: string; paymentDate?: string },
  ) {
    return this.put<Reimbursement>("/finance/reimbursements/" + id, data);
  }
  respondReimbursement(id: string, action: string, reason?: string, formData?: FormData) {
    if (formData) {
      formData.append("action", action);
      if (reason) formData.append("reason", reason);
      return this.request<Reimbursement>("/finance/reimbursements/" + id + "/respond", { method: "PUT", body: formData });
    }
    return this.put<Reimbursement>("/finance/reimbursements/" + id + "/respond", { action, reason });
  }
  addReimbursementComment(id: string, data: { text: string } | FormData) {
    if (data instanceof FormData) {
      return this.request<Reimbursement>("/finance/reimbursements/" + id + "/comments", { method: "POST", body: data });
    }
    return this.post<Reimbursement>("/finance/reimbursements/" + id + "/comments", data);
  }
  getCashAdvances(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<CashAdvance[]>("/finance/cash-advances" + q);
  }
  createCashAdvance(data: Partial<CashAdvance>) {
    return this.post<CashAdvance>("/finance/cash-advances", data);
  }
  approveCashAdvance(id: string, status: string) {
    return this.put<CashAdvance>("/finance/cash-advances/" + id, { status });
  }
  updateReimbursementStatus(id: string, status: string) {
    return this.put<Reimbursement>("/finance/reimbursements/" + id, { status });
  }
  deleteReimbursement(id: string) {
    return this.delete("/finance/reimbursements/" + id);
  }

  // Payslips
  getPayslips(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<PayslipData[]>("/payslips" + q);
  }
  getPayslip(id: string) {
    return this.get<PayslipData>("/payslips/" + id);
  }
  createPayslip(formData: FormData) {
    return this.post<PayslipData>("/payslips", formData);
  }
  bulkCreatePayslips(formData: FormData) {
    return this.post<PayslipData[]>("/payslips/bulk", formData);
  }
  updatePayslip(id: string, formData: FormData) {
    return this.request<PayslipData>("/payslips/" + id, {
      method: "PUT",
      body: formData,
    });
  }
  deletePayslip(id: string) {
    return this.delete("/payslips/" + id);
  }

  // Notes
  getDailyNotes(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<DailyNote[]>("/notes/daily" + q);
  }
  createDailyNote(data: { date: string; content: string }) {
    return this.post<DailyNote>("/notes/daily", data);
  }
  updateDailyNote(id: string, content: string) {
    return this.put<DailyNote>("/notes/daily/" + id, { content });
  }
  deleteDailyNote(id: string) {
    return this.delete("/notes/daily/" + id);
  }
  getAdminNotes(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<AdminNote[]>("/notes/admin" + q);
  }
  createAdminNote(
    data: { toEmployeeId: string; content: string; priority: string },
  ) {
    return this.post<AdminNote>("/notes/admin", data);
  }
  deleteAdminNote(id: string) {
    return this.delete("/notes/admin/" + id);
  }
  getBossNotes() {
    return this.get<BossNote[]>("/notes/boss");
  }
  getBossNote(employeeId: string) {
    return this.get<BossNote>("/notes/boss/" + employeeId);
  }
  upsertBossNote(employeeId: string, content: string) {
    return this.put<BossNote>("/notes/boss/" + employeeId, { content });
  }

  // Avatar (Base64)
  uploadAvatar(data: { avatar: string }) {
    return this.post<{ avatar: string }>("/users/avatar", data);
  }
  uploadAvatarForUser(userId: string, data: { avatar: string }) {
    return this.post<{ avatar: string }>("/users/" + userId + "/avatar", data);
  }

  // Vault
  getCompanyLinks() {
    return this.get<CompanyLink[]>("/vault/links");
  }
  createCompanyLink(data: Partial<CompanyLink>) {
    return this.post<CompanyLink>("/vault/links", data);
  }
  updateCompanyLink(id: string, data: Partial<CompanyLink>) {
    return this.put<CompanyLink>("/vault/links/" + id, data);
  }
  deleteCompanyLink(id: string) {
    return this.delete("/vault/links/" + id);
  }
  getCredentials() {
    return this.get<PersonalCredential[]>("/vault/credentials");
  }
  createCredential(data: Partial<PersonalCredential>) {
    return this.post<PersonalCredential>("/vault/credentials", data);
  }
  updateCredential(id: string, data: Partial<PersonalCredential>) {
    return this.put<PersonalCredential>("/vault/credentials/" + id, data);
  }
  deleteCredential(id: string) {
    return this.delete("/vault/credentials/" + id);
  }

  // Teams
  getTeams() {
    return this.get<TeamGroup[]>("/teams");
  }
  getTeam(id: string) {
    return this.get<TeamGroup>("/teams/" + id);
  }
  createTeam(data: Partial<TeamGroup>) {
    return this.post<TeamGroup>("/teams", data);
  }
  updateTeam(id: string, data: Partial<TeamGroup>) {
    return this.put<TeamGroup>("/teams/" + id, data);
  }
  deleteTeam(id: string) {
    return this.delete("/teams/" + id);
  }

  // Contracts
  getContracts(userId: string) {
    return this.get<ContractHistory[]>("/contracts/user/" + userId);
  }
  createContract(data: Partial<ContractHistory>) {
    return this.post<ContractHistory>("/contracts", data);
  }
  updateContract(id: string, data: Partial<ContractHistory>) {
    return this.put<ContractHistory>("/contracts/" + id, data);
  }
  deleteContract(id: string) {
    return this.delete("/contracts/" + id);
  }

  // Activities
  getActivities(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<ActivityItem[]>("/activities" + q);
  }

  // Approvals
  getApprovals() {
    return this.get<ApprovalRequest[]>("/approvals");
  }
  createApproval(formData: FormData) {
    return this.post<ApprovalRequest>("/approvals", formData);
  }
  updateApprovalStatus(id: string, status: string) {
    return this.put<ApprovalRequest>("/approvals/" + id + "/status", {
      status,
    });
  }
  respondApproval(
    id: string,
    action: "approved" | "rejected",
    reason?: string,
    formData?: FormData,
  ) {
    if (formData) {
      formData.append("action", action);
      if (reason) formData.append("reason", reason);
      return this.request<ApprovalRequest>("/approvals/" + id + "/respond", {
        method: "PUT",
        body: formData,
      });
    }
    return this.put<ApprovalRequest>("/approvals/" + id + "/respond", {
      action,
      reason,
    });
  }
  deleteApproval(id: string) {
    return this.delete("/approvals/" + id);
  }
  addApprovalComment(id: string, data: { text: string } | FormData) {
    if (data instanceof FormData) {
      return this.request<ApprovalRequest>("/approvals/" + id + "/comments", { method: "POST", body: data });
    }
    return this.post<ApprovalRequest>("/approvals/" + id + "/comments", data);
  }
  editApprovalResponse(id: string, data: { reason?: string; status?: string } | FormData) {
    if (data instanceof FormData) {
      return this.request<ApprovalRequest>("/approvals/" + id + "/edit-response", {
        method: "PUT",
        body: data,
      });
    }
    return this.put<ApprovalRequest>("/approvals/" + id + "/edit-response", data);
  }
  resetApprovalResponse(id: string) {
    return this.put<ApprovalRequest>("/approvals/" + id + "/reset-response");
  }

  // Excluded Employees
  getExcludedEmployees() {
    return this.get<ExcludedEmployee[]>("/attendance/excluded");
  }
  addExcludedEmployee(
    data: { userId: string; userName: string; description: string },
  ) {
    return this.post<ExcludedEmployee>("/attendance/excluded", data);
  }
  removeExcludedEmployee(id: string) {
    return this.delete("/attendance/excluded/" + id);
  }

  // Holidays
  getHolidays() {
    return this.get<any[]>("/attendance/holidays");
  }
  createHoliday(data: { date: string; description: string }) {
    return this.post<any>("/attendance/holidays", data);
  }
  deleteHoliday(id: string) {
    return this.delete("/attendance/holidays/" + id);
  }

  // Absent salary
  getAbsentSalary(userId?: string) {
    const path = userId ? `/attendance/absent-salary/${userId}` : "/attendance/absent-salary";
    return this.get<{ days: number; dailyRate: number; total: number; since: string | null }>(path);
  }

  // Partners
  getPartners() {
    return this.get<PartnerData[]>("/partners");
  }
  getPartner(id: string) {
    return this.get<PartnerData>("/partners/" + id);
  }
  createPartner(data: Partial<PartnerData>) {
    return this.post<PartnerData>("/partners", data);
  }
  updatePartner(id: string, data: Partial<PartnerData>) {
    return this.put<PartnerData>("/partners/" + id, data);
  }
  deletePartner(id: string) {
    return this.delete("/partners/" + id);
  }

  // Partner Projects
  getPartnerProjects(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<PartnerProject[]>("/partners/projects/list" + q);
  }
  createPartnerProject(data: Partial<PartnerProject>) {
    return this.post<PartnerProject>("/partners/projects", data);
  }
  updatePartnerProject(id: string, data: Partial<PartnerProject>) {
    return this.put<PartnerProject>("/partners/projects/" + id, data);
  }
  deletePartnerProject(id: string) {
    return this.delete("/partners/projects/" + id);
  }

  // Partner Reports
  getPartnerReports(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<PartnerReport[]>("/partners/reports/list" + q);
  }
  createPartnerReport(data: Partial<PartnerReport>) {
    return this.post<PartnerReport>("/partners/reports", data);
  }
  deletePartnerReport(id: string) {
    return this.delete("/partners/reports/" + id);
  }

  // Partner Contracts
  getPartnerContracts(params?: Record<string, string>) {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.get<PartnerContract[]>("/partners/contracts/list" + q);
  }
  createPartnerContract(data: Partial<PartnerContract>) {
    return this.post<PartnerContract>("/partners/contracts", data);
  }
  updatePartnerContract(id: string, data: Partial<PartnerContract>) {
    return this.put<PartnerContract>("/partners/contracts/" + id, data);
  }
  deletePartnerContract(id: string) {
    return this.delete("/partners/contracts/" + id);
  }

  // Warning Letters (SP)
  getWarnings(userId: string) {
    return this.get<WarningLetter[]>("/warnings/" + userId);
  }
  getMyActiveWarnings() {
    return this.get<WarningLetter[]>("/warnings/me");
  }
  createWarning(data: Partial<WarningLetter>) {
    return this.post<WarningLetter>("/warnings", data);
  }
  deleteWarning(id: string) {
    return this.delete("/warnings/" + id);
  }

  // Announcements
  getAnnouncements() {
    return this.get<Announcement[]>("/announcements");
  }
  createAnnouncement(data: { title: string; content: string; expiresAt?: string; status?: string }) {
    return this.post<Announcement>("/announcements", data);
  }
  updateAnnouncement(id: string, data: { title?: string; content?: string; expiresAt?: string; status?: string }) {
    return this.put<Announcement>("/announcements/" + id, data);
  }
  deleteAnnouncement(id: string) {
    return this.delete("/announcements/" + id);
  }

  // Notification Channels
  getNotificationChannels() {
    return this.get<any>("/settings/notification-channels");
  }
  updateNotificationChannels(data: any) {
    return this.put<any>("/settings/notification-channels", data);
  }

  // WhatsApp
  getWhatsAppStatus() {
    return this.get<{ status: string; phone: string | null }>("/whatsapp/status");
  }
  getWhatsAppQR() {
    return this.get<{ qr: string | null; status: string }>("/whatsapp/qr");
  }
  whatsAppConnect() {
    return this.post<{ message: string; status: string }>("/whatsapp/connect");
  }
  whatsAppLogout() {
    return this.post<{ message: string }>("/whatsapp/logout");
  }

  // Explorer
  getExplorerContents(parentId?: string) {
    const q = parentId ? "?parentId=" + parentId : "";
    return this.get<{ folders: ExplorerFolder[]; files: ExplorerFile[]; breadcrumb: { id: string; name: string }[] }>("/explorer" + q);
  }
  createExplorerFolder(data: { name: string; parentId?: string | null; accessType?: string; accessIds?: string[]; ownerId?: string }) {
    return this.post<ExplorerFolder>("/explorer/folders", data);
  }
  updateExplorerFolder(id: string, data: Partial<ExplorerFolder>) {
    return this.put<ExplorerFolder>("/explorer/folders/" + id, data);
  }
  deleteExplorerFolder(id: string) {
    return this.delete("/explorer/folders/" + id);
  }
  uploadExplorerFile(formData: FormData) {
    return this.post<ExplorerFile>("/explorer/files", formData);
  }
  renameExplorerFile(id: string, name: string) {
    return this.put<ExplorerFile>("/explorer/files/" + id, { name });
  }
  deleteExplorerFile(id: string) {
    return this.delete("/explorer/files/" + id);
  }
  shareExplorerFolder(id: string, accessType: string, accessIds: string[], accessPermissions?: { userId: string; permission: "view" | "edit" }[]) {
    return this.post<ExplorerFolder>("/explorer/folders/" + id + "/share", { accessType, accessIds, accessPermissions });
  }
  linkExplorerFolderToPartner(folderId: string, partnerId: string) {
    return this.post<ExplorerFolder>("/explorer/folders/" + folderId + "/link-partner", { partnerId });
  }
  getExplorerPartnerFiles(partnerId: string) {
    return this.get<(ExplorerFile & { folderName?: string })[]>("/explorer/partner-files/" + partnerId);
  }
  moveExplorerItem(id: string, type: "folder" | "file", targetId: string | null) {
    return this.put("/explorer/move/" + id, { type, targetId });
  }
  copyExplorerFile(id: string, targetFolderId: string | null) {
    return this.post<ExplorerFile>("/explorer/copy/" + id, { targetFolderId });
  }
  toggleExplorerPin(type: "folder" | "file", id: string) {
    return this.put("/explorer/pin/" + type + "/" + id);
  }
  toggleExplorerLock(type: "folder" | "file", id: string) {
    return this.put("/explorer/lock/" + type + "/" + id);
  }
  async downloadExplorerZip(folderId: string) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/explorer/folders/${folderId}/zip`, {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) throw new Error("Failed to download ZIP");
    return res.blob();
  }
}

export const api = new ApiClient();
export default api;

// Re-export types
export type {
  ActivityItem,
  AdminNote,
  Announcement,
  ApprovalRequest,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
  BossNote,
  CashAdvance,
  CompanyLink,
  ContractHistory,
  DailyNote,
  DocumentType,
  ExcludedEmployee,
  ExplorerFile,
  ExplorerFolder,
  Gender,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  MaritalStatus,
  Notification,
  NotificationCategory,
  PartnerContract,
  PartnerData,
  PartnerProject,
  PartnerReport,
  PayslipData,
  PersonalCredential,
  Priority,
  Reimbursement,
  RequestStatus,
  Role,
  Task,
  TaskAttachment,
  TaskNote,
  TaskStatus,
  TeamGroup,
  TeamMessage,
  User,
  UserDocument,
  WarningLetter,
  WorkReport,
} from "@/types";
