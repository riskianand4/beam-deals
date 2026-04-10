import { useState, useMemo } from "react";
import { useTasks } from "@/contexts/TaskContext";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday, isSameMonth, isSameDay } from "date-fns";
import { id as localeID } from "date-fns/locale";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-muted text-muted-foreground",
};

const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const CalendarPage = () => {
  const { tasks } = useTasks();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Adjust start day (Monday = 0)
  const startDayOfWeek = (getDay(monthStart) + 6) % 7;
  const paddingDays = Array.from({ length: startDayOfWeek }, (_, i) => i);

  const tasksForDate = (date: Date) => {
    return tasks.filter((t) => isSameDay(new Date(t.deadline), date) && t.status !== "completed");
  };

  const selectedTasks = selectedDate ? tasks.filter((t) => isSameDay(new Date(t.deadline), selectedDate)) : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        <CalendarDays className="w-4 h-4 text-primary" /> Kalender Tugas
      </h1>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-sm font-semibold text-foreground capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: localeID })}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-4">
        {/* Calendar Grid */}
        <div className="ms-card p-3">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {HARI.map((h) => (
              <div key={h} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-2">
                {h}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {paddingDays.map((i) => (
              <div key={`pad-${i}`} className="aspect-square" />
            ))}
            {daysInMonth.map((day) => {
              const dayTasks = tasksForDate(day);
              const today = isToday(day);
              const selected = selectedDate && isSameDay(day, selectedDate);
              return (
                <motion.button
                  key={day.toISOString()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all text-sm relative ${
                    selected
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                      : today
                      ? "bg-primary/10  font-bold"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="text-sm">{format(day, "d")}</span>
                  {dayTasks.length > 0 && (
                    <div className="flex gap-0.5">
                      {dayTasks.slice(0, 3).map((t) => (
                        <div key={t.id} className={`w-1.5 h-1.5 rounded-full ${
                          t.priority === "high" ? "bg-destructive" : t.priority === "medium" ? "bg-warning" : "bg-muted-foreground"
                        } ${selected ? "opacity-80" : ""}`} />
                      ))}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Tasks */}
        <div className="ms-card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-foreground">
            {selectedDate
              ? format(selectedDate, "EEEE, d MMMM yyyy", { locale: localeID })
              : "Pilih tanggal untuk melihat tugas"}
          </h3>
          <AnimatePresence mode="wait">
            {selectedDate && (
              <motion.div
                key={selectedDate.toISOString()}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-2"
              >
                {selectedTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Tidak ada tugas pada tanggal ini</p>
                ) : (
                  selectedTasks.map((task) => (
                    <div key={task.id} className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className={`text-[10px] ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority === "high" ? "Tinggi" : task.priority === "medium" ? "Sedang" : "Rendah"}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {task.status === "todo" ? "Tugas" : "Selesai"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default CalendarPage;
