import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/contexts/TaskContext";
import api from "@/lib/api";
import type { TeamGroup } from "@/types";
import { motion } from "framer-motion";
import {
  Users, Search, TrendingUp, Plus, Trash2, Edit2, Crown, Target, AlertTriangle, CheckCircle2,
  Group, Shield, LayoutGrid, List, MoreVertical
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUploadUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatsCard from "@/components/StatsCard";
import ConfirmDialog from "@/components/ConfirmDialog";
import { CardGridSkeleton, StatsSkeleton } from "@/components/PageSkeleton";
import { toast } from "sonner";

const Team = () => {
  const navigate = useNavigate();
  const { tasks } = useTasks();
  const { users: allUsers } = useAuth();
  const employees = allUsers.filter((u) => u.role === "employee");

  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Team dialog
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [newTeamAdmins, setNewTeamAdmins] = useState<string[]>([]);
  const [newTeamMembers, setNewTeamMembers] = useState<string[]>([]);
  const [editTeamId, setEditTeamId] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [adminSearch, setAdminSearch] = useState("");

  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<string | null>(null);
  const [teamViewMode, setTeamViewMode] = useState<"grid" | "table">(() => (localStorage.getItem("viewMode_team") as any) || "grid");

  useEffect(() => { localStorage.setItem("viewMode_team", teamViewMode); }, [teamViewMode]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const teams = await api.getTeams();
      setTeamGroups(teams);
    } catch {
      console.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

  const getTeamTaskCounts = (teamId: string, memberIds: string[]) => {
    const teamTasks = tasks.filter((t) =>
      (t.type === "team" && t.teamId === teamId) || memberIds.includes(t.assigneeId)
    );
    const completed = teamTasks.filter((t) => t.status === "completed").length;
    const total = teamTasks.length;
    let progress = 0;
    if (total > 0) {
      progress = Math.round((completed / total) * 100);
      if (Number.isNaN(progress)) progress = 0;
    }
    return { total, completed, active: total - completed, progress };
  };

  const allTeamTasks = tasks.filter((t) => teamGroups.some((tg) => (t.type === "team" && t.teamId === tg.id) || tg.memberIds.includes(t.assigneeId)));
  const totalCompleted = allTeamTasks.filter((t) => t.status === "completed").length;
  let avgRate = 0;
  if (allTeamTasks.length > 0) {
    avgRate = Math.round((totalCompleted / allTeamTasks.length) * 100);
    if (Number.isNaN(avgRate)) avgRate = 0;
  }
  const overdueTasks = allTeamTasks.filter((t) => new Date(t.deadline) < new Date() && t.status !== "completed").length;

  const resetTeamForm = () => {
    setNewTeamName(""); setNewTeamDesc(""); setNewTeamAdmins([]); setNewTeamMembers([]); setEditTeamId(null); setMemberSearch(""); setAdminSearch("");
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) { toast.error("Nama Team wajib diisi"); return; }
    try {
      if (editTeamId) {
        const updated = await api.updateTeam(editTeamId, { name: newTeamName.trim(), description: newTeamDesc.trim() || undefined, leaderIds: newTeamAdmins, memberIds: newTeamMembers });
        setTeamGroups((prev) => prev.map((t) => t.id === editTeamId ? updated : t));
        toast.success("Team diperbarui");
      } else {
        const created = await api.createTeam({ name: newTeamName.trim(), description: newTeamDesc.trim() || undefined, leaderIds: newTeamAdmins, memberIds: newTeamMembers });
        setTeamGroups((prev) => [...prev, created]);
        toast.success("Team dibuat");
      }
      setTeamDialogOpen(false);
      resetTeamForm();
    } catch { toast.error("Gagal menyimpan Team"); }
  };

  const openEditTeam = (team: TeamGroup) => {
    setEditTeamId(team.id); setNewTeamName(team.name); setNewTeamDesc(team.description || "");
    setNewTeamAdmins(team.leaderIds || []); setNewTeamMembers(team.memberIds);
    setMemberSearch(""); setAdminSearch(""); setTeamDialogOpen(true);
  };

  const deleteTeam = async (id: string) => {
    try {
      await api.deleteTeam(id);
      setTeamGroups((prev) => prev.filter((t) => t.id !== id));
      setConfirmDeleteTeam(null);
      toast.success("Team dihapus");
    } catch { toast.error("Gagal menghapus Team"); }
  };

  const toggleMember = (empId: string) => {
    setNewTeamMembers((prev) => prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]);
  };

  const toggleAdmin = (empId: string) => {
    setNewTeamAdmins((prev) => prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]);
  };

  const filteredDialogEmployees = useMemo(() => {
    if (!memberSearch) return employees;
    const q = memberSearch.toLowerCase();
    return employees.filter((e) => e.name.toLowerCase().includes(q));
  }, [employees, memberSearch]);

  const filteredAdminEmployees = useMemo(() => {
    if (!adminSearch) return employees;
    const q = adminSearch.toLowerCase();
    return employees.filter((e) => e.name.toLowerCase().includes(q));
  }, [employees, adminSearch]);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Users className="w-4 h-4 " /> Manajemen Team
        </h1>
        <StatsSkeleton count={3} />
        <CardGridSkeleton count={6} />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Users className="w-5 h-5 " /> Manajemen Team
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/50 border border-border rounded-lg p-0.5">
            <button className={`p-1.5 rounded-md transition-colors ${teamViewMode === "grid" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setTeamViewMode("grid")}><LayoutGrid className="w-4 h-4" /></button>
            <button className={`p-1.5 rounded-md transition-colors ${teamViewMode === "table" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setTeamViewMode("table")}><List className="w-4 h-4" /></button>
          </div>
          <Button size="sm" className="gap-1.5 text-xs h-8 shadow-sm" onClick={() => { resetTeamForm(); setTeamDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Buat Team Baru
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatsCard label="Total Team Aktif" value={teamGroups.length} icon={Users} color="" bgColor="bg-primary/10" delay={0} />
        <StatsCard label="Rata-rata Penyelesaian" value={avgRate} suffix="%" icon={TrendingUp} color="text-success" bgColor="bg-success/10" delay={1} />
        <StatsCard label="Tugas Terlambat" value={overdueTasks} icon={AlertTriangle} color="text-destructive" bgColor="bg-destructive/10" delay={2} />
      </div>

      {/* Filter bar */}
      <div className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-2 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari team berdasarkan nama..." className="h-9 text-xs pl-9 bg-transparent border-none shadow-none focus-visible:ring-0" />
        </div>
      </div>

      {/* Content */}
      {teamGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-xl border border-dashed border-border">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">Belum Ada Team</h3>
          <p className="text-xs text-muted-foreground mb-4 text-center max-w-sm">Anda belum membuat team satupun. Kelompokkan anggota untuk manajemen tugas yang lebih efisien.</p>
          <Button size="sm" onClick={() => { resetTeamForm(); setTeamDialogOpen(true); }}><Plus className="w-3.5 h-3.5 mr-1.5"/> Buat Team Pertama</Button>
        </div>
      ) : teamViewMode === "table" ? (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[30%]">Informasi Team</TableHead>
                <TableHead>Admin Team</TableHead>
                <TableHead>Anggota Team</TableHead>
                <TableHead className="w-[20%]">Progress Tugas</TableHead>
                <TableHead className="text-right w-[80px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamGroups.map((team) => {
                const admins = (team.leaderIds || []).map((id) => employees.find((u) => u.id === id)).filter(Boolean);
                const members = team.memberIds.map((id) => employees.find((u) => u.id === id)).filter(Boolean);
                const stats = getTeamTaskCounts(team.id, team.memberIds);

                return (
                  <TableRow key={team.id} className="group cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => navigate(`/team/${team.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Group className="w-5 h-5 " />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground mb-0.5">{team.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1 whitespace-pre-wrap">{team.description || "Tidak ada deskripsi"}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        {admins.length > 0 ? (
                          <div className="flex -space-x-1.5">
                            {admins.slice(0, 3).map(adm => adm && (
                              <Avatar key={adm.id} className="w-6 h-6 border shadow-sm">
                                {adm.avatar && <AvatarImage src={getUploadUrl(adm.avatar)} />}
                                <AvatarFallback className="text-[8px] bg-warning/20 text-warning font-semibold">{initials(adm.name)}</AvatarFallback>
                              </Avatar>
                            ))}
                            {admins.length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                <span className="text-[7px] font-medium">+{admins.length - 3}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">- Belum ada admin -</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {members.slice(0, 5).map((m) => m && (
                            <Avatar key={m.id} className="w-8 h-8 border-2 border-background shadow-sm hover:z-20 transition-transform hover:scale-110">
                              {m.avatar && <AvatarImage src={getUploadUrl(m.avatar)} />}
                              <AvatarFallback className="text-[9px] bg-primary text-primary-foreground font-medium">{initials(m.name)}</AvatarFallback>
                            </Avatar>
                          ))}
                          {members.length > 5 && (
                            <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center shadow-sm relative z-0">
                              <span className="text-[10px] text-muted-foreground font-medium">+{members.length - 5}</span>
                            </div>
                          )}
                        </div>
                        {members.length === 0 && <span className="text-xs text-muted-foreground">Kosong</span>}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1.5 max-w-[150px]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{stats.completed}/{stats.total} Tugas</span>
                          <span className="font-semibold text-foreground">{stats.progress}%</span>
                        </div>
                        <Progress value={stats.progress} className="h-1.5" />
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button size="icon" variant="ghost" className="w-8 h-8">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-1" align="end">
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted rounded-md transition-colors" onClick={() => openEditTeam(team)}>
                              <Edit2 className="w-3.5 h-3.5" /> Edit Team
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors" onClick={() => setConfirmDeleteTeam(team.id)}>
                              <Trash2 className="w-3.5 h-3.5" /> Hapus Team
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {teamGroups.map((team, i) => {
            const admins = (team.leaderIds || []).map((id) => employees.find((u) => u.id === id)).filter(Boolean);
            const members = team.memberIds.map((id) => employees.find((u) => u.id === id)).filter(Boolean);
            const stats = getTeamTaskCounts(team.id, team.memberIds);

            return (
              <motion.div key={team.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="cursor-pointer h-full border border-border shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col overflow-hidden group" onClick={() => navigate(`/team/${team.id}`)}>
                  <CardHeader className="p-4 pb-0 bg-muted/20">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Group className="w-5 h-5 " />
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button size="icon" variant="ghost" className="w-7 h-7 bg-background/50 hover:bg-background text-muted-foreground">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-1" align="end">
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted rounded-md transition-colors" onClick={() => openEditTeam(team)}>
                              <Edit2 className="w-3.5 h-3.5" /> Edit Team
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors" onClick={() => setConfirmDeleteTeam(team.id)}>
                              <Trash2 className="w-3.5 h-3.5" /> Hapus Team
                            </button>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <CardTitle className="text-base font-bold text-foreground line-clamp-1">{team.name}</CardTitle>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[32px] whitespace-pre-wrap">{team.description || "Tidak ada deskripsi"}</p>
                  </CardHeader>
                  
                  <CardContent className="p-4 flex-1 flex flex-col gap-4">
                    <div className="space-y-1.5 pt-2 border-t border-border">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Progress Penyelesaian</span>
                        <span className="font-bold text-foreground">{stats.progress}%</span>
                      </div>
                      <Progress value={stats.progress} className="h-1.5" />
                    </div>

                    <div className="space-y-3 mt-auto pt-2">
                      {/* Admin Team */}
                      <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2">
                          {admins.length > 0 ? (
                            <div className="flex -space-x-1.5">
                              {admins.slice(0, 3).map(adm => adm && (
                                <Avatar key={adm.id} className="w-7 h-7 border shadow-sm">
                                  {adm.avatar && <AvatarImage src={getUploadUrl(adm.avatar)} />}
                                  <AvatarFallback className="text-[9px] bg-warning/20 text-warning font-semibold">{initials(adm.name)}</AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Belum ada admin</span>
                          )}
                          <div className="flex flex-col">
                            <span className="text-[9px] text-muted-foreground">Admin ({admins.length})</span>
                          </div>
                        </div>
                        <Crown className="w-3 h-3 text-warning" />
                      </div>

                      {/* Members */}
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {members.slice(0, 4).map((m) => m && (
                            <Avatar key={m.id} className="w-7 h-7 border-2 border-card shadow-sm">
                              {m.avatar && <AvatarImage src={getUploadUrl(m.avatar)} />}
                              <AvatarFallback className="text-[8px] bg-primary text-primary-foreground font-medium">{initials(m.name)}</AvatarFallback>
                            </Avatar>
                          ))}
                          {members.length > 4 && (
                            <div className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center shadow-sm relative z-0">
                              <span className="text-[9px] text-muted-foreground font-medium">+{members.length - 4}</span>
                            </div>
                          )}
                          {members.length === 0 && <span className="text-xs text-muted-foreground">Belum ada anggota</span>}
                        </div>
                        {members.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5">{members.length} Orang</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Team Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={(o) => { setTeamDialogOpen(o); if (!o) resetTeamForm(); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0">
          <div className="p-5 border-b border-border">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <Group className="w-5 h-5 "/> 
                {editTeamId ? "Edit Team" : "Buat Team Baru"}
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* KOLOM KIRI (Info Dasar) */}
              <div className="space-y-4 flex flex-col">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nama Team <span className="text-destructive">*</span></Label>
                  <Input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="cth. Tim Marketing" className="text-xs h-9" />
                </div>
                <div className="space-y-1.5 flex flex-col flex-1">
                  <Label className="text-xs font-semibold">Deskripsi Team</Label>
                  <Textarea 
                    value={newTeamDesc} 
                    onChange={(e) => setNewTeamDesc(e.target.value)} 
                    placeholder="Jelaskan tujuan/misi dari team ini..." 
                    className="text-xs resize-none flex-1 min-h-[120px] md:min-h-[200px]" 
                  />
                </div>
              </div>

              {/* KOLOM KANAN (Admin & Anggota) */}
              <div className="space-y-5">
                {/* Admin Team (multi-select) */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold flex justify-between items-center">
                    <span className="flex items-center gap-1"><Crown className="w-3.5 h-3.5 text-warning" /> Admin Team</span>
                    {newTeamAdmins.length > 0 && <Badge variant="secondary" className="text-[10px]">{newTeamAdmins.length} dipilih</Badge>}
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      placeholder="Cari admin team..."
                      className="text-xs pl-8 h-8 bg-muted/30"
                    />
                  </div>
                  <ScrollArea className="h-[80px] rounded-md border border-border p-1 bg-muted/10">
                    <div className="space-y-0.5">
                      {filteredAdminEmployees.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/60 transition-colors cursor-pointer" onClick={() => toggleAdmin(emp.id)}>
                          <Checkbox
                            checked={newTeamAdmins.includes(emp.id)}
                            onCheckedChange={() => toggleAdmin(emp.id)}
                            className="pointer-events-none"
                          />
                          <Avatar className="w-5 h-5">
                            {emp.avatar && <AvatarImage src={getUploadUrl(emp.avatar)} />}
                            <AvatarFallback className="text-[7px] bg-warning/20 text-warning">{initials(emp.name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-foreground flex-1 truncate">{emp.name}</span>
                          <span className="text-[9px] text-muted-foreground truncate">{emp.position || emp.department}</span>
                        </div>
                      ))}
                      {filteredAdminEmployees.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-6">Karyawan tidak ditemukan</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
                
                {/* Anggota Team */}
                <div className="space-y-2 border-t border-border pt-4">
                  <Label className="text-xs font-semibold flex justify-between items-center">
                    Anggota Team
                    {newTeamMembers.length > 0 && <Badge variant="secondary" className="text-[10px]">{newTeamMembers.length} dipilih</Badge>}
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Cari nama karyawan..."
                      className="text-xs pl-8 h-8 bg-muted/30"
                    />
                  </div>
                  <ScrollArea className="h-[80px] rounded-md border border-border p-1 bg-muted/10">
                    <div className="space-y-0.5">
                      {filteredDialogEmployees.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/60 transition-colors cursor-pointer" onClick={() => toggleMember(emp.id)}>
                          <Checkbox
                            checked={newTeamMembers.includes(emp.id)}
                            onCheckedChange={() => toggleMember(emp.id)}
                            className="pointer-events-none"
                          />
                          <Avatar className="w-6 h-6">
                            {emp.avatar && <AvatarImage src={getUploadUrl(emp.avatar)} />}
                            <AvatarFallback className="text-[8px]">{initials(emp.name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-foreground flex-1 truncate">{emp.name}</span>
                          <span className="text-[9px] text-muted-foreground truncate">{emp.position || emp.department}</span>
                        </div>
                      ))}
                      {filteredDialogEmployees.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-6">Karyawan tidak ditemukan</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
            <Button onClick={handleCreateTeam} className="text-xs h-9 w-full md:w-auto md:px-8">
              {editTeamId ? "Simpan Perubahan" : "Buat Team Baru"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteTeam}
        onOpenChange={(o) => { if (!o) setConfirmDeleteTeam(null); }}
        title="Hapus Team ini?"
        description="Team akan dihapus secara permanen. Tugas yang ada di dalamnya mungkin akan kehilangan referensi."
        variant="destructive"
        confirmText="Ya, Hapus Team"
        onConfirm={() => confirmDeleteTeam && deleteTeam(confirmDeleteTeam)}
      />
    </motion.div>
  );
};

export default Team;
