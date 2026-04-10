import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/contexts/TaskContext";
import { StatsSkeleton, CardGridSkeleton } from "@/components/PageSkeleton";
import api from "@/lib/api";
import type { ActivityItem, DailyNote, AdminNote, Announcement } from "@/types";
import { 
  CheckCircle2, Clock, AlertTriangle, Plus, Shield, ArrowRight, 
  TrendingUp, CalendarClock, ListChecks, BarChart3, StickyNote, 
  Bell, Megaphone, Check
} from "lucide-react";
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
import { formatDistanceToNow, isPast, isToday, isSameDay, format } from "date-fns";
import { id as localeID } from "date-fns/locale";

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
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    api.getAnnouncements().then(data => setAnnouncements(data.slice(0, 2))).catch(() => {});
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
  const completed = myTasks.filter((t) => t.status === "completed").length;
  const total = myTasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const stats = [
    { label: "Tugas Aktif", value: pending, icon: Clock, color: "text-muted-foreground", bgColor: "bg-muted/50" },
    { label: "Tugas Selesai", value: completed, icon: CheckCircle2, color: "text-foreground", bgColor: "bg-muted/50" },
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
    return "bg-muted/10 border-border/50";
  };

  const todayTasks = myTasks.filter((t) => isSameDay(new Date(t.deadline), new Date()));
  const todayCompleted = todayTasks.filter((t) => t.status === "completed").length;

  const pieData = [
    { value: completionRate, fill: "hsl(var(--foreground))" },
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
          <div className="bg-card border border-border shadow-sm rounded-xl p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
              <h2 className="text-xs font-bold text-foreground flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-muted-foreground" /> Tugas Hari Ini
              </h2>
              <Badge variant="secondary" className="text-[9px] bg-muted/50 text-foreground">
                {todayCompleted}/{todayTasks.length}
              </Badge>
            </div>
            <div className="space-y-2.5 flex-1">
              {todayTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 py-2.5 px-3 rounded-lg border border-border bg-muted/5 hover:bg-muted/30 transition-colors group">
                  <div className="mt-0.5">
                    <Checkbox checked={task.status === "completed"} onCheckedChange={(checked: any) => updateTaskStatus(task.id, checked ? "completed" : "todo")} />
                  </div>
                  <span className={`text-xs leading-snug ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}>
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      case "weekly-chart":
        return (
          <div className="bg-card border border-border shadow-sm rounded-xl p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
              <h2 className="text-xs font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" /> Produktivitas
              </h2>
            </div>
            <div className="flex-1 min-h-[160px] flex items-end">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={WEEKLY_PRODUCTIVITY} barSize={24}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                  <YAxis hide />
                  <Bar dataKey="completed" radius={[4, 4, 0, 0]}>
                    {WEEKLY_PRODUCTIVITY.map((_, index) => (
                      <Cell key={index} fill={index === (new Date().getDay() + 6) % 7 ? "hsl(var(--foreground))" : "hsl(var(--muted))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case "completion-ring":
        return (
          <div className="bg-card border border-border shadow-sm rounded-xl p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
              <h2 className="text-xs font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" /> Penyelesaian
              </h2>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={56} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-lg font-black text-foreground">{completionRate}%</p>
                    <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider">Selesai</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-5 text-[10px] font-medium text-muted-foreground bg-muted/30 px-4 py-1.5 rounded-full border border-border/50">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-foreground" />{completed} Selesai</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />{total - completed} Sisa</span>
              </div>
            </div>
          </div>
        );
      case "deadlines":
        return (
          <div className="bg-card border border-border shadow-sm rounded-xl p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
              <h2 className="text-xs font-bold text-foreground flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-muted-foreground" /> Tenggat Waktu
              </h2>
              <Button variant="ghost" size="sm" className="text-[9px] h-6 px-2 hover:bg-muted text-muted-foreground" onClick={() => navigate("/tasks")}>
                Lihat <ArrowRight className="w-2.5 h-2.5 ml-1" />
              </Button>
            </div>
            <div className="space-y-2.5 flex-1">
              {upcomingTasks.map((task) => (
                <div key={task.id} className={`flex items-center justify-between p-3 rounded-lg border text-xs ${getDeadlineBg(task.deadline)} transition-colors`}>
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-[11px] font-semibold text-foreground truncate">{task.title}</p>
                  </div>
                  <span className={`text-[9px] font-bold whitespace-nowrap bg-background/50 px-2 py-1 rounded-md border border-border/50 ${getDeadlineColor(task.deadline)}`}>
                    {isPast(new Date(task.deadline)) ? "Terlambat" : formatDistanceToNow(new Date(task.deadline), { addSuffix: true, locale: localeID })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      case "my-notes":
        return (
          <div className="bg-card border border-border shadow-sm rounded-xl p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
              <h2 className="text-xs font-bold text-foreground flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-muted-foreground" /> Catatan & Info
              </h2>
              <Button variant="ghost" size="sm" className="text-[9px] h-6 px-2 hover:bg-muted text-muted-foreground" onClick={() => navigate("/notes")}>
                Lihat <ArrowRight className="w-2.5 h-2.5 ml-1" />
              </Button>
            </div>
            
            <div className="flex-1 space-y-3">
              {/* Admin notes as notifications */}
              {recentAdminNotes.length > 0 && (
                <div className="space-y-2">
                  {recentAdminNotes.slice(0, 1).map((note) => (
                    <div
                      key={note.id}
                      className={`flex items-start gap-2.5 p-3 rounded-lg cursor-pointer transition-colors ${
                        note.priority === "important" ? "bg-destructive/10 border border-destructive/20" : "bg-warning/10 border border-warning/20"
                      }`}
                      onClick={() => navigate("/notes")}
                    >
                      <Bell className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${note.priority === "important" ? "text-destructive" : "text-warning"}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Badge variant="outline" className={`text-[8px] px-1.5 py-0 bg-background ${note.priority === "important" ? "border-destructive text-destructive" : "border-warning text-warning"}`}>Admin</Badge>
                          {note.priority === "important" && <Badge variant="destructive" className="text-[8px] px-1.5 py-0 bg-destructive text-destructive-foreground">Penting</Badge>}
                        </div>
                        <p className="text-[10px] text-foreground line-clamp-2 leading-relaxed">{note.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Daily notes */}
              {todayNotes.length > 0 ? (
                <div className="space-y-2">
                  {todayNotes.map((note) => (
                    <div key={note.id} className="p-3 rounded-lg border border-border bg-muted/5 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate("/notes")}>
                      <p className="text-[10px] text-foreground line-clamp-2 leading-relaxed">{note.content}</p>
                      <p className="text-[8px] text-muted-foreground mt-2 font-medium">{format(new Date(note.createdAt), "HH:mm")}</p>
                    </div>
                  ))}
                </div>
              ) : recentAdminNotes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/60 py-8">
                  <StickyNote className="w-5 h-5 mb-2 opacity-50" />
                  <p className="text-[10px]">Belum ada catatan hari ini.</p>
                </div>
              ) : null}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            {greeting()}, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground text-[10px] mt-1 font-medium tracking-wide uppercase">
            {format(new Date(), "EEEE, d MMMM yyyy", { locale: localeID })}
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-[10px] h-8 bg-card shadow-sm hover:shadow-md hover:bg-muted transition-all text-foreground" onClick={() => navigate("/attendance")}>
            <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Kehadiran
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-[10px] h-8 bg-card shadow-sm hover:shadow-md hover:bg-muted transition-all text-foreground" onClick={() => navigate("/tasks")}>
            <ListChecks className="w-3.5 h-3.5 text-muted-foreground" /> Tugas
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-[10px] h-8 bg-card shadow-sm hover:shadow-md hover:bg-muted transition-all text-foreground" onClick={() => navigate("/payslip")}>
            <Shield className="w-3.5 h-3.5 text-muted-foreground" /> Slip Gaji
          </Button>
        </motion.div>
      </div>

      <DashboardSummary />
      <AdminDashboardSummary />

      {/* Pengumuman Terbaru */}
      {announcements.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-muted/10 border border-border rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                <Megaphone className="w-3.5 h-3.5 text-foreground" />
              </div>
              <h2 className="text-xs font-bold text-foreground">Pengumuman Terbaru</h2>
            </div>
            <Button variant="ghost" size="sm" className="text-[9px] h-6 px-2 hover:bg-muted text-muted-foreground" onClick={() => navigate("/notes")}>
              Lihat Semua <ArrowRight className="w-2.5 h-2.5 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {announcements.map((ann) => (
              <div key={ann.id} className="p-3.5 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors cursor-pointer shadow-sm" onClick={() => navigate("/notes")}>
                <p className="text-[11px] font-bold text-foreground line-clamp-1">{ann.title}</p>
                <p className="text-[9px] text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {format(new Date(ann.createdAt), "d MMM yyyy, HH:mm", { locale: localeID })}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      {tasksLoading ? (
        <>
          <StatsSkeleton count={2} />
          <CardGridSkeleton count={4} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s, i) => (<StatsCard key={s.label} {...s} delay={i} />))}
          </div>

          {/* FLEXIBLE GRID LAYOUT 
            Menggunakan grid-cols dan items-start agar widget otomatis saling mengisi ruang kosong.
          */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {todayTasks.length > 0 && renderWidget("today-tasks")}
            {renderWidget("completion-ring")}
            {renderWidget("weekly-chart")}
            {upcomingTasks.length > 0 && renderWidget("deadlines")}
            {!isAdmin && renderWidget("my-notes")}
          </div>

          {isAdmin && (
            <div className="bg-card border border-border shadow-sm rounded-xl p-5">
              <h2 className="text-xs font-bold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" /> Aktivitas Sistem Terkini
              </h2>
              <ActivityTimeline />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;