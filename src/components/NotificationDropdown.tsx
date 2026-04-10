import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import type { Notification } from "@/types";
import { Bell, AlertTriangle, CheckCircle2, Info, MessageCircleCodeIcon, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

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
  info: "text-primary",
  message: "text-primary",
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

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [serverNotifs, setServerNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifs = () => {
    if (api.getToken()) {
      api.getNotifications().then(setServerNotifs).catch(() => {});
    }
  };

  useEffect(() => { fetchNotifs(); }, []);

  useEffect(() => {
    if (open) fetchNotifs();
  }, [open]);

  const displayNotifs = useMemo(() => {
    return serverNotifs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [serverNotifs]);

  const unreadCount = displayNotifs.filter((n) => !n.read).length;

  const markAllRead = async () => {
    setServerNotifs(prev => prev.map(n => ({ ...n, read: true })));
    api.markAllNotificationsRead().catch(() => {});
  };

  const handleNotifClick = (n: Notification) => {
    // Mark as read
    if (!n.read) {
      api.markNotificationRead(n.id).catch(() => {});
      setServerNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    setOpen(false);

    // Navigate based on category
    const route = n.category ? CATEGORY_ROUTE_MAP[n.category] : null;
    if (route) {
      navigate(route);
    } else {
      navigate("/notifications");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted" aria-label="Buka notifikasi">
          <Bell className="w-4.5 h-4.5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center">{unreadCount}</motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Notifikasi</h3>
          {unreadCount > 0 && (<Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>Tandai semua dibaca</Button>)}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {displayNotifs.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">Tidak ada notifikasi</p>
            </div>
          ) : displayNotifs.map((n) => {
            const Icon = ICON_MAP[n.type] || Info;
            const color = COLOR_MAP[n.type] || "text-primary";
            return (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${!n.read ? "bg-accent/30" : ""}`}
                onClick={() => handleNotifClick(n)}
              >
                <div className="flex gap-3">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.timestamp), { addSuffix: true, locale: localeID })}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-border px-4 py-2">
          <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={() => { setOpen(false); navigate("/notifications"); }}>
            Lihat semua notifikasi
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationDropdown;
