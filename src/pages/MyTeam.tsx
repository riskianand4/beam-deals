import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/contexts/TaskContext";
import api from "@/lib/api";
import type { TeamGroup, User } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Crown,
  Group,
  UserCircle,
  Users,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CardGridSkeleton } from "@/components/PageSkeleton";

const MyTeam = () => {
  const { user, users: allUsers } = useAuth();
  const navigate = useNavigate();
  const { tasks } = useTasks();
  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk menyimpan ID tim yang sedang dibuka (Accordion)
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      const data = await api.getTeams();
      setTeamGroups(data);
    } catch (err) {
      console.error("Failed to load teams:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const myTeams = useMemo(
    () => teamGroups.filter((t) => user && t.memberIds.includes(user.id)),
    [teamGroups, user],
  );

  // Otomatis buka accordion jika user hanya tergabung di 1 tim
  useEffect(() => {
    if (myTeams.length === 1 && !expandedTeamId) {
      setExpandedTeamId(myTeams[0].id);
    }
  }, [myTeams, expandedTeamId]);

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

  const getTaskCounts = (teamId: string) => {
    const teamTasks = tasks.filter(
      (t) => t.type === "team" && t.teamId === teamId
    );
    return {
      total: teamTasks.length,
      completed: teamTasks.filter((t) => t.status === "completed").length,
    };
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Users className="w-4 h-4 text-primary" /> Tim Saya
        </h1>
        <CardGridSkeleton count={2} cols={1} />
      </motion.div>
    );
  }

  if (myTeams.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Belum Tergabung dalam Tim
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kamu belum ditambahkan ke tim manapun. Hubungi admin untuk info lebih lanjut.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
        <Users className="w-4 h-4 " /> Tim Saya
      </h1>

      {myTeams.map((team, ti) => {
        const leader = team.leaderId ? allUsers.find((u) => u.id === team.leaderId) : null;
        const members = team.memberIds.map((id) => allUsers.find((u) => u.id === id)).filter(Boolean) as User[];
        const counts = getTaskCounts(team.id);
        const teamTasks = tasks.filter((t) => t.type === "team" && t.teamId === team.id);
        
        const isExpanded = expandedTeamId === team.id;

        return (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ti * 0.1 }}
            className={`border rounded-xl transition-colors ${
              isExpanded ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/30"
            }`}
          >
            {/* Header Tim (Klik untuk expand/collapse) */}
            <div
              onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
              className="p-4 flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isExpanded ? "bg-primary text-primary-foreground" : " group-hover:bg-primary/20"}`}>
                  <Group className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    {team.name}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span>{members.length} Anggota</span>
                    <span>•</span>
                    <span>{counts.total} Tugas</span>
                    {counts.total > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-success">{counts.completed} Selesai</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              
              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className={`w-5 h-5 ${isExpanded ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
              </motion.div>
            </div>

            {/* Konten Expand (Leader, Anggota, Tugas) */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-1 space-y-6">
                    {team.description && (
                      <p className="text-sm text-muted-foreground bg-background p-3 rounded-lg border border-border/50">
                        {team.description}
                      </p>
                    )}

                    {/* Leader */}
                    {leader && (
                      <Card className="bg-background shadow-none border-border/50">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="w-10 h-10 ring-2 ring-warning/30">
                                <AvatarFallback className="bg-warning/10 text-warning font-semibold text-sm">
                                  {initials(leader.name)}
                                </AvatarFallback>
                              </Avatar>
                              <Crown className="w-3.5 h-3.5 text-warning absolute -top-1 -right-1" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                {leader.name}
                                <Badge variant="outline" className="text-[9px] border-warning/30 text-warning px-1.5 py-0">
                                  Ketua
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                {leader.position} — {leader.department}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Members */}
                    <div>
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <UserCircle className="w-3.5 h-3.5 text-muted-foreground" />
                        Anggota Tim
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                        {members.map((member) => {
                          if (!member) return null;
                          const isLeader = team.leaderId === member.id;
                          return (
                            <div key={member.id} className="bg-background border border-border/50 rounded-lg p-2.5 flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className={`text-[10px] font-medium ${isLeader ? "bg-warning/10 text-warning" : "bg-primary"}`}>
                                  {initials(member.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate flex items-center gap-1">
                                  {member.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {member.position}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Team Tasks */}
                    <div>
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                        Tugas Tim Terkini
                      </h3>
                      {teamTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6 bg-background rounded-lg border border-dashed border-border">
                          Tidak ada tugas aktif saat ini untuk tim ini.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-3">
                          {teamTasks.map((task) => {
                            const assignee = allUsers.find((u) => u.id === task.assigneeId);

                            const statusConfig = {
                              "completed": { color: "bg-success", text: "Selesai" },
                              "in-progress": { color: "bg-primary", text: "Dikerjakan" },
                              "needs-review": { color: "bg-warning", text: "Review" },
                              "todo": { color: "bg-muted-foreground", text: "Menunggu" },
                            }[task.status] || { color: "bg-muted-foreground", text: "Unknown" };

                            const priorityConfig = {
                              "high": { classes: "bg-destructive/10 text-destructive border-destructive/20", label: "Tinggi" },
                              "medium": { classes: "bg-warning/10 text-warning border-warning/20", label: "Sedang" },
                              "low": { classes: "bg-muted/50 text-muted-foreground border-border", label: "Rendah" },
                            }[task.priority] || { classes: "bg-muted text-muted-foreground border-border", label: "-" };

                            return (
                              <div
                                key={task.id}
                                onClick={() => navigate(`/tasks?tab=team&teamId=${team.id}`)}
                                className="relative overflow-hidden p-3 flex items-center gap-3.5 transition-all hover:shadow-md hover:border-primary/40 cursor-pointer group bg-background border border-border/60 rounded-xl"
                              >
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusConfig.color}`} />

                                <div className="flex-1 min-w-0 py-0.5">
                                  <p className="text-sm font-medium text-foreground truncate transition-colors ">
                                    {task.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.color}`} />
                                      {statusConfig.text}
                                    </span>
                                  </div>
                                </div>

                                <Badge
                                  variant="outline"
                                  className={`text-[9px] shrink-0 font-medium px-2 py-0.5 border ${priorityConfig.classes}`}
                                >
                                  {priorityConfig.label}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default MyTeam;