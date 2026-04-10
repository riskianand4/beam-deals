import { useMemo, useState, useEffect } from "react";
import { useTasks } from "@/contexts/TaskContext";
import { useMessages } from "@/contexts/MessageContext";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import type { Reimbursement, CashAdvance, LeaveRequest } from "@/types";

export interface AdminBadges {
  finance: number;
  attendance: number;
  tasks: number;
  messages: number;
  total: number;
  perEmployee: Record<string, {
    finance: number;
    attendance: number;
    tasks: number;
    messages: number;
    total: number;
  }>;
}

export function useAdminBadges(): AdminBadges {
  const { user, isAdmin, users } = useAuth();
  const { tasks } = useTasks();
  const { messages } = useMessages();
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [cashAdvances, setCashAdvances] = useState<CashAdvance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    api.getReimbursements().then(setReimbursements).catch(() => {});
    api.getCashAdvances().then(setCashAdvances).catch(() => {});
    api.getLeaveRequests().then(setLeaveRequests).catch(() => {});
  }, [isAdmin]);

  const employees = users.filter((u) => u.role === "employee");

  return useMemo(() => {
    const empty: AdminBadges = {
      finance: 0, attendance: 0, tasks: 0, messages: 0, total: 0,
      perEmployee: {},
    };
    if (!isAdmin || !user) return empty;

    const pendingReimb = reimbursements.filter((r) => r.status === "pending");
    const pendingCash = cashAdvances.filter((c) => c.status === "pending");
    const pendingLeave = leaveRequests.filter((l) => l.status === "pending");
    const reviewTasks = tasks.filter((t) => t.status === "todo");
    const unreadMsgs = messages.filter(
      (m) => m.toUserId === user.id && m.status === "pending"
    );

    const finance = pendingReimb.length + pendingCash.length;
    const attendance = pendingLeave.length;
    const tasksCount = reviewTasks.length;
    const messagesCount = unreadMsgs.length;

    const perEmployee: AdminBadges["perEmployee"] = {};
    for (const emp of employees) {
      const empFinance =
        pendingReimb.filter((r) => r.userId === emp.id).length +
        pendingCash.filter((c) => c.userId === emp.id).length;
      const empAttendance = pendingLeave.filter((l) => l.userId === emp.id).length;
      const empTasks = reviewTasks.filter((t) => t.assigneeId === emp.id).length;
      const empMessages = messages.filter(
        (m) => m.fromUserId === emp.id && m.toUserId === user.id && m.status === "pending"
      ).length;
      const empTotal = empFinance + empAttendance + empTasks + empMessages;
      if (empTotal > 0) {
        perEmployee[emp.id] = { finance: empFinance, attendance: empAttendance, tasks: empTasks, messages: empMessages, total: empTotal };
      }
    }

    return {
      finance, attendance, tasks: tasksCount, messages: messagesCount,
      total: finance + attendance + tasksCount + messagesCount,
      perEmployee,
    };
  }, [isAdmin, user, tasks, messages, employees, reimbursements, cashAdvances, leaveRequests]);
}