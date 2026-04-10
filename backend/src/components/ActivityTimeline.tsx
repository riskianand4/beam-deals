import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import type { ActivityItem } from "@/types";
import { CheckCircle2, PlusCircle, UserPlus, MessageCircleCodeIcon, ArrowRightLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const ICON_MAP: Record<string, typeof CheckCircle2> = {
  task_completed: CheckCircle2,
  task_created: PlusCircle,
  task_assigned: UserPlus,
  note_added: MessageCircleCodeIcon,
  status_changed: ArrowRightLeft,
};

const COLOR_MAP: Record<string, string> = {
  task_completed: "text-success bg-success/10",
  task_created: "text-primary-foreground bg-primary",
  task_assigned: "text-violet-600 bg-violet-800/20",
  note_added: "text-amber-600 bg-amber-800/20",
  status_changed: "text-cyan-600 bg-cyan-800/20",
};

const TYPE_LABEL: Record<string, string> = {
  task_completed: "Selesai",
  task_created: "Dibuat",
  task_assigned: "Ditugaskan",
  note_added: "Catatan",
  status_changed: "Status",
};

const ActivityTimeline = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const { users } = useAuth();

  useEffect(() => {
    api.getActivities({ limit: "10" }).then(setActivities).catch(() => {});
  }, []);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground border-b border-border">
            <th className="text-left py-2 px-2 font-medium sm:w-[440px]">Waktu</th>
            <th className="text-left py-2 px-2 font-medium sm:w-[400px] ">Tipe</th>
            <th className="text-left py-2 px-2 font-medium">Pesan</th>
          </tr>
        </thead>
        <tbody>
          {activities.slice(0, 10).map((activity, i) => {
            const Icon = ICON_MAP[activity.type] || PlusCircle;
            const colorClass = COLOR_MAP[activity.type] || " bg-primary/10";
            const typeLabel = TYPE_LABEL[activity.type] || activity.type;

            return (
              <motion.tr
                key={activity.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="border-b border-border/50 hover:bg-muted/30"
              >
                <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: localeID })}
                </td>
                <td className="py-2 px-2">
                  <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md ${colorClass}`}>
                    <Icon className="w-3 h-3" />
                    {typeLabel}
                  </span>
                </td>
                <td className="py-2 px-2 text-foreground">{activity.message}</td>
              </motion.tr>
            );
          })}
          {activities.length === 0 && (
            <tr>
              <td colSpan={3} className="text-center py-4 text-muted-foreground">Belum ada aktivitas</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ActivityTimeline;
