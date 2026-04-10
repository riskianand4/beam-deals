import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/contexts/TaskContext";
import api from "@/lib/api";
import type { TeamGroup, User, Task } from "@/types";
import { motion } from "framer-motion";
import {
  ArrowLeft, Users, Crown, Target, CheckCircle2, Clock, AlertTriangle, TrendingUp,
  Flag, Calendar, Paperclip, MessageCircleCodeIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUploadUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatsCard from "@/components/StatsCard";
import TaskDetailModal from "@/components/TaskDetailModal";
import { StatsSkeleton, CardGridSkeleton } from "@/components/PageSkeleton";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";

const initials = (name: string) => name.split(" ").map((n) => n[0]).join("");

const TeamDetail = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { users, isAdmin } = useAuth();
  const { tasks } = useTasks();
  const employees = users.filter((u) => u.role === "employee");

  const [team, setTeam] = useState<TeamGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchTeam = useCallback(async () => {
    if (!teamId) return;
    try {
      setLoading(true);
      const teams = await api.getTeams();
      const found = teams.find((t: TeamGroup) => t.id === teamId);
      setTeam(found || null);
    } catch {
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const leader = useMemo(() => team?.leaderId ? employees.find((u) => u.id === team.leaderId) : null, [team, employees]);
  const members = useMemo(() => team ? team.memberIds.map((id) => employees.find((u) => u.id === id)).filter(Boolean) as User[] : [], [team, employees]);

  const teamTasks = useMemo(() => {
    if (!team) return [];
    return tasks.filter((t) => t.type === "team" && t.teamId === team.id);
  }, [tasks, team]);

  const completedCount = teamTasks.filter((t) => t.status === "completed").length;
  const todoCount = teamTasks.filter((t) => t.status === "todo").length;
  const teamPct = teamTasks.length > 0 ? Math.round((completedCount / teamTasks.length) * 100) : 0;
  const overdueTasks = teamTasks.filter((t) => new Date(t.deadline) < new Date() && t.status !== "completed").length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate("/team")}>
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali
        </Button>
        <StatsSkeleton count={4} />
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate("/team")}>
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali
        </Button>
        <p className="text-sm text-muted-foreground text-center py-12">Tim tidak ditemukan</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate("/team")}>
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Target className="w-4 h-4 " />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">{team.name}</h1>
            {team.description && <p className="text-[10px] text-muted-foreground">{team.description}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatsCard label="Tugas" value={todoCount} icon={Clock} color="text-amber-600" bgColor="bg-amber-600/20" delay={0} />
        <StatsCard label="Selesai" value={completedCount} icon={CheckCircle2} color="text-success" bgColor="bg-success/10" delay={1} />
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="members">Anggota</TabsTrigger>
          <TabsTrigger value="tasks">Tugas</TabsTrigger>
          <TabsTrigger value="performance">Performa</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-3 mt-4">
          {leader && (
            <div className="ms-card p-3 flex items-center gap-3 border-warning/20">
              <Avatar className="w-10 h-10 ring-2 ring-warning/30">
                {leader.avatar && <AvatarImage src={getUploadUrl(leader.avatar)} />}
                <AvatarFallback className="bg-warning/10 text-warning font-semibold">{initials(leader.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  {leader.name} <Crown className="w-3.5 h-3.5 text-warning" />
                </p>
                <p className="text-xs text-muted-foreground">{leader.position}</p>
              </div>
            </div>
          )}
          {members.filter((m) => m.id !== team.leaderId).map((member) => (
            <div key={member.id} className="ms-card p-3 flex items-center gap-3">
              <Avatar className="w-9 h-9">
                {member.avatar && <AvatarImage src={getUploadUrl(member.avatar)} />}
                <AvatarFallback className="bg-primary/10  text-xs font-medium">{initials(member.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm text-foreground font-medium">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.position} — {member.department}</p>
              </div>
            </div>
          ))}
          {members.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Belum ada anggota</p>}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-2 mt-4">
          {teamTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Tidak ada tugas tim</p>
          ) : teamTasks.map((task) => {
            const assignee = employees.find((u) => u.id === task.assigneeId);
            return (
              <div key={task.id} className="ms-card p-3 flex items-center gap-3 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate(`/tasks?tab=team&teamId=${teamId}`)}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  task.status === "completed" ? "bg-success" : "bg-muted-foreground"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{task.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {assignee?.name?.split(" ")[0] || "Team"} · {
                      task.status === "todo" ? "Tugas" : "Selesai"
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(task.attachments?.length || 0) > 0 && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Paperclip className="w-2.5 h-2.5" /> {task.attachments.length}
                    </span>
                  )}
                  {task.notes.length > 0 && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <MessageCircleCodeIcon className="w-2.5 h-2.5" /> {task.notes.length}
                    </span>
                  )}
                  <Badge variant="secondary" className={`text-[9px] shrink-0 ${
                    task.priority === "high" ? "bg-destructive/10 text-destructive" :
                    task.priority === "medium" ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {task.priority === "high" ? "Tinggi" : task.priority === "medium" ? "Sedang" : "Rendah"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4 mt-4">
          <div className="ms-card p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Penyelesaian Tim</span>
              <span className="font-bold text-foreground">{teamPct}%</span>
            </div>
            <Progress value={teamPct} className="h-2.5" />
            <div className="grid grid-cols-4 gap-3 text-center pt-2">
              <div>
                <p className="text-lg font-bold text-foreground">{teamTasks.length}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
              <div>
                <p className="text-lg font-bold text-success">{completedCount}</p>
                <p className="text-[10px] text-muted-foreground">Selesai</p>
              </div>
              <div>
                <p className="text-lg font-bold text-warning">{teamTasks.length - completedCount}</p>
                <p className="text-[10px] text-muted-foreground">Aktif</p>
              </div>
              <div>
                <p className="text-lg font-bold text-destructive">{overdueTasks}</p>
                <p className="text-[10px] text-muted-foreground">Terlambat</p>
              </div>
            </div>
          </div>

          <h4 className="text-xs font-semibold text-foreground">Progress per Anggota</h4>
          {members.map((member) => {
            const mTasks = tasks.filter((t) => t.assigneeId === member.id);
            const mCompleted = mTasks.filter((t) => t.status === "completed").length;
            const mPct = mTasks.length > 0 ? Math.round((mCompleted / mTasks.length) * 100) : 0;
            return (
              <div key={member.id} className="ms-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="w-6 h-6">
                    {member.avatar && <AvatarImage src={getUploadUrl(member.avatar)} />}
                    <AvatarFallback className="text-[8px] bg-primary/10  font-medium">{initials(member.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-foreground flex-1">
                    {member.name}
                    {member.id === team.leaderId && <Crown className="w-2.5 h-2.5 text-warning inline ml-1" />}
                  </span>
                  <span className="text-xs font-bold text-foreground">{mPct}%</span>
                </div>
                <Progress value={mPct} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">{mCompleted}/{mTasks.length} tugas selesai</p>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>

      <TaskDetailModal task={selectedTask} open={!!selectedTask} onOpenChange={(open) => { if (!open) setSelectedTask(null); }} />
    </motion.div>
  );
};

export default TeamDetail;
