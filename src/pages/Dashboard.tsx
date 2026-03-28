import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/contexts/TaskContext";
import { StatsSkeleton, CardGridSkeleton } from "@/components/PageSkeleton";
import api from "@/lib/api";
import type { ActivityItem, DailyNote, AdminNote } from "@/types";
import { CheckCircle2, Clock, AlertTriangle, Plus, Shield, ArrowRight, TrendingUp, CalendarClock, ListChecks, BarChart3, StickyNote, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import StatsCard from "@/components/StatsCard";
import ActivityTimeline from "@/components/ActivityTimeline";
import DashboardSummary from "@/components/DashboardSummary";
import AdminDashboardSummary from "@/components/AdminDashboardSummary";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { formatDistanceToNow, isPast, isToday, isSameDay } from "date-fns";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";

const WEEKLY_PRODUCTIVITY = [
  { day: "Sen", completed: 0 }, { day: "Sel", completed: 0 }, { day: "Rab", completed: 0 },
  { day: "Kam", completed: 0 }, { day: "Jum", completed: 0 }, { day: "Sab", completed: 0 }, { day: "Min", completed: 0 },
];

const Dashboard = () => {
  const { user, isAdmin, users } = useAuth();
  const { tasks, updateTaskStatus, loading: tasksLoading } = useTasks();
  const navigate = useNavigate();
  const employees = users.filter((u) => u.role === "employee");

  // Notes state for employee dashboard
  const [dailyNotes, setDailyNotes] = useState<DailyNote[]>([]);
  const [adminNotes, setAdminNotes] = useState<AdminNote[]>([]);

  useEffect(() => {
    if (!isAdmin && user) {
      api.getDailyNotes({ userId: user.id }).then(setDailyNotes).catch(() => {});
      api.getAdminNotes({ toEmployeeId: user.id }).then(setAdminNotes).catch(() => {});
    }
  }, [isAdmin, user]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Selamat pagi";
    if (h < 17) return "Selamat siang";
    return "Selamat sore";
  };

  const myTasks = isAdmin ? tasks : tasks;
  const pending = myTasks.filter((t) => t.status === "todo").length;
  const inProgress = myTasks.filter((t) => t.status === "in-progress").length;
  const needsReview = myTasks.filter((t) => t.status === "needs-review").length;
  const completed = myTasks.filter((t) => t.status === "completed").length;
  const total = myTasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const stats = [
    { label: "Menunggu", value: pending, icon: Clock, color: "text-amber-600", bgColor: " bg-yellow-600/20" },
    { label: "Sedang Dikerjakan", value: inProgress, icon: TrendingUp, color: "text-primary", bgColor: "bg-muted" },
    { label: "Perlu Ditinjau", value: needsReview, icon: AlertTriangle, color: "text-orange-600", bgColor: "bg-orange-600/20" },
    { label: "Selesai", value: completed, icon: CheckCircle2, color: "text-success", bgColor: "bg-green-600/20" },
  ];

  const upcomingTasks = myTasks
    .filter((t) => t.status !== "completed")
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5);

  const getDeadlineColor = (deadline: string) => {
    const d = new Date(deadline);
    if (isPast(d)) return "text-destructive";
    if (isToday(d)) return "text-warning";
    return "text-muted-foreground";
  };

  const getDeadlineBg = (deadline: string) => {
    const d = new Date(deadline);
    if (isPast(d)) return "bg-destructive/5 border-destructive/20";
    if (isToday(d)) return "bg-warning/5 border-warning/20";
    return "border-border";
  };

  const todayTasks = myTasks.filter((t) => isSameDay(new Date(t.deadline), new Date()));
  const todayCompleted = todayTasks.filter((t) => t.status === "completed").length;

  const pieData = [
    { value: completionRate, fill: "hsl(var(--primary))" },
    { value: 100 - completionRate, fill: "hsl(var(--muted))" },
  ];

  // Today's notes for employee
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayNotes = dailyNotes.filter((n) => n.date === todayStr).slice(0, 3);
  const recentAdminNotes = adminNotes.slice(0, 3);

  const renderWidget = (id: string) => {
    switch (id) {
      case "today-tasks":
        return (
          <div className="ms-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><ListChecks className="w-4 h-4 " /> Tugas Hari Ini</h2>
              <span className="text-xs text-muted-foreground">{todayCompleted}/{todayTasks.length}</span>
            </div>
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-md border border-border hover:bg-muted/50 transition-colors">
                  <Checkbox checked={task.status === "completed"} onCheckedChange={(checked) => updateTaskStatus(task.id, checked ? "completed" : "todo")} />
                  <span className={`text-xs ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case "weekly-chart":
        return (
          <div className="ms-card p-4">
            <div className="flex items-center justify-between mb-3"><h2 className="text-xs font-semibold text-foreground">Produktivitas Mingguan</h2></div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={WEEKLY_PRODUCTIVITY} barSize={32}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis hide />
                <Bar dataKey="completed" radius={[6, 6, 0, 0]}>
                  {WEEKLY_PRODUCTIVITY.map((_, index) => (<Cell key={index} fill={index === (new Date().getDay() + 6) % 7 ? "hsl(var(--primary))" : "hsl(var(--muted))"} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case "completion-ring":
        return (
          <div className="ms-card p-4">
            <h2 className="text-xs font-semibold text-foreground mb-2">Penyelesaian Tugas</h2>
            <div className="flex items-center justify-center">
              <div className="relative">
                <ResponsiveContainer width={140} height={140}><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={62} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0} /></PieChart></ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><p className="text-xl font-bold text-foreground">{completionRate}%</p><p className="text-[9px] text-muted-foreground">Selesai</p></div></div>
              </div>
            </div>
            <div className="flex justify-center gap-3 mt-2 text-[10px] text-muted-foreground"><span>{completed} selesai</span><span>•</span><span>{total - completed} tersisa</span></div>
          </div>
        );
      case "deadlines":
        return (
          <div className="ms-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5 " /> Tenggat Waktu</h2>
              <Button variant="ghost" size="sm" className="text-[10px] gap-1 h-6 px-2" onClick={() => navigate("/tasks")}>Lihat semua <ArrowRight className="w-2.5 h-2.5" /></Button>
            </div>
            {upcomingTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Tidak ada tenggat mendatang</p>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className={`flex items-center justify-between py-2 px-2.5 rounded-md border text-xs ${getDeadlineBg(task.deadline)} transition-colors`}>
                    <div className="min-w-0"><p className="text-xs font-medium text-foreground truncate">{task.title}</p></div>
                    <span className={`text-[10px] font-medium whitespace-nowrap ${getDeadlineColor(task.deadline)}`}>{isPast(new Date(task.deadline)) ? "Terlambat" : formatDistanceToNow(new Date(task.deadline), { addSuffix: true, locale: localeID })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case "my-notes":
        return (
          <div className="ms-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><StickyNote className="w-3.5 h-3.5 " /> Catatan Saya</h2>
              <Button variant="ghost" size="sm" className="text-[10px] gap-1 h-6 px-2" onClick={() => navigate("/notes")}>Lihat semua <ArrowRight className="w-2.5 h-2.5" /></Button>
            </div>
            {/* Admin notes as notifications */}
           {recentAdminNotes.length > 0 && (
  <div className="space-y-1.5 mb-3">
    {recentAdminNotes.slice(0, 1).map((note) => (
      <div
        key={note.id}
        className={`flex items-start gap-2 p-2 rounded-md cursor-pointer transition-colors ${
          note.priority === "important"
            ? "bg-destructive/5 border border-destructive/20"
            : "bg-warning/5 border border-warning/20"
        }`}
        onClick={() => navigate("/notes")}
      >
        <Bell className="w-3 h-3 mt-0.5 text-warning shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="text-[8px] px-1 py-0 border-warning text-warning"
            >
              Admin
            </Badge>
            {note.priority === "important" && (
              <Badge
                variant="destructive"
                className="text-[8px] px-1 py-0"
              >
                !
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-foreground line-clamp-2 mt-0.5">
            {note.content}
          </p>
        </div>
      </div>
    ))}
  </div>
)}
            {/* Daily notes */}
            {todayNotes.length > 0 ? (
              <div className="space-y-1.5">
                {todayNotes.map((note) => (
                  <div key={note.id} className="p-2 rounded-md border border-border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate("/notes")}>
                    <p className="text-[11px] text-foreground line-clamp-2">{note.content}</p>
                    <p className="text-[9px] text-muted-foreground mt-1">{format(new Date(note.createdAt), "HH:mm")}</p>
                  </div>
                ))}
              </div>
            ) : recentAdminNotes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Belum ada catatan hari ini</p>
            ) : null}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">{greeting()}, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="text-muted-foreground text-xs mt-0.5">{format(new Date(), "EEEE, d MMMM yyyy", { locale: localeID })}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-1.5">
          <Button variant="outline" size="sm" className="gap-1 text-[11px] h-7 px-2.5" onClick={() => navigate("/attendance")}><Clock className="w-3 h-3" /> Kehadiran</Button>
          <Button variant="outline" size="sm" className="gap-1 text-[11px] h-7 px-2.5" onClick={() => navigate("/tasks")}><Plus className="w-3 h-3" /> Tugas</Button>
          <Button variant="outline" size="sm" className="gap-1 text-[11px] h-7 px-2.5" onClick={() => navigate("/payslip")}><Shield className="w-3 h-3" /> Slip Gaji</Button>
        </motion.div>
      </div>
      <DashboardSummary />
      <AdminDashboardSummary />
      {tasksLoading ? (
        <>
          <StatsSkeleton count={4} />
          <CardGridSkeleton count={4} cols={2} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{stats.map((s, i) => (<StatsCard key={s.label} {...s} delay={i} />))}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {todayTasks.length > 0 && renderWidget("today-tasks")}
            {renderWidget("weekly-chart")}
            {renderWidget("completion-ring")}
            {renderWidget("deadlines")}
            {!isAdmin && renderWidget("my-notes")}
            {isAdmin && renderWidget("team-dist")}
          </div>

          {isAdmin && (
            <div className="ms-card p-4">
              <h2 className="text-xs font-semibold text-foreground mb-2">Aktivitas Terkini</h2>
              <ActivityTimeline />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
