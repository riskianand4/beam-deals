import { useState, useEffect } from "react";
import { TableSkeleton } from "@/components/PageSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import type { ActivityItem } from "@/types";
import { motion } from "framer-motion";
import { ScrollText, CheckCircle2, PlusCircle, UserPlus, MessageCircleCodeIcon, ArrowRightLeft, Filter } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { formatDistanceToNow } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ICON_MAP: Record<string, any> = {
  task_completed: CheckCircle2, task_created: PlusCircle, task_assigned: UserPlus, note_added: MessageCircleCodeIcon, status_changed: ArrowRightLeft,
};
const COLOR_MAP: Record<string, string> = {
  task_completed: "text-success bg-success/10", task_created: "text-primary bg-primary/10", task_assigned: "text-violet-600 bg-violet-100", note_added: "text-amber-600 bg-amber-100", status_changed: "text-cyan-600 bg-cyan-100",
};
const TYPE_LABELS: Record<string, string> = {
  task_completed: "Tugas Selesai", task_created: "Tugas Dibuat", task_assigned: "Tugas Ditugaskan", note_added: "Catatan Ditambah", status_changed: "Status Berubah",
};

const ActivityLog = () => {
  const { users } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  useEffect(() => {
    api.getActivities({ limit: "50" }).then(setActivities).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filteredActivities = activities.filter((a) => {
    const matchType = typeFilter === "all" || a.type === typeFilter;
    const matchUser = userFilter === "all" || a.userId === userFilter;
    return matchType && matchUser;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><ScrollText className="w-4 h-4 text-primary" /> Log Aktivitas</h1>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-full sm:w-48 h-9 text-sm"><Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Tipe Aktivitas" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Tipe</SelectItem><SelectItem value="task_completed">Tugas Selesai</SelectItem><SelectItem value="task_created">Tugas Dibuat</SelectItem><SelectItem value="task_assigned">Tugas Ditugaskan</SelectItem><SelectItem value="note_added">Catatan Ditambah</SelectItem><SelectItem value="status_changed">Status Berubah</SelectItem></SelectContent></Select>
        <Select value={userFilter} onValueChange={setUserFilter}><SelectTrigger className="w-full sm:w-48 h-9 text-sm"><SelectValue placeholder="Semua Pengguna" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Pengguna</SelectItem>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="ms-card p-5">
        {loading ? <TableSkeleton rows={6} cols={3} /> : filteredActivities.length === 0 ? <EmptyState icon={ScrollText} title="Tidak ada aktivitas" description="Belum ada aktivitas yang tercatat. Aktivitas seperti membuat tugas, menyelesaikan tugas, dan perubahan status akan muncul di sini." /> : (
          <div className="space-y-1">
            {filteredActivities.map((activity, i) => {
              const Icon = ICON_MAP[activity.type] || PlusCircle;
              const colorClass = COLOR_MAP[activity.type] || "text-primary bg-primary/10";
              const actUser = users.find((u) => u.id === activity.userId);
              const initials = actUser?.name.split(" ").map((n) => n[0]).join("") ?? "?";
              return (
                <motion.div key={activity.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-start gap-4 py-4 border-b border-border last:border-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}><Icon className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">{activity.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Avatar className="w-5 h-5"><AvatarFallback className="bg-primary/10 text-primary text-[8px] font-semibold">{initials}</AvatarFallback></Avatar>
                      <span className="text-[11px] text-muted-foreground">{actUser?.name} • {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: localeID })}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-1">{TYPE_LABELS[activity.type] || activity.type}</span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ActivityLog;