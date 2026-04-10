import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getUploadUrl } from "@/lib/api";
import { ArrowLeft, LayoutGrid, List } from "lucide-react";
import { motion } from "framer-motion";

interface EmployeeGridProps {
  basePath: string;
  badgeCounts?: Record<string, number>;
}

const EmployeeGrid = ({ basePath, badgeCounts }: EmployeeGridProps) => {
  const navigate = useNavigate();
  const { users } = useAuth();
  const employees = users.filter((u) => u.role === "employee");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Pilih karyawan untuk mengelola data</p>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {employees.map((emp, i) => {
            const initials = emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
            const badge = badgeCounts?.[emp.id] ?? 0;
            return (
              <motion.div key={emp.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => navigate(`${basePath}/${emp.id}`)} className="ms-card-hover p-6 flex flex-col items-center gap-3 cursor-pointer text-center">
                <div className="relative">
                  <Avatar className="w-16 h-16">{emp.avatar && <AvatarImage src={emp.avatar} alt={emp.name} />}<AvatarFallback className="bg-primary text-xl font-semibold">{initials}</AvatarFallback></Avatar>
                  {badge > 0 && (<span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm">{badge}</span>)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{emp.name}</p>
                  <p className="text-[11px] text-muted-foreground">{emp.position}</p>
                  <p className="text-[10px] text-muted-foreground">{emp.department}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          {employees.map((emp, i) => {
            const initials = emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
            const badge = badgeCounts?.[emp.id] ?? 0;
            return (
              <motion.div key={emp.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} onClick={() => navigate(`${basePath}/${emp.id}`)} className="ms-card-hover flex items-center gap-3 p-3 cursor-pointer">
                <div className="relative shrink-0">
                  <Avatar className="w-14 h-14">{emp.avatar && <AvatarImage src={emp.avatar} alt={emp.name} />}<AvatarFallback className="bg-primary text-white dark:text-muted-foreground text-sm font-semibold">{initials}</AvatarFallback></Avatar>
                  {badge > 0 && (<span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-destructive text-destructive-foreground rounded-full text-[9px] font-bold flex items-center justify-center shadow-sm">{badge}</span>)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{emp.position} · {emp.department}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const EmployeeHeader = ({ employeeId, backPath }: { employeeId: string; backPath: string }) => {
  const navigate = useNavigate();
  const { users } = useAuth();
  const emp = users.find((u) => u.id === employeeId);
  if (!emp) return null;
  const initials = emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <div className="flex items-center gap-3 mb-4">
      <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" onClick={() => navigate(backPath)}><ArrowLeft className="w-4 h-4" /></Button>
      <Avatar className="w-10 h-10">{emp.avatar && <AvatarImage src={emp.avatar} alt={emp.name} />}<AvatarFallback className="bg-primary font-semibold">{initials}</AvatarFallback></Avatar>
      <div>
        <p className="text-sm font-medium text-foreground">{emp.name}</p>
        <p className="text-[11px] text-muted-foreground">{emp.position} · {emp.department}</p>
      </div>
    </div>
  );
};

export default EmployeeGrid;