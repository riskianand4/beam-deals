import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import type { Notification } from "@/types";
import { Bell, AlertTriangle, CheckCircle2, Info, MessageCircleCodeIcon, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";

const ICON_MAP: Record<string, any> = {
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
  message: MessageCircleCodeIcon,
  deadline: Clock,
};

const COLOR_MAP: Record<string, string> = {
  warning: "text-warning",
  success: "text-success",
  info: "text-muted",
  message: "text-muted",
  deadline: "text-destructive",
};

const CATEGORY_ROUTE_MAP: Record<string, string> = {
  task: "/tasks",
  payslip: "/payslip",
  announcement: "/notes",
  message: "/messages",
  finance: "/finance",
  explorer: "/explorer",
  partner: "/partner",
  approval: "/approval",
  attendance: "/attendance",
  team: "/team",
  work_report: "/",
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  useEffect(() => {
    if (api.getToken()) {
      api.getNotifications().then(setNotifs).catch(() => {});
    }
  }, []);

  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    api.markAllNotificationsRead().catch(() => {});
  };

  const deleteNotif = async (id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
    try { await api.deleteNotification(id); } catch { }
  };

  const clearAll = async () => {
    setNotifs([]);
    setConfirmClearAll(false);
    try { await api.clearAllNotifications(); } catch { }
  };

  const handleClick = (n: Notification) => {
    if (!n.read) {
      api.markNotificationRead(n.id).catch(() => {});
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    const route = n.category ? CATEGORY_ROUTE_MAP[n.category] : null;
    if (route) navigate(route);
  };

  const sorted = [...notifs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const unreadCount = sorted.filter((n) => !n.read).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-primary" /> Notifikasi
          {unreadCount > 0 && <span className="text-[10px] bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5">{unreadCount} belum dibaca</span>}
        </h1>
        <div className="flex gap-1.5">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={markAllRead}>Tandai semua dibaca</Button>
          )}
          {sorted.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="w-7 h-7 text-destructive" onClick={() => setConfirmClearAll(true)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hapus semua</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Bell} title="Tidak ada notifikasi" description="Semua notifikasi sudah dibaca atau dihapus." />
      ) : (
        <div className="space-y-1.5">
          {sorted.map((n, i) => {
            const Icon = ICON_MAP[n.type] || Info;
            const color = COLOR_MAP[n.type] || "text-primary";
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`ms-card p-3 flex gap-3 group cursor-pointer ${!n.read ? "border-primary/20 bg-accent/20" : ""}`}
                onClick={() => handleClick(n)}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.timestamp), { addSuffix: true, locale: localeID })}</p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="w-6 h-6 opacity-0 group-hover:opacity-100 text-destructive shrink-0" onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Hapus</TooltipContent>
                </Tooltip>
              </motion.div>
            );
          })}
        </div>
      )}

      <ConfirmDialog open={confirmClearAll} onOpenChange={setConfirmClearAll} title="Hapus semua notifikasi?" description="Semua notifikasi akan dihapus permanen." variant="destructive" confirmText="Hapus Semua" onConfirm={clearAll} />
    </motion.div>
  );
};

export default Notifications;
