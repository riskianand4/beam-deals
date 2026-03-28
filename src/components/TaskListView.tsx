import { Task, TaskStatus } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Flag, Calendar, MessageCircleCodeIcon } from "lucide-react";
import { formatDistanceToNow, isPast, isToday } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { motion } from "framer-motion";

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Akan Dikerjakan",
  "in-progress": "Sedang Dikerjakan",
  "needs-review": "Ditinjau",
  completed: "Selesai",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "bg-muted text-muted-foreground",
  "in-progress": "bg-primary",
  "needs-review": "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/10 text-warning",
  low: "bg-muted text-muted-foreground",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
};

interface Props {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  isAdmin: boolean;
}

const TaskListView = ({ tasks, onTaskClick, isAdmin }: Props) => {
  const { users } = useAuth();
  
  return (
    <div className="ms-card overflow-hidden border border-border bg-background rounded-lg shadow-sm">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-muted/50 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 font-medium w-[150px]">Tugas</th>
              <th className="px-4 py-3 font-medium w-[120px]">Status</th>
              <th className="px-4 py-3 font-medium w-[120px]">Prioritas</th>
              <th className="px-4 py-3 font-medium w-[120px]">Tenggat</th>
              <th className="px-4 py-3 font-medium text-right w-[100px]">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-sm text-muted-foreground text-center py-10">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="bg-muted p-3 rounded-full">
                      <MessageCircleCodeIcon className="w-5 h-5 text-muted-foreground opacity-50" />
                    </span>
                    <p>Tidak ada tugas yang sesuai filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              tasks.map((task, i) => {
                const assignee = users.find((u) => u.id === task.assigneeId);
                const deadlineDate = new Date(task.deadline);
                const overdue = isPast(deadlineDate) && task.status !== "completed";
                const dueToday = isToday(deadlineDate);

                return (
                  <motion.tr
                    key={task.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => onTaskClick(task)}
                    className="group hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    {/* Tugas */}
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        {isAdmin && assignee && (
                          <Avatar className="w-7 h-7 shrink-0 shadow-sm border border-border/50">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold uppercase">
                              {assignee.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span className="font-medium text-foreground truncate max-w-[250px] lg:max-w-[200px]  transition-colors">
                          {task.title}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 align-middle">
                      <Badge variant="secondary" className={`text-[10px] font-medium shadow-none border-0 ${STATUS_COLORS[task.status]}`}>
                        {STATUS_LABELS[task.status]}
                      </Badge>
                    </td>

                    {/* Prioritas */}
                    <td className="px-4 py-3 align-middle">
                      <Badge variant="secondary" className={`text-[10px] font-medium shadow-none border-0 ${PRIORITY_STYLES[task.priority]}`}>
                        <Flag className="w-3 h-3 mr-1.5" />
                        {PRIORITY_LABELS[task.priority]}
                      </Badge>
                    </td>

                    {/* Tenggat */}
                    <td className="px-4 py-3 align-middle">
                      <div className={`flex items-center gap-1.5 text-xs ${
                        overdue ? "text-destructive font-semibold" 
                        : dueToday ? "text-warning font-semibold" 
                        : "text-muted-foreground"
                      }`}>
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {formatDistanceToNow(deadlineDate, { addSuffix: true, locale: localeID })}
                        </span>
                      </div>
                    </td>

                    {/* Catatan */}
                    <td className="px-4 py-3 align-middle text-right">
                      <div className="flex items-center justify-end gap-1.5 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        <span>{task.notes?.length || 0}</span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskListView;