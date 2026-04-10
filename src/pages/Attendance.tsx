import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMenuSettings } from "@/contexts/MenuSettingsContext";
import api from "@/lib/api";
import type {
  AttendanceRecord,
  AttendanceStatus,
  ExcludedEmployee,
  User,
} from "@/types";
import { motion } from "framer-motion";
import { Settings, User as UserIcon } from "lucide-react";
import {
  Calendar,
  Clock,
  DollarSign,
  Download,
  Edit,
  FileText,
  Filter,
  Plus,
  Search,
  ShieldOff,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ConfirmDialog";

const STATUS_BADGE: Record<string, string> = {
  present: "bg-success/10 text-success border-success/20",
  late: "bg-warning/10 text-warning border-warning/20",
  absent: "bg-destructive/10 text-destructive border-destructive/20",
  leave: "bg-primary/10  border-primary/20",
  sakit: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  izin: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "---": "bg-muted text-muted-foreground border-border",
  clock_in: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  clock_out: "bg-violet-500/10 text-violet-600 border-violet-500/20",
};
const STATUS_LABEL: Record<string, string> = {
  present: "Hadir",
  late: "Terlambat",
  absent: "Alpa",
  leave: "Cuti/Izin",
  sakit: "Sakit",
  izin: "Izin",
  "---": "---",
  clock_in: "Clock In",
  clock_out: "Clock Out",
};

// Locations used by webhook

const apiBase = import.meta.env.VITE_API_URL || "";

const Attendance = () => {
  const { user, isAdmin, users } = useAuth();
  const { hasAccess } = useMenuSettings();
  const canManage = isAdmin || hasAccess("attendance");
  const [viewMode, setViewMode] = useState<"admin" | "pribadi">("admin");

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [excludedEmployees, setExcludedEmployees] = useState<
    ExcludedEmployee[]
  >([]);
  const [justificationSuggestions, setJustificationSuggestions] = useState<
    string[]
  >([]);
  const [holidays, setHolidays] = useState<
    Array<{ id: string; date: string; description: string }>
  >([]);
  const [absentSalary, setAbsentSalary] = useState<
    { days: number; total: number } | null
  >(null);
  const [filterOffice, setFilterOffice] = useState("all");
  const [customStatuses, setCustomStatuses] = useState<Array<{ id: string; name: string; label: string; isDefault: boolean }>>([]);
  const [manageStatusOpen, setManageStatusOpen] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusLabel, setNewStatusLabel] = useState("");
  const [confirmDeleteStatusId, setConfirmDeleteStatusId] = useState<string | null>(null);

  const [filterDate, setFilterDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const formatTanggalIndo = (dateStr: string) => {
    if (!dateStr) return "";
    return format(new Date(dateStr), "d MMMM yyyy", { locale: id });
  };
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "yyyy-MM"));
  const [searchName, setSearchName] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Holiday form
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayDesc, setNewHolidayDesc] = useState("");
  const [confirmDeleteHolidayId, setConfirmDeleteHolidayId] = useState<
    string | null
  >(null);

  const importRef = useRef<HTMLInputElement>(null);
  const [editRecord, setEditRecord] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    status: "present" as string,
    clockIn: "",
    clockOut: "",
    location: "",
    justification: "",
    justificationPermanent: false,
    reason: "",
  });
  const [editProofFile, setEditProofFile] = useState<File | null>(null);
  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);

  // Excluded employee form
  const [excludeSearch, setExcludeSearch] = useState("");
  const [excludeUserId, setExcludeUserId] = useState("");
  const [excludeDesc, setExcludeDesc] = useState("");

  // Delete attendance
  const [confirmDeleteAttId, setConfirmDeleteAttId] = useState<string | null>(
    null,
  );

  // Export PDF loading
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const employees = useMemo(() => users.filter((u) => u.role === "employee"), [
    users,
  ]);
  const excludedUserIds = useMemo(
    () => new Set(excludedEmployees.map((e) => e.userId)),
    [excludedEmployees],
  );
  const countableEmployees = useMemo(
    () => employees.filter((e) => !excludedUserIds.has(e.id)),
    [employees, excludedUserIds],
  );

  const getMatchedUser = (record: AttendanceRecord): User | undefined => {
    let foundUser = users.find((u) => u.id === record.userId);
    if (!foundUser && record.userName) {
      foundUser = users.find((u) =>
        u.name.toLowerCase() === record.userName?.toLowerCase()
      );
    }
    return foundUser;
  };

  const getStatusLabel = (status: string) => {
    const custom = customStatuses.find(s => s.name === status);
    if (custom) return custom.label;
    return STATUS_LABEL[status] || status;
  };

  const getAttendanceName = (record: AttendanceRecord) => {
    const foundUser = getMatchedUser(record);
    if (foundUser) return foundUser.name;
    if (record.userName) return record.userName;
    return record.userId;
  };

  useEffect(() => {
    const params: Record<string, string> = {};
    if (!canManage && user) {
      params.userName = user.name;
    }
    if (filterMonth) {
      const [y, m] = filterMonth.split("-");
      params.startDate = `${y}-${m}-01`;
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      params.endDate = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
    }
    api.getAttendance(params).then(setAttendance).catch(() => {});
  }, [canManage, user, filterMonth]);

  useEffect(() => {
    api.getAttendanceStatuses().then(setCustomStatuses).catch(() => {});
    if (canManage) {
      api.getExcludedEmployees().then(setExcludedEmployees).catch(() => {});
      api.getJustificationSuggestions().then(setJustificationSuggestions).catch(
        () => {},
      );
      api.getHolidays().then(setHolidays).catch(() => {});
    }
    // Fetch holidays for employee view too
    if (!canManage) {
      api.getHolidays().then(setHolidays).catch(() => {});
    }
  }, [canManage]);

  // Fetch absent salary for employee
  useEffect(() => {
    if (!canManage && user) {
      api.getAbsentSalary(user.id).then(setAbsentSalary).catch(() => {});
    }
  }, [canManage, user]);

  const exportCSV = () => {
    const header = "Tanggal,Karyawan,Masuk,Keluar,Status,Justifikasi,Lokasi\n";
    const rows = mergedRecords.map((a) => {
      return `${a.date},${a.employeeName},${a.clockIn || "-"},${
        a.clockOut || "-"
      },${getStatusLabel(a.status)},${a.justification || "-"},${
        a.location || "-"
      }`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kehadiran_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Data kehadiran diekspor");
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const result = await api.importAttendance(formData);
      toast.success(`${result.imported} data berhasil diimport`);
      api.getAttendance({}).then(setAttendance);
    } catch {
      toast.error("Gagal import CSV");
    }
    if (importRef.current) importRef.current.value = "";
  };

  const handleEditSave = async () => {
    if (!editRecord) return;
    try {
      if (editProofFile && editRecord.id) {
        const formData = new FormData();
        formData.append("proof", editProofFile);
        await api.uploadAttendanceProof(editRecord.id, formData);
      }

      if (editRecord.id) {
        // Update existing record
        const updated = await api.updateAttendance(editRecord.id, {
          status: editForm.status as AttendanceStatus,
          clockIn: editForm.clockIn || null,
          clockOut: editForm.clockOut || null,
          location: editForm.location,
          justification: editForm.justification,
          justificationPermanent: editForm.justificationPermanent,
          reason: editForm.reason,
        });
        setAttendance((prev) =>
          prev.map((a) => a.id === editRecord.id ? { ...a, ...updated } : a)
        );
      } else {
        // Create new record for employee without attendance
        const record = await api.createAttendance({
          userId: editRecord.userId,
          userName: editRecord.employeeName,
          date: filterDate || format(new Date(), "yyyy-MM-dd"),
          status: editForm.status as AttendanceStatus,
          clockIn: editForm.clockIn || null,
          clockOut: editForm.clockOut || null,
          location: editForm.location,
          justification: editForm.justification,
          justificationPermanent: editForm.justificationPermanent,
          reason: editForm.reason,
        });
        setAttendance((prev) => [...prev, record]);
      }
      setEditRecord(null);
      setEditProofFile(null);
      toast.success("Data diperbarui");
    } catch {
      toast.error("Gagal memperbarui data");
    }
  };

  // Merge all employees with attendance records for the selected date
  const holidayDates = useMemo(() => new Set(holidays.map((h) => h.date)), [
    holidays,
  ]);

  const mergedRecords = useMemo(() => {
    const targetDate = filterDate || format(new Date(), "yyyy-MM-dd");
    const dateRecords = attendance.filter((a) => a.date === targetDate);
    const currentHour = new Date().getHours();
    const isAfter18 = currentHour >= 18;
    const isToday = targetDate === format(new Date(), "yyyy-MM-dd");

    // Check if target date is weekend or holiday
    const dayOfWeek = new Date(targetDate + "T00:00:00").getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayDates.has(targetDate);
    const isDayOff = isWeekend || isHoliday;

    const result: Array<{
      id: string | null;
      userId: string;
      employeeName: string;
      position: string;
      date: string;
      clockIn: string | null;
      clockOut: string | null;
      status: string;
      location: string;
      justification: string;
      justificationPermanent: boolean;
      reason: string;
      proofImage: string;
      source: string;
    }> = [];

    for (const emp of countableEmployees) {
      const record = dateRecords.find((r) => {
        const matched = getMatchedUser(r);
        return matched?.id === emp.id;
      });

      if (record) {
        result.push({
          id: record.id,
          userId: emp.id,
          employeeName: emp.name,
          position: emp.position || "",
          date: record.date,
          clockIn: record.clockIn,
          clockOut: record.clockOut,
          status: record.status,
          location: record.location || emp.office || "",
          justification: (record as any).justification || "",
          justificationPermanent: (record as any).justificationPermanent ||
            false,
          reason: record.reason || "",
          proofImage: record.proofImage || "",
          source: record.source || "manual",
        });
      } else {
        // No record — if weekend/holiday → "---", else check if past day → "absent"
        const autoStatus = isDayOff ? "---" : ((isToday && isAfter18) ||
            (!isToday && targetDate < format(new Date(), "yyyy-MM-dd")))
          ? "absent"
          : "---";
        result.push({
          id: null,
          userId: emp.id,
          employeeName: emp.name,
          position: emp.position || "",
          date: targetDate,
          clockIn: null,
          clockOut: null,
          status: autoStatus,
          location: emp.office || "",
          justification: "",
          justificationPermanent: false,
          reason: "",
          proofImage: "",
          source: "",
        });
      }
    }

    return result;
  }, [attendance, countableEmployees, filterDate, holidayDates]);

  // Apply filters
  const filteredRecords = useMemo(() => {
    let data = mergedRecords;
    if (searchName) {
      const q = searchName.toLowerCase();
      data = data.filter((a) => a.employeeName.toLowerCase().includes(q));
    }
    if (filterOffice !== "all") {
      data = data.filter((a) => a.location === filterOffice);
    }
    if (filterStatus === "hadir") {
      data = data.filter((a) => a.status === "present" || a.status === "late");
    } else if (filterStatus === "terlambat") {
      data = data.filter((a) => a.status === "late");
    } else if (filterStatus === "tidak_datang") {
      data = data.filter((a) =>
        ["izin", "sakit", "---", "absent"].includes(a.status)
      );
    }
    return data;
  }, [mergedRecords, searchName, filterStatus, filterOffice]);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayMerged = useMemo(() => {
    const todayRecords = attendance.filter((a) => a.date === todayStr);
    let present = 0, late = 0;
    for (const r of todayRecords) {
      if (r.status === "present") present++;
      if (r.status === "late") late++;
    }
    const absent = Math.max(
      0,
      countableEmployees.length - todayRecords.filter((a) => {
        const matched = getMatchedUser(a);
        return matched && !excludedUserIds.has(matched.id);
      }).length,
    );
    return { present, late, absent };
  }, [attendance, countableEmployees, todayStr, excludedUserIds]);

  const handleAddExcluded = async () => {
    if (!excludeUserId) return;
    const emp = employees.find((e) => e.id === excludeUserId);
    try {
      const result = await api.addExcludedEmployee({
        userId: excludeUserId,
        userName: emp?.name || "",
        description: excludeDesc,
      });
      setExcludedEmployees([result, ...excludedEmployees]);
      setExcludeUserId("");
      setExcludeDesc("");
      toast.success("Karyawan ditambahkan ke daftar tidak dihitung");
    } catch (err: any) {
      toast.error(err.message || "Gagal menambahkan");
    }
  };

  const handleRemoveExcluded = async (id: string) => {
    try {
      await api.removeExcludedEmployee(id);
      setExcludedEmployees(excludedEmployees.filter((e) => e.id !== id));
      toast.success("Berhasil dihapus dari daftar");
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  // Employee filtered attendance (must be before conditional return)
  const filteredAttendance = useMemo(() => {
    let data = attendance;
    if (filterDate) data = data.filter((a) => a.date === filterDate);
    if (searchName) {
      const q = searchName.toLowerCase();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      data = data.filter((a) => getAttendanceName(a).toLowerCase().includes(q));
    }
    return data;
  }, [attendance, filterDate, searchName]);

  const handleDeleteAttendance = async () => {
    if (!confirmDeleteAttId) return;
    try {
      await api.deleteAttendance(confirmDeleteAttId);
      setAttendance((prev) => prev.filter((a) => a.id !== confirmDeleteAttId));
      setConfirmDeleteAttId(null);
      toast.success("Data kehadiran berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus data kehadiran");
    }
  };

  const openEditDialog = (record: any) => {
    setEditRecord(record);
    setEditForm({
      status: record.status,
      clockIn: record.clockIn || "",
      clockOut: record.clockOut || "",
      location: record.location || "",
      justification: record.justification || "",
      justificationPermanent: record.justificationPermanent || false,
      reason: record.reason || "",
    });
    setEditProofFile(null);
  };

  const handleAddHoliday = async () => {
    if (!newHolidayDate) return;
    try {
      const result = await api.createHoliday({
        date: newHolidayDate,
        description: newHolidayDesc,
      });
      setHolidays([...holidays, result]);
      setNewHolidayDate("");
      setNewHolidayDesc("");
      toast.success("Hari libur berhasil ditambahkan");
    } catch (err: any) {
      toast.error(err.message || "Gagal menambahkan hari libur");
    }
  };

  const handleDeleteHoliday = async () => {
    if (!confirmDeleteHolidayId) return;
    try {
      await api.deleteHoliday(confirmDeleteHolidayId);
      setHolidays(holidays.filter((h) => h.id !== confirmDeleteHolidayId));
      setConfirmDeleteHolidayId(null);
      toast.success("Hari libur berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus hari libur");
    }
  };

  // ========= ADMIN VIEW =========
  if (canManage && viewMode === "pribadi" && !isAdmin && user) {
    // Employee with access viewing personal attendance
    const myAttendance = attendance.filter(a => {
      const matched = getMatchedUser(a);
      return matched?.id === user.id || a.userName?.toLowerCase() === user.name.toLowerCase();
    });
    const filteredMyAtt = filterDate ? myAttendance.filter(a => a.date === filterDate) : myAttendance;

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Kehadiran
          </h1>
        </div>
        <TooltipProvider>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "admin" | "pribadi")}>
            <TabsList className="grid w-full max-w-[200px] grid-cols-2">
              <TabsTrigger value="admin" className="px-3 h-7 gap-1.5">
                <Users className="w-3.5 h-3.5" /><span className="text-xs">Team</span>
              </TabsTrigger>
              <TabsTrigger value="pribadi" className="px-3 h-7 gap-1.5">
                <UserIcon className="w-3.5 h-3.5" /><span className="text-xs">Pribadi</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </TooltipProvider>
        {absentSalary && (
          <div className="ms-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Rp {absentSalary.total.toLocaleString("id-ID")}</p>
              <p className="text-[10px] text-muted-foreground">Uang Kehadiran ({absentSalary.days} hari × Rp 50.000)</p>
            </div>
          </div>
        )}
        <div className="ms-card p-3 flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="text-xs h-8 px-2 rounded-md border border-input bg-background" />
          <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="text-xs h-8 px-2 rounded-md border border-input bg-background" />
        </div>
        <div className="ms-card p-4">
          <h2 className="text-xs font-semibold text-foreground mb-3">Riwayat Kehadiran Pribadi</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-2 px-2 font-medium w-10">No</th>
                <th className="text-left py-2 px-2 font-medium">Tanggal</th>
                <th className="text-left py-2 px-2 font-medium">Masuk</th>
                <th className="text-left py-2 px-2 font-medium">Pulang</th>
                <th className="text-left py-2 px-2 font-medium">Status</th>
                <th className="text-left py-2 px-2 font-medium">Pendapatan</th>
              </tr></thead>
              <tbody>
                {filteredMyAtt.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada data</td></tr>
                ) : filteredMyAtt.map((a, i) => (
                  <tr key={a.id} className={`border-b border-border/50 hover:bg-muted/30 ${i % 2 ? "bg-muted/10" : ""}`}>
                    <td className="py-2 px-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-2">{a.date}</td>
                    <td className="py-2 px-2">{a.clockIn || "-"}</td>
                    <td className="py-2 px-2">{a.clockOut || "-"}</td>
                    <td className="py-2 px-2"><span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[a.status] || STATUS_BADGE["---"]}`}>{getStatusLabel(a.status)}</span></td>
                    <td className="py-2 px-2 text-[10px]">{(a.clockIn && a.clockOut && (a.status === "present" || a.status === "late")) ? <span className="text-success font-medium">Rp 50.000</span> : <span className="text-muted-foreground">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    );
  }

  if (canManage) {
    // Fetch absent salary for personal tab
    if (!isAdmin && user && !absentSalary) {
      api.getAbsentSalary(user.id).then(setAbsentSalary).catch(() => {});
    }
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Kehadiran
          </h1>
          <div className="flex gap-2">
            {isAdmin && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="outline" className="w-8 h-8" onClick={() => setManageStatusOpen(true)}>
                      <Settings className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Kelola Status</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <input
              type="file"
              ref={importRef}
              accept=".csv"
              className="hidden"
              onChange={handleImportCSV}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="w-8 h-8"
                    onClick={() => importRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Import CSV</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="w-8 h-8"
                    onClick={exportCSV}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export CSV</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="w-8 h-8"
                    onClick={async () => {
                      setExportLoading(true);
                      try {
                        const exportRecords = filteredRecords.map((r) => ({
                          employeeName: r.employeeName,
                          position: r.position,
                          clockIn: r.clockIn,
                          clockOut: r.clockOut,
                          status: r.status,
                          location: r.location,
                          justification: r.justification,
                        })).sort((a, b) =>
                          a.employeeName.localeCompare(b.employeeName)
                        ); 

                        const dateLabel = filterDate || filterMonth ||
                          format(new Date(), "yyyy-MM-dd");

                        let pdfDateTitle = dateLabel;
                        if (filterDate) {
                          pdfDateTitle = formatTanggalIndo(filterDate);
                        } else if (filterMonth) {
                          pdfDateTitle = format(
                            new Date(filterMonth + "-01"),
                            "MMMM yyyy",
                            { locale: id },
                          );
                        } else {
                          pdfDateTitle = formatTanggalIndo(
                            format(new Date(), "yyyy-MM-dd"),
                          );
                        }

                        const blob = await api.exportAttendancePDF({
                          records: exportRecords,
                          date: pdfDateTitle,
                        });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = `Daftar-Hadir-${dateLabel}.pdf`;
                        link.click();
                        setExportLoading(false);
                        setExportDone(true);
                        setTimeout(() => setExportDone(false), 1500);
                      } catch {
                        setExportLoading(false);
                        toast.error("Gagal export PDF");
                      }
                    }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export PDF</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Personal tab toggle for employees with access */}
        {!isAdmin && canManage && (
          <TooltipProvider>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "admin" | "pribadi")}>
              <TabsList className="grid w-full max-w-[200px] grid-cols-2">
                <TabsTrigger value="admin" className="px-3 h-7 gap-1.5">
                  <Users className="w-3.5 h-3.5" /><span className="text-xs">Team</span>
                </TabsTrigger>
                <TabsTrigger value="pribadi" className="px-3 h-7 gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" /><span className="text-xs">Pribadi</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </TooltipProvider>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="ms-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {countableEmployees.length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Total Karyawan
            </p>
          </div>
          <div className="ms-card p-4 text-center">
            <p className="text-2xl font-bold text-success">
              {todayMerged.present}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Hadir Hari Ini
            </p>
          </div>
          <div className="ms-card p-4 text-center">
            <p className="text-2xl font-bold text-warning">
              {todayMerged.late}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Terlambat</p>
          </div>
          <div className="ms-card p-4 text-center">
            <p className="text-2xl font-bold text-destructive">
              {todayMerged.absent}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Belum Hadir
            </p>
          </div>
          <div className="ms-card p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">
              {excludedEmployees.length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Tidak Dihitung
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="ms-card p-3 flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <div className="relative flex-1 max-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari nama..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">
              Filter:
            </Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="text-xs h-8 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Semua Karyawan
                </SelectItem>
                <SelectItem value="hadir" className="text-xs">
                  Yang Hadir
                </SelectItem>
                <SelectItem value="terlambat" className="text-xs">
                  Yang Terlambat
                </SelectItem>
                <SelectItem value="tidak_datang" className="text-xs">
                  Yang Tidak Datang
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">
              Kantor:
            </Label>
            <Select value={filterOffice} onValueChange={setFilterOffice}>
              <SelectTrigger className="text-xs h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Semua</SelectItem>
                <SelectItem value="Banda Aceh" className="text-xs">
                  Banda Aceh
                </SelectItem>
                <SelectItem value="Meulaboh" className="text-xs">
                  Meulaboh
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">
              Tanggal:
            </Label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-xs h-8 px-2 rounded-md border border-input bg-background"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">
              Bulan:
            </Label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="text-xs h-8 px-2 rounded-md border border-input bg-background"
            />
          </div>
        </div>

        {/* Tabs: Daftar Hadir, Tidak Dihitung */}
        <TooltipProvider>
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full max-w-[360px] grid-cols-3">
              <TabsTrigger value="list" className="px-3 h-7 gap-1.5">
                <Users className="w-3.5 h-3.5" /><span className="text-xs">Daftar Hadir</span>
              </TabsTrigger>
              <TabsTrigger value="excluded" className="px-3 h-7 gap-1.5">
                <ShieldOff className="w-3.5 h-3.5" /><span className="text-xs">Tidak Dihitung</span>
              </TabsTrigger>
              <TabsTrigger value="holidays" className="px-3 h-7 gap-1.5">
                <Calendar className="w-3.5 h-3.5" /><span className="text-xs">Hari Libur</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: Daftar Hadir - ALL employees */}
            <TabsContent value="list">
              <div className="ms-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 " /> Daftar Hadir
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      {filteredRecords.length} karyawan
                    </Badge>
                    <span className="text-[10px] text-muted-foreground ml-2">
                      ({formatTanggalIndo(filterDate)})
                    </span>
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 px-2 font-medium w-10">
                          No
                        </th>
                        <th className="text-left py-2 px-2 font-medium">
                          Nama
                        </th>
                        <th className="text-left py-2 px-2 font-medium">
                          Masuk
                        </th>
                        <th className="text-left py-2 px-2 font-medium">
                          Pulang
                        </th>
                        <th className="text-left py-2 px-2 font-medium">
                          Status
                        </th>
                        <th className="text-left py-2 px-2 font-medium">
                          Kantor
                        </th>
                        <th className="text-left py-2 px-2 font-medium">
                          Justifikasi
                        </th>
                        <th className="text-left py-2 px-2 font-medium">
                          Bukti
                        </th>
                        <th className="text-left py-2 px-2 font-medium">
                          Pendapatan
                        </th>
                        <th className="text-left py-2 px-2 font-medium">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.length === 0
                        ? (
                          <tr>
                            <td
                              colSpan={10}
                              className="text-center py-8 text-muted-foreground"
                            >
                              Tidak ada data
                            </td>
                          </tr>
                        )
                        : filteredRecords.map((a, i) => (
                          <tr
                            key={a.userId + a.date}
                            className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                              i % 2 === 0 ? "" : "bg-muted/10"
                            }`}
                          >
                            <td className="py-2 px-2 text-muted-foreground">
                              {i + 1}
                            </td>
                            <td className="py-2 px-2 font-medium text-foreground">
                              {a.employeeName}
                            </td>
                            <td className="py-2 px-2">{a.clockIn || "-"}</td>
                            <td className="py-2 px-2">{a.clockOut || "-"}</td>
                            <td className="py-2 px-2">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                  STATUS_BADGE[a.status] || STATUS_BADGE["---"]
                                }`}
                              >
                                {getStatusLabel(a.status)}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-muted-foreground text-[10px]">
                              {a.location || "-"}
                            </td>
                            <td className="py-2 px-2 text-muted-foreground text-[10px] max-w-[150px] truncate">
                              {a.justification || "-"}
                            </td>
                            <td className="py-2 px-2">
                              {a.proofImage
                                ? (
                                  <button
                                    onClick={() =>
                                      setViewProofUrl(
                                        `${
                                          apiBase.replace(/\/api\/?$/, "")
                                        }${a.proofImage}`,
                                      )}
                                    className=""
                                  >
                                    <FileText className="w-4 h-4" />
                                  </button>
                                )
                                : (
                                  <span className="text-[10px] text-muted-foreground">
                                    -
                                  </span>
                                )}
                            </td>
                            <td className="py-2 px-2 text-[10px]">
                              {(a.clockIn && a.clockOut &&
                                  (a.status === "present" ||
                                    a.status === "late"))
                                ? (
                                  <span className="text-success font-medium">
                                    Rp 50.000
                                  </span>
                                )
                                : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                            </td>
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      onClick={() => openEditDialog(a)}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit</TooltipContent>
                                </Tooltip>
                                {a.id && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-destructive"
                                        onClick={() =>
                                          setConfirmDeleteAttId(a.id!)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Hapus</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Tidak Dihitung */}
            <TabsContent value="excluded">
              <div className="ms-card p-4 space-y-4">
                <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldOff className="w-3.5 h-3.5 text-muted-foreground" />
                  {" "}
                  Karyawan Tidak Dihitung
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    {excludedEmployees.length} orang
                  </Badge>
                </h2>

                {/* Add form - only for admin */}
                {isAdmin && (
                  <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border border-border bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Cari Karyawan</Label>
                      <Select
                        value={excludeUserId}
                        onValueChange={setExcludeUserId}
                      >
                        <SelectTrigger className="text-xs h-8 w-[200px]">
                          <SelectValue placeholder="Pilih karyawan..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          <div className="p-2">
                            <Input
                              placeholder="Cari nama..."
                              value={excludeSearch}
                              onChange={(e) => setExcludeSearch(e.target.value)}
                              className="h-7 text-xs"
                            />
                          </div>
                          {employees
                            .filter((e) => !excludedUserIds.has(e.id))
                            .filter((e) =>
                              !excludeSearch ||
                              e.name.toLowerCase().includes(
                                excludeSearch.toLowerCase(),
                              )
                            )
                            .map((emp) => (
                              <SelectItem
                                key={emp.id}
                                value={emp.id}
                                className="text-xs"
                              >
                                {emp.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 flex-1">
                      <Label className="text-[10px]">Deskripsi</Label>
                      <Input
                        value={excludeDesc}
                        onChange={(e) => setExcludeDesc(e.target.value)}
                        placeholder="Alasan tidak dihitung..."
                        className="text-xs h-8"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs h-8"
                      onClick={handleAddExcluded}
                      disabled={!excludeUserId}
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah
                    </Button>
                  </div>
                )}

                {/* List */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 px-2 font-medium w-10">
                          No
                        </th>
                        <th className="text-left py-2 px-2 font-medium">
                          Nama
                        </th>
                        <th className="text-left py-2 px-2 font-medium">
                          Jabatan
                        </th>
                        <th className="text-left py-2 px-2 font-medium">
                          Deskripsi
                        </th>
                        {isAdmin && (
                          <th className="text-left py-2 px-2 font-medium">
                            Aksi
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {excludedEmployees.length === 0
                        ? (
                          <tr>
                            <td
                              colSpan={isAdmin ? 5 : 4}
                              className="text-center py-8 text-muted-foreground"
                            >
                              Belum ada karyawan yang dikecualikan
                            </td>
                          </tr>
                        )
                        : excludedEmployees.map((ex, i) => {
                          const emp = employees.find((e) => e.id === ex.userId);
                          return (
                            <tr
                              key={ex.id}
                              className={`border-b border-border/50 hover:bg-muted/30 ${
                                i % 2 === 0 ? "" : "bg-muted/10"
                              }`}
                            >
                              <td className="py-2 px-2 text-muted-foreground">
                                {i + 1}
                              </td>
                              <td className="py-2 px-2 font-medium text-foreground">
                                {ex.userName || emp?.name || ex.userId}
                              </td>
                              <td className="py-2 px-2 text-muted-foreground">
                                {emp?.position || "-"}
                              </td>
                              <td className="py-2 px-2 text-muted-foreground">
                                {ex.description || "-"}
                              </td>
                              {isAdmin && (
                                <td className="py-2 px-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-destructive"
                                    onClick={() => handleRemoveExcluded(ex.id)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Hari Libur */}
            <TabsContent value="holidays">
              <div className="ms-card p-4 space-y-4">
                <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  {" "}
                  Hari Libur
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    {holidays.length} hari
                  </Badge>
                </h2>

                <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Tanggal</Label>
                    <input
                      type="date"
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                      className="text-xs h-8 px-2 rounded-md border border-input bg-background"
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-[10px]">Deskripsi</Label>
                    <Input
                      value={newHolidayDesc}
                      onChange={(e) => setNewHolidayDesc(e.target.value)}
                      placeholder="Mis: Hari Raya Idul Fitri"
                      className="text-xs h-8"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs h-8"
                    onClick={handleAddHoliday}
                    disabled={!newHolidayDate}
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 px-2 font-medium w-10">
                          No
                        </th>
                        <th className="text-left py-2 px-2 font-medium">
                          Tanggal
                        </th>
                        <th className="text-left py-2 px-2 font-medium">
                          Hari
                        </th>
                        <th className="text-left py-2 px-2 font-medium">
                          Deskripsi
                        </th>
                        <th className="text-left py-2 px-2 font-medium">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {holidays.length === 0
                        ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="text-center py-8 text-muted-foreground"
                            >
                              Belum ada hari libur
                            </td>
                          </tr>
                        )
                        : holidays.map((h, i) => {
                          const dayNames = [
                            "Minggu",
                            "Senin",
                            "Selasa",
                            "Rabu",
                            "Kamis",
                            "Jumat",
                            "Sabtu",
                          ];
                          const dayName =
                            dayNames[new Date(h.date + "T00:00:00").getDay()];
                          return (
                            <tr
                              key={h.id}
                              className={`border-b border-border/50 hover:bg-muted/30 ${
                                i % 2 === 0 ? "" : "bg-muted/10"
                              }`}
                            >
                              <td className="py-2 px-2 text-muted-foreground">
                                {i + 1}
                              </td>
                              <td className="py-2 px-2 font-medium text-foreground">
                                {h.date}
                              </td>
                              <td className="py-2 px-2 text-muted-foreground">
                                {dayName}
                              </td>
                              <td className="py-2 px-2 text-muted-foreground">
                                {h.description || "-"}
                              </td>
                              <td className="py-2 px-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-destructive"
                                  onClick={() =>
                                    setConfirmDeleteHolidayId(h.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </TooltipProvider>

        {/* Edit Dialog - ALL fields */}
        {editRecord && (
          <Dialog
            open={!!editRecord}
            onOpenChange={(o) => {
              if (!o) setEditRecord(null);
            }}
          >
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle className="text-sm">
                  Edit Kehadiran — {editRecord.employeeName}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(v) =>
                      setEditForm((f) => ({ ...f, status: v }))}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className=" h-80">
                      {customStatuses.map((s) => (
                        <SelectItem key={s.name} value={s.name} className="text-xs">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Jam Masuk</Label>
                    <Input
                      type="time"
                      value={editForm.clockIn}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, clockIn: e.target.value }))}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Jam Pulang</Label>
                    <Input
                      type="time"
                      value={editForm.clockOut}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          clockOut: e.target.value,
                        }))}
                      className="text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Kantor</Label>
                  <Select
                    value={editForm.location}
                    onValueChange={(v) =>
                      setEditForm((f) => ({ ...f, location: v }))}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Pilih kantor..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Banda Aceh" className="text-xs">
                        Banda Aceh
                      </SelectItem>
                      <SelectItem value="Meulaboh" className="text-xs">
                        Meulaboh
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Justifikasi</Label>
                  <div className="relative">
                    <Textarea
                      value={editForm.justification}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          justification: e.target.value,
                        }))}
                      placeholder="Catatan/komentar..."
                      className="text-xs min-h-[60px]"
                    />
                    {justificationSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {justificationSuggestions.filter((s) =>
                          s &&
                          s.toLowerCase().includes(
                            (editForm.justification || "").toLowerCase(),
                          )
                        ).slice(0, 5).map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            className="text-[9px] px-2 py-0.5 rounded-full border border-border bg-muted hover:bg-muted/80"
                            onClick={() =>
                              setEditForm((f) => ({ ...f, justification: s }))}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-2 mt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.justificationPermanent}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          justificationPermanent: e.target.checked,
                        }))}
                      className="w-3.5 h-3.5 rounded border-border"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Justifikasi Tetap
                    </span>
                  </label>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Upload Bukti</Label>
                  <Input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) =>
                      setEditProofFile(e.target.files?.[0] || null)}
                    className="text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 text-xs" onClick={handleEditSave}>
                    Simpan
                  </Button>
                  <Button
                    variant="outline"
                    className="text-xs"
                    onClick={() => setEditRecord(null)}
                  >
                    Batal
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Proof Viewer */}
        <Dialog
          open={!!viewProofUrl}
          onOpenChange={(o) => {
            if (!o) setViewProofUrl(null);
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm">Bukti</DialogTitle>
            </DialogHeader>
            {viewProofUrl && (
              viewProofUrl.endsWith(".pdf")
                ? (
                  <iframe
                    src={viewProofUrl}
                    className="w-full h-[60vh] rounded"
                    title="Bukti PDF"
                  />
                )
                : (
                  <img
                    src={viewProofUrl}
                    alt="bukti"
                    className="w-full rounded"
                  />
                )
            )}
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={!!confirmDeleteAttId}
          onOpenChange={(o) => {
            if (!o) setConfirmDeleteAttId(null);
          }}
          title="Hapus data kehadiran?"
          description="Data kehadiran ini akan dihapus permanen."
          variant="destructive"
          confirmText="Hapus"
          onConfirm={handleDeleteAttendance}
        />

        <ConfirmDialog
          open={!!confirmDeleteHolidayId}
          onOpenChange={(o) => {
            if (!o) setConfirmDeleteHolidayId(null);
          }}
          title="Hapus hari libur?"
          description="Hari libur ini akan dihapus permanen."
          variant="destructive"
          confirmText="Hapus"
          onConfirm={handleDeleteHoliday}
        />

        {/* Export PDF Loading Dialog */}
        <Dialog open={exportLoading || exportDone} onOpenChange={() => {}}>
          <DialogContent
            className="sm:max-w-xs"
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <div className="flex flex-col items-center justify-center py-6 space-y-3">
              {exportLoading && !exportDone && (
                <>
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-medium text-foreground">
                    Mengekspor PDF...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Mohon tunggu sebentar
                  </p>
                </>
              )}
              {exportDone && (
                <>
                  <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-success"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Selesai!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF berhasil diunduh
                  </p>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Manage Status Dialog */}
        <Dialog open={manageStatusOpen} onOpenChange={setManageStatusOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" /> Kelola Status Kehadiran
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Nama status (key)"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  className="text-xs h-8"
                />
                <Input
                  placeholder="Label tampilan"
                  value={newStatusLabel}
                  onChange={(e) => setNewStatusLabel(e.target.value)}
                  className="text-xs h-8"
                />
                <Button size="sm" className="h-8 text-xs shrink-0" disabled={!newStatusName.trim() || !newStatusLabel.trim()} onClick={async () => {
                  try {
                    const result = await api.createAttendanceStatus({ name: newStatusName.trim(), label: newStatusLabel.trim() });
                    setCustomStatuses(prev => [...prev, result]);
                    setNewStatusName("");
                    setNewStatusLabel("");
                    toast.success("Status berhasil ditambahkan");
                  } catch (err: any) { toast.error(err.message || "Gagal menambahkan status"); }
                }}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {customStatuses.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/30 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{s.name}</Badge>
                      <span>{s.label}</span>
                      {s.isDefault && <span className="text-[9px] text-muted-foreground">(default)</span>}
                    </div>
                    {!s.isDefault && (
                      <Button size="icon" variant="ghost" className="w-6 h-6 text-destructive" onClick={async () => {
                        try {
                          await api.deleteAttendanceStatus(s.id);
                          setCustomStatuses(prev => prev.filter(st => st.id !== s.id));
                          toast.success("Status dihapus");
                        } catch { toast.error("Gagal menghapus status"); }
                      }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    );
  }
  // ========= EMPLOYEE VIEW =========
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5"
    >
      <h1 className="text-lg font-semibold text-foreground">Kehadiran</h1>

      {/* Employee salary card */}
      {absentSalary && (
        <div className="ms-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">
              Rp {absentSalary.total.toLocaleString("id-ID")}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Uang Kehadiran ({absentSalary.days} hari × Rp 50.000)
            </p>
          </div>
        </div>
      )}

      <div className="ms-card p-3 flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">
            Tanggal:
          </Label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="text-xs h-8 px-2 rounded-md border border-input bg-background"
          />
          {filterDate && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-1 text-[10px]"
              onClick={() => setFilterDate("")}
            >
              Reset
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">
            Bulan:
          </Label>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="text-xs h-8 px-2 rounded-md border border-input bg-background"
          />
        </div>
      </div>

      <div className="ms-card p-4">
        <h2 className="text-xs font-semibold text-foreground mb-3">
          Riwayat Kehadiran
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-2 px-2 font-medium w-10">No</th>
                <th className="text-left py-2 px-2 font-medium">Nama</th>
                <th className="text-left py-2 px-2 font-medium">Tanggal</th>
                <th className="text-left py-2 px-2 font-medium">Masuk</th>
                <th className="text-left py-2 px-2 font-medium">Pulang</th>
                <th className="text-left py-2 px-2 font-medium">Status</th>
                <th className="text-left py-2 px-2 font-medium">Pendapatan</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.length === 0
                ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Tidak ada data kehadiran
                    </td>
                  </tr>
                )
                : filteredAttendance.map((a, i) => (
                  <tr
                    key={a.id}
                    className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                      i % 2 === 0 ? "" : "bg-muted/10"
                    }`}
                  >
                    <td className="py-2 px-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-2 font-medium text-foreground">
                      {getAttendanceName(a)}
                    </td>
                    <td className="py-2 px-2">{a.date}</td>
                    <td className="py-2 px-2">{a.clockIn || "-"}</td>
                    <td className="py-2 px-2">{a.clockOut || "-"}</td>
                    <td className="py-2 px-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          STATUS_BADGE[a.status]
                        }`}
                      >
                        {getStatusLabel(a.status)}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-[10px]">
                      {(a.clockIn && a.clockOut &&
                          (a.status === "present" || a.status === "late"))
                        ? (
                          <span className="text-success font-medium">
                            Rp 50.000
                          </span>
                        )
                        : <span className="text-muted-foreground">-</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default Attendance;


