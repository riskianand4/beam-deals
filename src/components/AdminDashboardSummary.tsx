import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/contexts/TaskContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Receipt, Wallet, FileText, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getUploadUrl } from "@/lib/api";
import api from "@/lib/api";
import type { Reimbursement, CashAdvance, PayslipData, TeamGroup } from "@/types";

const AdminDashboardSummary = () => {
  const { isAdmin, users } = useAuth();
  const { tasks } = useTasks();
  const navigate = useNavigate();
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [cashAdvances, setCashAdvances] = useState<CashAdvance[]>([]);
  const [payslips, setPayslips] = useState<PayslipData[]>([]);
  const [teams, setTeams] = useState<TeamGroup[]>([]);
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [showAllTeams, setShowAllTeams] = useState(false);

  const employees = users.filter((u) => u.role === "employee");

  useEffect(() => {
    if (!isAdmin) return;
    api.getReimbursements().then(setReimbursements).catch(() => {});
    api.getCashAdvances().then(setCashAdvances).catch(() => {});
    api.getPayslips().then(setPayslips).catch(() => {});
    api.getTeams().then(setTeams).catch(() => {});
  }, [isAdmin]);

  if (!isAdmin) return null;

  const employeeSummaries = employees.map((emp) => {
    const empTasks = tasks.filter((t) => t.assigneeId === emp.id);
    const pendingTasks = empTasks.filter((t) => t.status === "todo" || t.status === "in-progress").length;
    const completedTasks = empTasks.filter((t) => t.status === "completed").length;
    const totalTasks = empTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const pendingReimbursements = reimbursements.filter((r) => r.userId === emp.id && r.status === "pending").length;
    const pendingCashAdv = cashAdvances.filter((c) => c.userId === emp.id && c.status === "pending").length;
    const totalPendingFinance = pendingReimbursements + pendingCashAdv;
    const payslipCount = payslips.filter((p) => p.userId === emp.id).length;
    return { ...emp, pendingTasks, completedTasks, totalTasks, completionRate, totalPendingFinance, payslipCount };
  });

  const teamSummaries = teams.map((team) => {
    const memberIds = team.memberIds || [];
    const teamTasks = tasks.filter((t) => memberIds.includes(t.assigneeId));
    const completedTasks = teamTasks.filter((t) => t.status === "completed").length;
    const totalTasks = teamTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const leader = users.find((u) => u.id === team.leaderId);
    return { ...team, completionRate, totalTasks, completedTasks, memberCount: memberIds.length, leaderName: leader?.name || "-" };
  });

  const totalPendingFinance = employeeSummaries.reduce((sum, e) => sum + e.totalPendingFinance, 0);
  const totalPendingTasks = employeeSummaries.reduce((sum, e) => sum + e.pendingTasks, 0);
  const totalPayslips = employeeSummaries.reduce((sum, e) => sum + e.payslipCount, 0);

  const overviewStats = [
    { label: "Karyawan", value: employees.length, icon: Users, color: "text-muted-foreground bg-muted" },
    { label: "Tugas Aktif", value: totalPendingTasks, icon: AlertCircle, color: "text-warning bg-warning/10" },
    { label: "Keuangan Pending", value: totalPendingFinance, icon: Receipt, color: totalPendingFinance > 0 ? "text-destructive bg-destructive/10" : "text-success bg-success/10" },
    { label: "Total Slip Gaji", value: totalPayslips, icon: FileText, color: "text-muted-foreground bg-muted" },
  ];

  const visibleEmployees = showAllEmployees ? employeeSummaries : employeeSummaries.slice(0, 1);
  const visibleTeams = showAllTeams ? teamSummaries : teamSummaries.slice(0, 1);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="ms-card p-4 space-y-4">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ringkasan Admin</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {overviewStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${stat.color}`}><Icon className="w-4 h-4" /></div>
              <div><p className="text-lg font-bold text-foreground leading-none">{stat.value}</p><p className="text-[10px] text-muted-foreground">{stat.label}</p></div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3 className="text-[11px] font-medium text-muted-foreground">Karyawan</h3>
          {visibleEmployees.map((emp) => {
            const initials = emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
            return (
              <div key={emp.id} className="p-3 rounded-lg border border-border space-y-2 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate(`/tasks/${emp.id}`)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-7 h-7">
                      {emp.avatar && <AvatarImage src={getUploadUrl(emp.avatar)} alt={emp.name} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div><p className="text-xs font-medium text-foreground">{emp.name}</p><p className="text-[10px] text-muted-foreground">{emp.position}</p></div>
                  </div>
                  <div className="text-right"><p className="text-[10px] text-muted-foreground">{emp.completionRate}% selesai</p></div>
                </div>
                <Progress value={emp.completionRate} className="h-1.5" />
                <div className="flex gap-4 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-warning" /> {emp.pendingTasks} tugas aktif</span>
                  <span className="flex items-center gap-1"><Wallet className="w-3 h-3 text-primary" /> {emp.totalPendingFinance} keuangan</span>
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {emp.payslipCount} slip</span>
                </div>
              </div>
            );
          })}
          {employeeSummaries.length > 1 && (
            <Button variant="ghost" size="sm" className="w-full text-[10px] h-7 gap-1 text-muted-foreground" onClick={() => setShowAllEmployees(!showAllEmployees)}>
              {showAllEmployees ? <><ChevronUp className="w-3 h-3" /> Sembunyikan</> : <><ChevronDown className="w-3 h-3" /> Selengkapnya ({employeeSummaries.length - 1} lainnya)</>}
            </Button>
          )}
        </div>

        {/* Per Tim */}
        <div className="space-y-2">
          <h3 className="text-[11px] font-medium text-muted-foreground">Team</h3>
          {visibleTeams.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Belum ada team</p>
          ) : visibleTeams.map((team) => (
            <div key={team.id} className="p-3 rounded-lg border border-border space-y-2 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate(`/team`)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">{team.name}</p>
                  <p className="text-[10px] text-muted-foreground">Ketua: {team.leaderName}</p>
                </div>
                <div className="text-right"><p className="text-[10px] text-muted-foreground">{team.completionRate}% selesai</p></div>
              </div>
              <Progress value={team.completionRate} className="h-1.5" />
              <div className="flex gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {team.memberCount} anggota</span>
                <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-warning" /> {team.totalTasks - team.completedTasks} tugas aktif</span>
              </div>
            </div>
          ))}
          {teamSummaries.length > 1 && (
            <Button variant="ghost" size="sm" className="w-full text-[10px] h-7 gap-1 text-muted-foreground" onClick={() => setShowAllTeams(!showAllTeams)}>
              {showAllTeams ? <><ChevronUp className="w-3 h-3" /> Sembunyikan</> : <><ChevronDown className="w-3 h-3" /> Selengkapnya ({teamSummaries.length - 1} lainnya)</>}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AdminDashboardSummary;
