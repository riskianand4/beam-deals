import { useEffect, useMemo, useState } from "react";
import { CardGridSkeleton, StatsSkeleton } from "@/components/PageSkeleton";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/contexts/TaskContext";
import { useMenuSettings } from "@/contexts/MenuSettingsContext";
import type { Task, TaskStatus, TeamGroup } from "@/types";
import TaskDetailModal from "@/components/TaskDetailModal";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import TaskFilters from "@/components/TaskFilters";
import TaskListView from "@/components/TaskListView";
import ConfirmDialog from "@/components/ConfirmDialog";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  Flag,
  GripVertical,
  Inbox,
  LayoutGrid,
  List,
  MessageCircleCodeIcon,
  Paperclip,
  Search,
  User,
  UserCheck,
  Users,
  MoreVertical,
  Eye,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDistanceToNow, isPast, isToday } from "date-fns";
import { id as localeID } from "date-fns/locale";
import StatsCard from "@/components/StatsCard";
import EmployeeGrid, { EmployeeHeader } from "@/components/EmployeeGrid";
import { useAdminBadges } from "@/hooks/useAdminBadges";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUploadUrl } from "@/lib/api";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

const COLUMNS: {
  status: TaskStatus;
  label: string;
  accent: string;
  emptyText: string;
}[] = [
  { status: "todo", label: "Tugas", accent: "bg-muted-foreground", emptyText: "Tidak ada tugas" },
  { status: "completed", label: "Selesai", accent: "bg-success", emptyText: "Belum ada yang selesai" },
];

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/10 text-warning",
  low: "bg-muted text-muted-foreground",
  none: "",
};
const PRIORITY_LABELS: Record<string, string> = {
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
  none: "",
};

const Tasks = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAdmin, users } = useAuth();
  const { tasks, updateTaskStatus, refreshTasks, loading: tasksLoading } = useTasks();
  const { hasAccess } = useMenuSettings();
  const adminBadges = useAdminBadges();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [pendingDrop, setPendingDrop] = useState<{ taskId: string; status: TaskStatus } | null>(null);
  const [taskTab, setTaskTab] = useState<"personal" | "team">(
    searchParams.get("tab") === "personal" ? "personal" : "team",
  );
  const [teams, setTeams] = useState<TeamGroup[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(searchParams.get("teamId") || null);
  const [adminTab, setAdminTab] = useState<"employee" | "team">(searchParams.get("tab") === "employee" ? "employee" : "team");
  const [adminViewMode, setAdminViewMode] = useState<"grid" | "table">("table");
  const [adminSearch, setAdminSearch] = useState("");

  const [employeeTasks, setEmployeeTasks] = useState<Task[]>([]);
  const [employeeTasksLoading, setEmployeeTasksLoading] = useState(false);

  const hasTasksAccess = hasAccess("tasks");

  useEffect(() => {
    api.getTeams().then(setTeams).catch(() => {});
  }, []);

  useEffect(() => {
    if (isAdmin && employeeId) {
      setEmployeeTasksLoading(true);
      api.getTasks({ assigneeId: employeeId })
        .then(setEmployeeTasks)
        .catch(() => setEmployeeTasks([]))
        .finally(() => setEmployeeTasksLoading(false));
    }
  }, [isAdmin, employeeId]);

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  const isLeader = useMemo(() => {
    if (!user) return false;
    return teams.some((t) => t.leaderId === user.id);
  }, [teams, user]);

  const leaderTeams = useMemo(() => {
    if (!user) return [];
    return teams.filter((t) => t.leaderId === user.id);
  }, [teams, user]);

  const allMyTasks = useMemo(() => {
    if (isAdmin && employeeId) return employeeTasks;
    return tasks;
  }, [tasks, isAdmin, employeeId, employeeTasks]);

  const teamTasksForSelectedTeam = useMemo(() => {
    if (!selectedTeamId) return [];
    return tasks.filter((task) => task.type === "team" && task.teamId === selectedTeamId);
  }, [tasks, selectedTeamId]);

  const filteredByTab = useMemo(() => {
    if (isAdmin || hasTasksAccess) return allMyTasks;
    return allMyTasks.filter((t) => {
      if (taskTab === "personal") return t.type === "personal" || !t.type;
      return t.type === "team";
    });
  }, [allMyTasks, taskTab, isAdmin, hasTasksAccess]);

  const myTasks = useMemo(() => {
    const sourceTasks = (isAdmin || hasTasksAccess) && selectedTeamId ? teamTasksForSelectedTeam : filteredByTab;
    return sourceTasks.filter((t) => {
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
      const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
      return matchSearch && matchPriority;
    });
  }, [filteredByTab, isAdmin, hasTasksAccess, selectedTeamId, teamTasksForSelectedTeam, search, priorityFilter]);

  useEffect(() => {
    if (selectedTask) {
      const source = isAdmin && employeeId ? employeeTasks : tasks;
      const updated = source.find((t) => t.id === selectedTask.id);
      if (updated) setSelectedTask(updated);
      else setSelectedTask(null);
    }
  }, [tasks, employeeTasks]);

  // Admin stats
  const adminTotalTasks = tasks.length;
  const adminEmployeeCount = users.filter(u => u.role === "employee").length;
  const adminTeamCount = teams.length;
  const adminTodoCount = tasks.filter(t => t.status === "todo").length;
  const adminDoneCount = tasks.filter(t => t.status === "completed").length;

  // Employee task summary for admin employee tab
  const employeeTaskSummary = useMemo(() => {
    const employees = users.filter(u => u.role === "employee");
    return employees.map(emp => {
      const empTasks = tasks.filter(t => t.assigneeId === emp.id);
      const total = empTasks.length;
      const done = empTasks.filter(t => t.status === "completed").length;
      const todo = empTasks.filter(t => t.status === "todo").length;
      const highPriority = empTasks.filter(t => t.priority === "high" && t.status !== "completed").length;
      return { ...emp, total, done, todo, highPriority };
    }).filter(emp => {
      if (!adminSearch) return true;
      return emp.name.toLowerCase().includes(adminSearch.toLowerCase());
    });
  }, [users, tasks, adminSearch]);

  // Admin or hasTasksAccess: show admin-like view with team/employee tabs
  if ((isAdmin || hasTasksAccess) && !employeeId && !selectedTeamId) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto pb-10">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4" /> Manajemen Tugas
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/30 shadow-sm">
              <Tooltip><TooltipTrigger asChild><button className={`p-1.5 rounded-md transition-colors ${adminViewMode === "grid" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setAdminViewMode("grid")}><LayoutGrid className="w-3.5 h-3.5" /></button></TooltipTrigger><TooltipContent>Tampilan Grid</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><button className={`p-1.5 rounded-md transition-colors ${adminViewMode === "table" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setAdminViewMode("table")}><List className="w-3.5 h-3.5" /></button></TooltipTrigger><TooltipContent>Tampilan Tabel</TooltipContent></Tooltip>
            </div>
            <CreateTaskDialog teams={teams} isLeader={isLeader} />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatsCard label="Total Tugas" value={adminTotalTasks} icon={CheckSquare} color="" bgColor="bg-muted/30" delay={0} />
          <StatsCard label="Menunggu" value={adminTodoCount} icon={Clock} color="text-warning" bgColor="bg-warning/10" delay={1} />
          <StatsCard label="Selesai" value={adminDoneCount} icon={CheckCircle2} color="text-success" bgColor="bg-success/10" delay={2} />
          <StatsCard label="Karyawan" value={adminEmployeeCount} icon={UserCheck} color="" bgColor="bg-muted/30" delay={3} />
          <StatsCard label="Tim" value={adminTeamCount} icon={Users} color="" bgColor="bg-muted/30" delay={4} />
        </div>

        <TooltipProvider>
          <Tabs value={adminTab} onValueChange={(v) => setAdminTab(v as "employee" | "team")} className="w-full mt-2">
            <TabsList className="bg-transparent  justify-start rounded-none p-0 h-auto space-x-6 mb-4">
              <TabsTrigger value="team" className="px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:shadow-none rounded-none text-xs">
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Tim</span>
              </TabsTrigger>
              <TabsTrigger value="employee" className="px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:shadow-none rounded-none text-xs">
                <span className="flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Karyawan</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Karyawan Tab */}
            <TabsContent value="employee" className="mt-0 space-y-4">
              <div className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-2 shadow-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Cari karyawan..." value={adminSearch} onChange={e => setAdminSearch(e.target.value)} className="pl-8 h-8 text-[10px] bg-muted/30 border-none shadow-none focus-visible:ring-0" />
                </div>
              </div>
              
              <div className="flex items-center gap-2 px-1">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Daftar Tugas Karyawan</p>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{employeeTaskSummary.length} Karyawan</Badge>
              </div>

              <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] h-8 w-[40%]">Karyawan</TableHead>
                      <TableHead className="text-[10px] h-8 text-center">Total Tugas</TableHead>
                      <TableHead className="text-[10px] h-8 text-center">Menunggu</TableHead>
                      <TableHead className="text-[10px] h-8 text-center">Selesai</TableHead>
                      <TableHead className="text-[10px] h-8 text-center">Prioritas Tinggi</TableHead>
                      <TableHead className="text-[10px] h-8 text-right w-[80px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeTaskSummary.length === 0 ? (
                       <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                             <UserCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                             <p className="text-xs text-muted-foreground">Tidak ada data karyawan.</p>
                          </TableCell>
                       </TableRow>
                    ) : employeeTaskSummary.map(emp => (
                      <TableRow key={emp.id} className="cursor-pointer hover:bg-muted/40 transition-colors group h-10" onClick={() => navigate(`/tasks/${emp.id}`)}>
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-7 h-7 border shadow-sm rounded-md">
                              {emp.avatar && <AvatarImage src={getUploadUrl(emp.avatar)} />}
                              <AvatarFallback className="bg-muted text-foreground text-[8px] font-bold rounded-md">{getInitials(emp.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-semibold text-xs text-foreground line-clamp-1">{emp.name}</span>
                              <span className="text-[9px] text-muted-foreground truncate">{emp.position || "Karyawan"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-medium">{emp.total}</TableCell>
                        <TableCell className="text-xs text-center py-1.5 text-warning font-medium">{emp.todo}</TableCell>
                        <TableCell className="text-xs text-center py-1.5 text-success font-medium">{emp.done}</TableCell>
                        <TableCell className="text-center py-1.5">
                          {emp.highPriority > 0 ? <Badge variant="destructive" className="text-[9px] h-4 px-1.5">{emp.highPriority}</Badge> : <span className="text-[10px] text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-right py-1.5">
                           <div onClick={e => e.stopPropagation()}>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button size="icon" variant="ghost" className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-36 p-1" align="end">
                                  <button
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-foreground hover:bg-muted rounded-md transition-colors"
                                    onClick={() => navigate(`/tasks/${emp.id}`)}
                                  >
                                    <Eye className="w-3 h-3" /> Lihat Tugas
                                  </button>
                                </PopoverContent>
                              </Popover>
                           </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tim Tab */}
            <TabsContent value="team" className="mt-0 space-y-4">
              <div className="bg-card  rounded-lg p-1 flex items-center gap-2 shadow-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Cari tim..." value={adminSearch} onChange={e => setAdminSearch(e.target.value)} className="pl-8 h-8 text-[10px] bg-muted/30 border-none shadow-none focus-visible:ring-0" />
                </div>
              </div>
              
              <div className="flex items-center gap-2 px-1">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Daftar Tugas Tim</p>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{teams.length} Tim</Badge>
              </div>

              {teams.length === 0 ? (
                <EmptyState icon={Users} title="Belum ada team" description="Buat team terlebih dahulu di halaman Team" compact />
              ) : adminViewMode === "table" ? (
                <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[10px] h-8 w-[35%]">Tim</TableHead>
                        <TableHead className="text-[10px] h-8">Ketua Tim</TableHead>
                        <TableHead className="text-[10px] h-8 text-center">Total Tugas</TableHead>
                        <TableHead className="text-[10px] h-8 text-center">Selesai</TableHead>
                        <TableHead className="text-[10px] h-8 text-center">Anggota</TableHead>
                        <TableHead className="text-[10px] h-8 text-right w-[80px]">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teams.filter(t => !adminSearch || t.name.toLowerCase().includes(adminSearch.toLowerCase())).map((team) => {
                        const teamTasks = tasks.filter((t) => t.type === "team" && t.teamId === team.id);
                        const doneTasks = teamTasks.filter((t) => t.status === "completed").length;
                        const leader = users.find((u) => u.id === team.leaderId);
                        
                        return (
                          <TableRow key={team.id} className="cursor-pointer hover:bg-muted/40 transition-colors group h-10" onClick={() => setSelectedTeamId(team.id)}>
                            <TableCell className="py-1.5">
                               <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                                     <Users className="w-3.5 h-3.5 text-foreground" />
                                  </div>
                                  <span className="text-xs font-semibold text-foreground">{team.name}</span>
                               </div>
                            </TableCell>
                            <TableCell className="py-1.5">
                               {leader ? (
                                  <div className="flex items-center gap-1.5">
                                     <Avatar className="w-5 h-5 rounded-md">
                                        {leader.avatar && <AvatarImage src={getUploadUrl(leader.avatar)} />}
                                        <AvatarFallback className="bg-muted text-foreground text-[7px] font-bold rounded-md">{getInitials(leader.name)}</AvatarFallback>
                                     </Avatar>
                                     <span className="text-[10px] text-muted-foreground">{leader.name}</span>
                                  </div>
                               ) : <span className="text-[10px] text-muted-foreground italic">- Belum ada -</span>}
                            </TableCell>
                            <TableCell className="text-xs text-center py-1.5 font-medium">{teamTasks.length}</TableCell>
                            <TableCell className="text-xs text-center py-1.5 text-success font-medium">{doneTasks}</TableCell>
                            <TableCell className="text-xs text-center py-1.5">{team.memberIds?.length || 0}</TableCell>
                            <TableCell className="text-right py-1.5">
                               <div onClick={e => e.stopPropagation()}>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button size="icon" variant="ghost" className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                                        <MoreVertical className="w-3.5 h-3.5" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-36 p-1" align="end">
                                      <button
                                        className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-foreground hover:bg-muted rounded-md transition-colors"
                                        onClick={() => setSelectedTeamId(team.id)}
                                      >
                                        <Eye className="w-3 h-3" /> Lihat Tugas
                                      </button>
                                    </PopoverContent>
                                  </Popover>
                               </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.filter(t => !adminSearch || t.name.toLowerCase().includes(adminSearch.toLowerCase())).map((team, i) => {
                    const teamTasks = tasks.filter((t) => t.type === "team" && t.teamId === team.id);
                    const doneTasks = teamTasks.filter((t) => t.status === "completed").length;
                    const leader = users.find((u) => u.id === team.leaderId);
                    
                    return (
                      <motion.div key={team.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => setSelectedTeamId(team.id)} 
                        className="bg-card border border-border shadow-sm rounded-xl p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col">
                        
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Users className="w-4 h-4 text-foreground" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-foreground line-clamp-1">{team.name}</span>
                              <span className="text-[9px] text-muted-foreground line-clamp-1">Ketua: {leader?.name || "-"}</span>
                            </div>
                          </div>
                          
                          <div onClick={e => e.stopPropagation()}>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button size="icon" variant="ghost" className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground -mt-1 -mr-2">
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-32 p-1" align="end">
                                <button
                                  className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-foreground hover:bg-muted rounded-md transition-colors"
                                  onClick={() => setSelectedTeamId(team.id)}
                                >
                                  <Eye className="w-3 h-3" /> Lihat
                                </button>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border/50 flex-wrap">
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-muted/50 font-medium">{teamTasks.length} Tugas</Badge>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium border-border">{doneTasks} Selesai</Badge>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium border-border">{team.memberIds?.length || 0} Anggota</Badge>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TooltipProvider>
      </div>
    );
  }

  // ===== TEAM TASKS DETAIL VIEW (Inside Admin/Employee) =====
  if ((isAdmin || hasTasksAccess) && selectedTeamId) {
    const team = teams.find((t) => t.id === selectedTeamId);
    const teamTasksList = myTasks;
    const todoCount = teamTasksList.filter((t) => t.status === "todo").length;
    const doneCount = teamTasksList.filter((t) => t.status === "completed").length;

    return (
      <div className="space-y-4 max-w-7xl mx-auto pb-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="w-7 h-7 bg-muted/50" onClick={() => setSelectedTeamId(null)}>
             <List className="w-3 h-3" />
          </Button>
          <h1 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Users className="w-4 h-4" /> Tugas Team: {team?.name}
          </h1>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatsCard label="Tugas" value={todoCount} icon={Clock} color="text-warning" bgColor="bg-warning/10" delay={0} />
          <StatsCard label="Selesai" value={doneCount} icon={CheckCircle2} color="text-success" bgColor="bg-success/10" delay={1} />
        </div>
        <TaskFilters search={search} onSearchChange={setSearch} priorityFilter={priorityFilter} onPriorityFilterChange={setPriorityFilter} view={view} onViewChange={setView} />
        {teamTasksList.length === 0 ? (
          <EmptyState icon={Inbox} title="Belum ada tugas team" description="Tugas team yang dibuat untuk grup ini akan tampil di sini." compact />
        ) : view === "list" ? (
          <TaskListView tasks={teamTasksList} onTaskClick={setSelectedTask} isAdmin={isAdmin || hasTasksAccess} />
        ) : (
          <KanbanBoard tasks={teamTasksList} columns={COLUMNS} users={users} canDragTask={() => false} onDragStart={() => {}} onDrop={(e) => { e.preventDefault(); setDragOverColumn(null); }} dragOverColumn={dragOverColumn} setDragOverColumn={setDragOverColumn} onTaskClick={setSelectedTask} />
        )}
        <TaskDetailModal task={selectedTask} open={!!selectedTask} onOpenChange={(open) => { if (!open) setSelectedTask(null); }} teams={teams} />
      </div>
    );
  }

  // ===== EMPLOYEE STANDARD VIEW =====
  const canDragTask = (task: Task) => {
    if (task.status === "completed") return false;
    if (isLeader && task.type === "team" && leaderTeams.some((t) => t.id === task.teamId)) return true;
    return false;
  };

  const handleDragStart = (e: React.DragEvent, taskId: string, task: Task) => {
    if (!canDragTask(task)) return;
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;
    const draggedTask = myTasks.find((t) => t.id === taskId);
    if (draggedTask?.status === "completed") {
      setDragOverColumn(null);
      return;
    }
    setPendingDrop({ taskId, status });
    setDragOverColumn(null);
  };

  const confirmDrop = () => {
    if (pendingDrop) {
      updateTaskStatus(pendingDrop.taskId, pendingDrop.status);
      setPendingDrop(null);
    }
  };

  const isLoading = isAdmin && employeeId ? employeeTasksLoading : tasksLoading;
  const todoCount = filteredByTab.filter((t) => t.status === "todo").length;
  const doneCount = filteredByTab.filter((t) => t.status === "completed").length;

  const miniStats = [
    { label: "Tugas", value: todoCount, icon: Clock, color: "text-warning", bgColor: "bg-warning/10" },
    { label: "Selesai", value: doneCount, icon: CheckCircle2, color: "text-success", bgColor: "bg-success/10" },
  ];

  const personalCount = allMyTasks.filter((t) => t.type === "personal" || !t.type).length;
  const teamCount = allMyTasks.filter((t) => t.type === "team").length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {isAdmin && employeeId && <EmployeeHeader employeeId={employeeId} backPath="/tasks" />}

      {!isAdmin && !hasTasksAccess && (
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4" /> Tugas
          </h1>
          {isLeader && <CreateTaskDialog teams={leaderTeams} isLeader={isLeader} />}
        </div>
      )}

      {!isAdmin && !hasTasksAccess && (
        <TooltipProvider>
          <Tabs value={taskTab} onValueChange={(v) => setTaskTab(v as "personal" | "team")} className="w-full">
            <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none p-0 h-auto space-x-6 mb-2">
              <TabsTrigger value="team" className="px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:shadow-none rounded-none text-xs gap-1.5">
                <Users className="w-3.5 h-3.5" /> Tim {teamCount > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-1">{teamCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="personal" className="px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:shadow-none rounded-none text-xs gap-1.5">
                <User className="w-3.5 h-3.5" /> Pribadi {personalCount > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-1">{personalCount}</Badge>}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </TooltipProvider>
      )}

      {isLoading ? (
        <>
          <StatsSkeleton count={2} />
          <CardGridSkeleton count={4} cols={2} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {miniStats.map((s, i) => <StatsCard key={s.label} {...s} delay={i} />)}
          </div>

          <TaskFilters search={search} onSearchChange={setSearch} priorityFilter={priorityFilter} onPriorityFilterChange={setPriorityFilter} view={view} onViewChange={setView} />

          {myTasks.length === 0 && !search && priorityFilter === "all" ? (
            <EmptyState
              icon={Inbox}
              title={isAdmin && employeeId ? "Belum ada tugas untuk karyawan ini" : taskTab === "team" ? "Belum ada tugas team" : "Belum ada tugas"}
              description=""
              compact
            />
          ) : view === "list" ? (
            <TaskListView tasks={myTasks} onTaskClick={setSelectedTask} isAdmin={isAdmin || hasTasksAccess} />
          ) : (
            <KanbanBoard tasks={myTasks} columns={COLUMNS} users={users} canDragTask={canDragTask} onDragStart={handleDragStart} onDrop={handleDrop} dragOverColumn={dragOverColumn} setDragOverColumn={setDragOverColumn} onTaskClick={setSelectedTask} />
          )}

          <TaskDetailModal task={selectedTask} open={!!selectedTask} onOpenChange={(open) => { if (!open) setSelectedTask(null); }} teams={teams} />

          <ConfirmDialog open={!!pendingDrop} onOpenChange={(open) => { if (!open) setPendingDrop(null); }} title="Ubah status tugas?" description="Yakin ingin memindahkan tugas ini ke status baru?" onConfirm={confirmDrop} />
        </>
      )}
    </div>
  );
};

export default Tasks;

interface KanbanBoardProps {
  tasks: Task[];
  columns: typeof COLUMNS;
  users: any[];
  canDragTask: (task: Task) => boolean;
  onDragStart: (e: React.DragEvent, taskId: string, task: Task) => void;
  onDrop: (e: React.DragEvent, status: TaskStatus) => void;
  dragOverColumn: TaskStatus | null;
  setDragOverColumn: (s: TaskStatus | null) => void;
  onTaskClick: (task: Task) => void;
}

const KanbanBoard = ({ tasks, columns, users, canDragTask, onDragStart, onDrop, dragOverColumn, setDragOverColumn, onTaskClick }: KanbanBoardProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {columns.map((col) => {
      const colTasks = tasks.filter((t) => t.status === col.status);
      return (
        <div key={col.status} onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.status); }} onDragLeave={() => setDragOverColumn(null)} onDrop={(e) => onDrop(e, col.status)} className={`bg-muted/10 border rounded-xl p-3 transition-all min-h-[220px] ${dragOverColumn === col.status ? "bg-accent/30 border-dashed border-foreground/30 scale-[1.01]" : "border-border"}`}>
          <div className="flex items-center gap-2 mb-3 px-1 border-b border-border/50 pb-2">
            <div className={`w-2 h-2 rounded-full ${col.accent}`} />
            <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">{col.label}</span>
            <Badge variant="secondary" className="ml-auto text-[9px] h-4 px-1.5">{colTasks.length}</Badge>
          </div>
          <div className="space-y-3">
            {colTasks.length === 0 ? (
              <div className="text-center py-10"><p className="text-[10px] text-muted-foreground/60 italic">{col.emptyText}</p></div>
            ) : colTasks.map((task, i) => {
              const deadlineDate = new Date(task.deadline);
              const overdue = isPast(deadlineDate) && task.status !== "completed";
              const dueToday = isToday(deadlineDate);
              const draggable = canDragTask(task);
              return (
                <motion.div key={task.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} draggable={draggable} onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, task.id, task)} onClick={() => onTaskClick(task)} 
                  className={`bg-card border shadow-sm p-3 rounded-lg cursor-pointer group hover:shadow-md hover:border-muted-foreground/30 transition-all ${draggable ? "hover:cursor-grab active:cursor-grabbing" : ""}`}>
                  <div className="flex items-start gap-2">
                    {draggable && <GripVertical className="w-4 h-4 text-muted-foreground/30 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {task.type === "team" && <Badge variant="secondary" className="text-[8px] h-4 px-1 shrink-0 bg-muted/50 font-medium">Team</Badge>}
                        {task.priority !== "none" && (
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_STYLES[task.priority]}`}>
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{task.title}</p>
                      
                      <div className="flex items-center justify-between pt-1 border-t border-border/50">
                        <span className={`text-[9px] flex items-center gap-1 font-medium ${overdue ? "text-destructive" : dueToday ? "text-warning" : "text-muted-foreground"}`}>
                          <Calendar className="w-3 h-3" />
                          {overdue ? "Terlambat" : formatDistanceToNow(deadlineDate, { addSuffix: true, locale: localeID })}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          {task.notes.length > 0 && <span className="text-[9px] text-muted-foreground flex items-center gap-1"><MessageCircleCodeIcon className="w-3 h-3" /> {task.notes.length}</span>}
                          {(task.attachments?.length || 0) > 0 && <span className="text-[9px] text-muted-foreground flex items-center gap-1"><Paperclip className="w-3 h-3" /> {task.attachments.length}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      );
    })}
  </div>
);