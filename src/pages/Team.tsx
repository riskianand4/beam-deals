import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/contexts/TaskContext";
import api from "@/lib/api";
import type { TeamGroup } from "@/types";
import { motion } from "framer-motion";
import {
  Users, Search, TrendingUp, Plus, Trash2, Edit2, Crown, Target, AlertTriangle, CheckCircle2,
  Group,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [newTeamLeader, setNewTeamLeader] = useState("");
  const [newTeamMembers, setNewTeamMembers] = useState<string[]>([]);
  const [editTeamId, setEditTeamId] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<string | null>(null);

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

  const initials = (name: string) => name.split(" ").map((n) => n[0]).join("");

  const getTeamTaskCounts = (teamId: string, memberIds: string[]) => {
    const teamTasks = tasks.filter((t) =>
      (t.type === "team" && t.teamId === teamId) || memberIds.includes(t.assigneeId)
    );
    return {
      total: teamTasks.length,
      completed: teamTasks.filter((t) => t.status === "completed").length,
      active: teamTasks.filter((t) => t.status !== "completed").length,
    };
  };

  const allTeamTasks = tasks.filter((t) => teamGroups.some((tg) => (t.type === "team" && t.teamId === tg.id) || tg.memberIds.includes(t.assigneeId)));
  const totalCompleted = allTeamTasks.filter((t) => t.status === "completed").length;
  const avgRate = allTeamTasks.length > 0 ? Math.round((totalCompleted / allTeamTasks.length) * 100) : 0;
  const overdueTasks = allTeamTasks.filter((t) => new Date(t.deadline) < new Date() && t.status !== "completed").length;

  const resetTeamForm = () => {
    setNewTeamName(""); setNewTeamDesc(""); setNewTeamLeader(""); setNewTeamMembers([]); setEditTeamId(null); setMemberSearch("");
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) { toast.error("Nama tim wajib diisi"); return; }
    try {
      if (editTeamId) {
        const updated = await api.updateTeam(editTeamId, { name: newTeamName.trim(), description: newTeamDesc.trim() || undefined, leaderId: newTeamLeader || undefined, memberIds: newTeamMembers });
        setTeamGroups((prev) => prev.map((t) => t.id === editTeamId ? updated : t));
        toast.success("Tim diperbarui");
      } else {
        const created = await api.createTeam({ name: newTeamName.trim(), description: newTeamDesc.trim() || undefined, leaderId: newTeamLeader || undefined, memberIds: newTeamMembers });
        setTeamGroups((prev) => [...prev, created]);
        toast.success("Tim dibuat");
      }
      setTeamDialogOpen(false);
      resetTeamForm();
    } catch { toast.error("Gagal menyimpan tim"); }
  };

  const openEditTeam = (team: TeamGroup) => {
    setEditTeamId(team.id); setNewTeamName(team.name); setNewTeamDesc(team.description || "");
    setNewTeamLeader(team.leaderId || ""); setNewTeamMembers(team.memberIds); setMemberSearch(""); setTeamDialogOpen(true);
  };

  const deleteTeam = async (id: string) => {
    try {
      await api.deleteTeam(id);
      setTeamGroups((prev) => prev.filter((t) => t.id !== id));
      setConfirmDeleteTeam(null);
      toast.success("Tim dihapus");
    } catch { toast.error("Gagal menghapus tim"); }
  };

  const toggleMember = (empId: string) => {
    setNewTeamMembers((prev) => prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]);
  };

  const filteredDialogEmployees = useMemo(() => {
    if (!memberSearch) return employees;
    const q = memberSearch.toLowerCase();
    return employees.filter((e) => e.name.toLowerCase().includes(q));
  }, [employees, memberSearch]);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Users className="w-4 h-4 text-primary" /> Manajemen Tim
        </h1>
        <StatsSkeleton count={3} />
        <CardGridSkeleton count={6} />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Users className="w-4 h-4 text-primary" /> Manajemen Tim
        </h1>
        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { resetTeamForm(); setTeamDialogOpen(true); }}>
          <Plus className="w-3 h-3" /> Buat Tim
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatsCard label="Total Tim" value={teamGroups.length} icon={Users} color="" bgColor="bg-primary" delay={0} />
        <StatsCard label="Rata-rata Penyelesaian" value={avgRate} icon={TrendingUp} color="text-success" bgColor="bg-success/10" delay={1} />
        <StatsCard label="Tugas Terlambat" value={overdueTasks} icon={AlertTriangle} color="text-destructive" bgColor="bg-destructive/10" delay={2} />
      </div>

      {teamGroups.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada tim. Buat tim pertama Anda!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {teamGroups.map((team, i) => {
            const leader = team.leaderId ? employees.find((u) => u.id === team.leaderId) : null;
            const members = team.memberIds.map((id) => employees.find((u) => u.id === id)).filter(Boolean);
            const teamCounts = getTeamTaskCounts(team.id, team.memberIds);
            const teamPct = teamCounts.total > 0 ? Math.round((teamCounts.completed / teamCounts.total) * 100) : 0;

            return (
              <motion.div key={team.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card
                  className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5"
                  onClick={() => navigate(`/team/${team.id}`)}
                >
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm flex items-center gap-1.5">
                        <Group className="w-3.5 h-3.5 " />
                        {team.name}
                      </CardTitle>
                      <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => openEditTeam(team)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="w-6 h-6 text-destructive" onClick={() => setConfirmDeleteTeam(team.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    {team.description && <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{team.description}</p>}
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {leader && (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-[8px] bg-warning/10 text-warning font-medium">{initials(leader.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] text-foreground font-medium">{leader.name}</span>
                        <Badge className=" text-[7px]">Ketua</Badge>
                      </div>
                    )}
                    <div className="flex items-center">
                      <div className="flex -space-x-2">
                        {members.slice(0, 4).map((m) => m && (
                          <Avatar key={m.id} className="w-7 h-7 border-2 border-card">
                            <AvatarFallback className="text-[8px] bg-primary  font-medium">{initials(m.name)}</AvatarFallback>
                          </Avatar>
                        ))}
                        {members.length > 4 && (
                          <div className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                            <span className="text-[8px] text-muted-foreground font-medium">+{members.length - 4}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground ml-2">{members.length} anggota</span>
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
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">{editTeamId ? "Edit Tim" : "Buat Tim Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 ">
            <div className="space-y-1">
              <Label className="text-xs">Nama Tim</Label>
              <Input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="cth. Tim NOC" className="text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Deskripsi Tim</Label>
              <Textarea value={newTeamDesc} onChange={(e) => setNewTeamDesc(e.target.value)} placeholder="Jelaskan tujuan/misi tim ini..." className="text-xs min-h-[60px] resize-none" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ketua Tim</Label>
              <Select value={newTeamLeader} onValueChange={setNewTeamLeader}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Pilih ketua tim" />
                </SelectTrigger>
                <SelectContent className="max-h-64" >
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} className="text-xs">
                      {emp.name} — {emp.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Anggota Tim</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Cari nama karyawan..."
                  className="text-xs pl-8 h-8"
                />
              </div>
              {newTeamMembers.length > 0 && (
                <p className="text-[10px] text-muted-foreground">{newTeamMembers.length} anggota dipilih</p>
              )}
              <ScrollArea className="max-h-[130px] overflow-y-auto">
                <div className="space-y-0.5 pr-3">
                  {filteredDialogEmployees.map((emp) => (
                    <div key={emp.id} className="flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-muted/50 transition-colors">
                      <Checkbox
                        checked={newTeamMembers.includes(emp.id)}
                        onCheckedChange={() => toggleMember(emp.id)}
                      />
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="text-[7px] bg-primary/10 text-primary">{initials(emp.name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-foreground flex-1 truncate">{emp.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{emp.department}</span>
                    </div>
                  ))}
                  {filteredDialogEmployees.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Tidak ditemukan</p>
                  )}
                </div>
              </ScrollArea>
            </div>
            <Button onClick={handleCreateTeam} className="w-full text-xs">
              {editTeamId ? "Simpan Perubahan" : "Buat Tim"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteTeam}
        onOpenChange={(o) => { if (!o) setConfirmDeleteTeam(null); }}
        title="Hapus tim ini?"
        description="Tim akan dihapus secara permanen."
        variant="destructive"
        confirmText="Hapus"
        onConfirm={() => confirmDeleteTeam && deleteTeam(confirmDeleteTeam)}
      />
    </motion.div>
  );
};

export default Team;
