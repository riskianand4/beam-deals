import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/contexts/TaskContext";
import { useMessages } from "@/contexts/MessageContext";
import { useAdminBadges } from "@/hooks/useAdminBadges";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, MessageCircleCodeIcon, Zap, Receipt, Clock, FileCheck } from "lucide-react";
import { isPast, isToday } from "date-fns";

const DashboardSummary = () => {
  const { user, isAdmin } = useAuth();
  const { tasks } = useTasks();
  const { getUnreadCount, getPendingRequestCount } = useMessages();
  const adminBadges = useAdminBadges();

  const alerts: { icon: typeof AlertTriangle; text: string; color: string }[] = [];

  if (isAdmin) {
    // Admin: oversight summary, NOT personal task alerts
    if (adminBadges.finance > 0) {
      alerts.push({
        icon: Receipt,
        text: `${adminBadges.finance} pengajuan keuangan menunggu persetujuan`,
        color: "text-warning bg-warning/10",
      });
    }
    if (adminBadges.tasks > 0) {
      alerts.push({
        icon: FileCheck,
        text: `${adminBadges.tasks} tugas perlu ditinjau`,
        color: "text-orange-600 bg-orange-500/10",
      });
    }
    if (adminBadges.messages > 0) {
      alerts.push({
        icon: MessageCircleCodeIcon,
        text: `${adminBadges.messages} pesan belum dibaca`,
        color: "text-primary bg-primary/10",
      });
    }
    if (alerts.length === 0) {
      alerts.push({
        icon: CheckCircle2,
        text: "Semua berjalan lancar! Tidak ada yang memerlukan perhatian.",
        color: "text-success bg-success/10",
      });
    }
  } else {
    // Employee: personal task alerts
    const myTasks = tasks;
    const overdue = myTasks.filter((t) => isPast(new Date(t.deadline)) && t.status !== "completed");
    const dueToday = myTasks.filter((t) => isToday(new Date(t.deadline)) && t.status !== "completed");
    const recentlyCompleted = myTasks.filter((t) => t.status === "completed").slice(0, 3);
    const unreadMessages = user ? getUnreadCount(user.id) + getPendingRequestCount(user.id) : 0;

    if (overdue.length > 0) {
      alerts.push({
        icon: AlertTriangle,
        text: `Anda punya ${overdue.length} tugas terlambat, segera selesaikan!`,
        color: "text-destructive bg-destructive/10",
      });
    }
    if (dueToday.length > 0) {
      alerts.push({
        icon: Zap,
        text: `${dueToday.length} tugas jatuh tempo hari ini`,
        color: "text-warning bg-warning/10",
      });
    }
    if (unreadMessages > 0) {
      alerts.push({
        icon: MessageCircleCodeIcon,
        text: `${unreadMessages} pesan belum dibaca`,
        color: "bg-primary",
      });
    }
    if (recentlyCompleted.length > 0 && alerts.length === 0) {
      alerts.push({
        icon: CheckCircle2,
        text: "Semua berjalan lancar! Tidak ada tugas mendesak.",
        color: "text-success bg-success/10",
      });
    }
  }

  if (alerts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="ms-card p-4 space-y-2"
    >
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rangkuman Hari Ini</h2>
      {alerts.map((alert, i) => {
        const Icon = alert.icon;
        return (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${alert.color}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <p className="text-sm text-foreground">{alert.text}</p>
          </div>
        );
      })}
    </motion.div>
  );
};

export default DashboardSummary;
