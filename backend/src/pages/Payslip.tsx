import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMenuSettings } from "@/contexts/MenuSettingsContext";
import api, { getUploadUrl } from "@/lib/api";
import type { PayslipData } from "@/types";
import { motion } from "framer-motion";
import { 
  FileText, Upload, Lock, Eye, Trash2, KeyRound, Filter, 
  Search, LayoutGrid, List, Users, User as UserIcon, Clock,
  MoreVertical, ShieldCheck, FileDown,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import StatsCard from "@/components/StatsCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConfirmDialog from "@/components/ConfirmDialog";
import SuccessDialog from "@/components/SuccessDialog";
import EmployeeGrid, { EmployeeHeader } from "@/components/EmployeeGrid";
import { EmployeeGridSkeleton, PayslipCardSkeleton } from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";

const MONTH_NAMES = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/* ─── Employee Pribadi View (for employees with payslip access) ─── */
const EmployeePayslipPribadi = ({ userId, payslips }: { userId: string; payslips: PayslipData[] }) => {
  const [pinVerified, setPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [viewingPdf, setViewingPdf] = useState<PayslipData | null>(null);
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const { user } = useAuth();

  const handlePinVerify = () => {
    const userPin = user?.pin || "1234";
    if (pinInput === userPin) { setPinVerified(true); setPinDialogOpen(false); setPinInput(""); toast.success("PIN terverifikasi"); }
    else { toast.error("PIN salah"); }
  };

  const mySlips = payslips.filter(s => {
    if (s.userId !== userId) return false;
    const matchMonth = filterMonth === "all" || s.month === parseInt(filterMonth);
    const matchYear = filterYear === "all" || s.year === parseInt(filterYear);
    return matchMonth && matchYear;
  });
  const years = [...new Set(payslips.filter(s => s.userId === userId).map(s => s.year))].sort((a, b) => b - a);

  if (!pinVerified) {
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border shadow-sm rounded-xl p-10 text-center space-y-4 max-w-md mx-auto mt-10">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground mb-1">Dokumen Terkunci</h3>
            <p className="text-[10px] text-muted-foreground">Otorisasi PIN diperlukan untuk mengakses slip gaji.</p>
          </div>
          <Button onClick={() => setPinDialogOpen(true)} className="text-xs h-9 w-full">Buka Kunci (PIN)</Button>
        </div>
        <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
          <DialogContent className="max-w-xs p-0 overflow-hidden">
            <DialogHeader className="p-5 border-b border-border bg-muted/20">
              <DialogTitle className="text-sm text-center flex flex-col items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                Otorisasi Keamanan
              </DialogTitle>
            </DialogHeader>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-center block">Masukkan 6 Digit PIN</Label>
                <Input type="password" maxLength={6} value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, ""))} placeholder="••••••" className="text-center text-lg tracking-[0.75em] h-12 bg-muted/30" onKeyDown={e => e.key === "Enter" && handlePinVerify()} />
              </div>
              {!user?.pin && <p className="text-[10px] text-muted-foreground text-center bg-muted/50 p-2 rounded">PIN default Anda adalah: <strong className="text-foreground">1234</strong></p>}
              <Button onClick={handlePinVerify} className="w-full text-xs h-9">Verifikasi PIN</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap items-center gap-3 shadow-sm">
        <Filter className="w-4 h-4 text-muted-foreground ml-1" />
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-[140px] h-8 text-xs bg-muted/30"><SelectValue placeholder="Semua Bulan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Semua Bulan</SelectItem>
            {MONTH_NAMES.slice(1).map((m, i) => <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-[100px] h-8 text-xs bg-muted/30"><SelectValue placeholder="Tahun" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Semua</SelectItem>
            {years.map(y => <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {mySlips.length === 0 ? (
        <EmptyState icon={FileText} title="Tidak ada slip gaji" description="Slip gaji Anda untuk periode ini belum tersedia." compact />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mySlips.map(slip => (
            <div key={slip.id} className="bg-card border border-border shadow-sm rounded-xl p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group" onClick={() => setViewingPdf(slip)}>
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                    <FileText className="w-4 h-4 text-foreground" />
                  </div>
                  <span className="text-xs font-bold text-foreground">{MONTH_NAMES[slip.month]} {slip.year}</span>
                </div>
                <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FileDown className="w-3.5 h-3.5" />
                <p className="text-[10px] font-medium">Dokumen PDF Tersedia</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!viewingPdf} onOpenChange={o => { if (!o) setViewingPdf(null); }}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
          {viewingPdf && (
            <>
              <DialogHeader className="p-4 border-b border-border bg-card">
                <DialogTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Slip Gaji — {MONTH_NAMES[viewingPdf.month]} {viewingPdf.year}
                </DialogTitle>
              </DialogHeader>
              <iframe src={getUploadUrl(viewingPdf.pdfUrl)} className="w-full h-[75vh] bg-muted/10" title="Slip Gaji PDF" />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Payslip = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, updateProfile, users } = useAuth();
  const { hasAccess } = useMenuSettings();
  const canManage = isAdmin || hasAccess("payslip");
  const isEmployeeWithAccess = !isAdmin && hasAccess("payslip");
  const [payslipTab, setPayslipTab] = useState<"team" | "pribadi">("team");

  const [payslips, setPayslips] = useState<PayslipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinVerified, setPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");

  // Upload form
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [formUserId, setFormUserId] = useState(employeeId || "");
  const [formMonth, setFormMonth] = useState(String(new Date().getMonth() + 1));
  const [formYear, setFormYear] = useState(String(new Date().getFullYear()));
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Bulk upload
  const [bulkFiles, setBulkFiles] = useState<{ file: File; userId: string }[]>([]);
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const [bulkMode, setBulkMode] = useState(false);

  // Success dialog
  const [successDialog, setSuccessDialog] = useState<{ title: string; description?: string } | null>(null);

  // Filter for admin view
  const [adminFilterMonth, setAdminFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [adminFilterYear, setAdminFilterYear] = useState(String(new Date().getFullYear()));
  const [adminSearch, setAdminSearch] = useState("");

  // Filter for employee view
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");

  // PDF viewer
  const [viewingPdf, setViewingPdf] = useState<PayslipData | null>(null);
  const [payslipEmployeeSearch, setPayslipEmployeeSearch] = useState("");
  const [payslipViewMode, setPayslipViewMode] = useState<"grid" | "table">("grid");

  const employees = users.filter(u => u.role === "employee");
  const filteredPayslipEmployees = employees.filter(e => !payslipEmployeeSearch || e.name.toLowerCase().includes(payslipEmployeeSearch.toLowerCase()));

  const fetchPayslips = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (employeeId) params.userId = employeeId;
      else if (!canManage && user?.id) params.userId = user.id;
      const data = await api.getPayslips(params);
      setPayslips(data);
    } catch {
      toast.error("Gagal memuat data slip gaji");
    } finally {
      setLoading(false);
    }
  }, [employeeId, canManage, user?.id]);

  useEffect(() => { fetchPayslips(); }, [fetchPayslips]);

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  const handlePinVerify = () => {
    const userPin = user?.pin || "1234";
    if (pinInput === userPin) { setPinVerified(true); setPinDialogOpen(false); setPinInput(""); toast.success("PIN terverifikasi"); }
    else { toast.error("PIN salah"); }
  };

  const handleUpload = async () => {
    if (!pdfFile) { toast.error("Pilih file PDF"); return; }
    const targetUserId = employeeId || formUserId;
    if (!targetUserId) { toast.error("Pilih karyawan"); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);
      formData.append("userId", targetUserId);
      formData.append("month", formMonth);
      formData.append("year", formYear);
      const created = await api.createPayslip(formData);
      setPayslips(prev => [created, ...prev]);
      setPdfFile(null);
      setShowUploadForm(false);
      const empName = users.find(u => u.id === targetUserId)?.name || "";
      setSuccessDialog({
        title: "Slip gaji berhasil dikirim!",
        description: `Slip gaji ${MONTH_NAMES[parseInt(formMonth)]} ${formYear} untuk ${empName} berhasil diunggah.`,
      });
    } catch {
      toast.error("Gagal mengupload slip gaji");
    } finally {
      setUploading(false);
    }
  };

  const handleBulkUpload = async () => {
    const valid = bulkFiles.filter(f => f.userId);
    if (valid.length === 0) { toast.error("Pilih karyawan untuk setiap file"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      const mapping: { fileIndex: number; userId: string; month: string; year: string }[] = [];
      valid.forEach((item, i) => {
        formData.append("pdfs", item.file);
        mapping.push({ fileIndex: i, userId: item.userId, month: formMonth, year: formYear });
      });
      formData.append("mapping", JSON.stringify(mapping));
      const results = await api.bulkCreatePayslips(formData);
      setPayslips(prev => [...results, ...prev]);
      setBulkFiles([]);
      setBulkMode(false);
      setShowUploadForm(false);
      setSuccessDialog({
        title: `${results.length} Dokumen Berhasil Dikirim!`,
        description: `Seluruh slip gaji untuk periode ${MONTH_NAMES[parseInt(formMonth)]} ${formYear} berhasil didistribusikan.`,
      });
    } catch {
      toast.error("Gagal mengupload slip gaji");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.deletePayslip(confirmDeleteId);
      setPayslips(prev => prev.filter(s => s.id !== confirmDeleteId));
      setConfirmDeleteId(null);
      setSuccessDialog({ title: "Slip gaji berhasil dihapus" });
    } catch {
      toast.error("Gagal menghapus slip gaji");
    }
  };

  // ===== ADMIN: Direct upload view (no employee grid) =====
  if (canManage && !employeeId) {
    const filteredSlips = payslips.filter(slip => {
      const matchMonth = adminFilterMonth === "all" || slip.month === parseInt(adminFilterMonth);
      const matchYear = adminFilterYear === "all" || slip.year === parseInt(adminFilterYear);
      const empName = users.find(u => u.id === slip.userId)?.name || "";
      const matchSearch = !adminSearch || empName.toLowerCase().includes(adminSearch.toLowerCase());
      return matchMonth && matchYear && matchSearch;
    });
    const adminYears = [...new Set(payslips.map(s => s.year))].sort((a, b) => b - a);
    if (adminYears.length === 0) adminYears.push(new Date().getFullYear());

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-8xl mx-auto pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <FileText className="w-6 h-6" /> Distribusi Slip Gaji
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Kelola dan distribusikan dokumen slip gaji karyawan secara aman.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted/50 border border-border rounded-lg p-0.5">
              <button className={`p-1.5 rounded-md transition-colors ${payslipViewMode === "grid" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setPayslipViewMode("grid")}><LayoutGrid className="w-4 h-4" /></button>
              <button className={`p-1.5 rounded-md transition-colors ${payslipViewMode === "table" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setPayslipViewMode("table")}><List className="w-4 h-4" /></button>
            </div>
            <Button size="sm" className="gap-1.5 text-xs h-9 shadow-sm" onClick={() => setShowUploadForm(true)}>
              <Upload className="w-3.5 h-3.5" /> Upload Dokumen
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Slip Didistribusi</p>
              <p className="text-xl font-bold text-foreground">{payslips.length}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Distribusi Bulan Ini</p>
              <p className="text-xl font-bold text-foreground">{payslips.filter(s => s.month === new Date().getMonth() + 1 && s.year === new Date().getFullYear()).length}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Karyawan Menerima</p>
              <p className="text-xl font-bold text-foreground">{new Set(payslips.map(s => s.userId)).size}</p>
            </div>
          </div>
        </div>

        {/* Pribadi tab for employee with access */}
        {isEmployeeWithAccess && (
          <Tabs value={payslipTab} onValueChange={v => setPayslipTab(v as "team" | "pribadi")}>
            <TabsList className="bg-transparent  justify-start rounded-none p-0 h-auto space-x-6 mb-4">
              <TabsTrigger value="team" className="px-0 py-3 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:shadow-none rounded-none text-xs">
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Kelola Tim</span>
              </TabsTrigger>
              <TabsTrigger value="pribadi" className="px-0 py-3 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:shadow-none rounded-none text-xs">
                <span className="flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" />Slip Saya</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {isEmployeeWithAccess && payslipTab === "pribadi" ? (
          <EmployeePayslipPribadi userId={user?.id || ""} payslips={payslips} />
        ) : (
          <>
            {/* Filters */}
            <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap items-center gap-3 shadow-sm">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Cari nama karyawan..." value={adminSearch} onChange={e => setAdminSearch(e.target.value)} className="pl-8 h-8 text-xs bg-muted/30" />
              </div>
              <Select value={adminFilterMonth} onValueChange={setAdminFilterMonth}>
                <SelectTrigger className="w-[140px] h-8 text-xs bg-background"><SelectValue placeholder="Bulan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Semua Bulan</SelectItem>
                  {MONTH_NAMES.slice(1).map((m, i) => <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={adminFilterYear} onValueChange={setAdminFilterYear}>
                <SelectTrigger className="w-[100px] h-8 text-xs bg-background"><SelectValue placeholder="Tahun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Semua Tahun</SelectItem>
                  {adminYears.map(y => <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Upload Form Dialog */}
            <Dialog open={showUploadForm} onOpenChange={o => { setShowUploadForm(o); if (!o) { setBulkMode(false); setBulkFiles([]); setPdfFile(null); } }}>
              <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
                <DialogHeader className="p-5 border-b border-border bg-card">
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <Upload className="w-5 h-5 text-muted-foreground" /> Upload Dokumen Slip Gaji
                  </DialogTitle>
                </DialogHeader>
                
                <div className="p-5 bg-muted/5 space-y-5">
                  {/* Mode toggle */}
                  <div className="flex gap-2 bg-muted/40 p-1 rounded-lg border border-border">
                    <button className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${!bulkMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setBulkMode(false)}>Upload Satuan</button>
                    <button className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${bulkMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setBulkMode(true)}>Upload Massal (Banyak File)</button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Periode Bulan</Label>
                      <Select value={formMonth} onValueChange={setFormMonth}>
                        <SelectTrigger className="text-xs h-9 bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>{MONTH_NAMES.slice(1).map((m, i) => <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Periode Tahun</Label>
                      <Input type="number" value={formYear} onChange={e => setFormYear(e.target.value)} className="text-xs h-9 bg-background" />
                    </div>
                  </div>

                  {!bulkMode ? (
                    <div className="space-y-4 pt-2 border-t border-border">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Pilih Karyawan</Label>
                        <Select value={formUserId} onValueChange={setFormUserId}>
                          <SelectTrigger className="text-xs h-9 bg-background"><SelectValue placeholder="Pilih penerima dokumen..." /></SelectTrigger>
                          <SelectContent className="max-h-60">
                            <div className="p-2 sticky top-0 bg-popover z-10 border-b border-border/50">
                              <Input placeholder="Cari karyawan..." value={payslipEmployeeSearch} onChange={e => setPayslipEmployeeSearch(e.target.value)} className="h-8 text-xs" />
                            </div>
                            {filteredPayslipEmployees.map(e => (
                              <SelectItem key={e.id} value={e.id} className="text-xs py-2">{e.name} <span className="text-[10px] text-muted-foreground ml-1">({e.position})</span></SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">File Dokumen (PDF)</Label>
                        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                        <div 
                          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors bg-background"
                          onClick={() => fileRef.current?.click()}
                        >
                           <FileDown className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                           <p className="text-xs font-medium text-foreground">{pdfFile ? pdfFile.name : "Klik untuk memilih file PDF"}</p>
                           <p className="text-[10px] text-muted-foreground mt-1">Ukuran maksimal 5MB</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-2 border-t border-border">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground flex justify-between items-center">
                          Daftar Dokumen
                          <span className="text-[10px] font-normal text-muted-foreground">{bulkFiles.length} file dipilih</span>
                        </Label>
                        <input ref={bulkFileRef} type="file" accept=".pdf" multiple className="hidden" onChange={e => {
                          const files = e.target.files;
                          if (!files) return;
                          setBulkFiles(prev => [...prev, ...Array.from(files).map(f => ({ file: f, userId: "" }))]);
                          if (bulkFileRef.current) bulkFileRef.current.value = "";
                        }} />
                        
                        <div className="max-h-56 overflow-y-auto space-y-2 pr-2">
                           {bulkFiles.map((item, idx) => {
                             const usedIds = bulkFiles.filter((_, i) => i !== idx && bulkFiles[i].userId).map(b => b.userId);
                             const availableEmps = employees.filter(e => !usedIds.includes(e.id));
                             return (
                               <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border border-border bg-card shadow-sm">
                                 <div className="flex items-center gap-2 flex-1 min-w-0">
                                   <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                   <span className="text-xs font-medium truncate">{item.file.name}</span>
                                 </div>
                                 <div className="flex items-center gap-2 shrink-0">
                                   <Select value={item.userId} onValueChange={v => {
                                     setBulkFiles(prev => prev.map((f, i) => i === idx ? { ...f, userId: v } : f));
                                   }}>
                                     <SelectTrigger className="text-xs h-8 w-[180px] bg-background"><SelectValue placeholder="Pasangkan Karyawan..." /></SelectTrigger>
                                     <SelectContent className="max-h-48">
                                       {availableEmps.map(e => <SelectItem key={e.id} value={e.id} className="text-xs">{e.name}</SelectItem>)}
                                     </SelectContent>
                                   </Select>
                                   <Button size="icon" variant="ghost" className="w-7 h-7 hover:bg-destructive/10 text-destructive" onClick={() => setBulkFiles(prev => prev.filter((_, i) => i !== idx))}>
                                     <Trash2 className="w-3.5 h-3.5" />
                                   </Button>
                                 </div>
                               </div>
                             );
                           })}
                           {bulkFiles.length === 0 && (
                              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors bg-background" onClick={() => bulkFileRef.current?.click()}>
                                <FileDown className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                                <p className="text-xs font-medium text-foreground">Pilih beberapa file PDF sekaligus</p>
                              </div>
                           )}
                        </div>
                        {bulkFiles.length > 0 && (
                          <Button variant="outline" className="w-full text-xs h-9 border-dashed mt-2" onClick={() => bulkFileRef.current?.click()}>
                            <Plus className="w-3.5 h-3.5 mr-1" /> Tambah File Lainnya
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-border bg-card flex justify-end gap-2">
                   <Button variant="ghost" className="text-xs h-9 px-6" onClick={() => setShowUploadForm(false)}>Batal</Button>
                   {!bulkMode ? (
                     <Button className="text-xs h-9 px-6" onClick={handleUpload} disabled={uploading || !pdfFile || !formUserId}>
                       {uploading ? "Mengupload..." : "Kirim Dokumen"}
                     </Button>
                   ) : (
                     <Button className="text-xs h-9 px-6" onClick={handleBulkUpload} disabled={uploading || bulkFiles.length === 0 || bulkFiles.some(f => !f.userId)}>
                       {uploading ? "Mengupload..." : `Kirim ${bulkFiles.length} Dokumen`}
                     </Button>
                   )}
                </div>
              </DialogContent>
            </Dialog>

            {/* All payslips list */}
            {loading ? <PayslipCardSkeleton /> : filteredSlips.length === 0 ? (
              <EmptyState icon={FileText} title="Tidak ada dokumen ditemukan" description={adminSearch || adminFilterMonth !== "all" || adminFilterYear !== "all" ? "Coba sesuaikan filter pencarian Anda." : "Belum ada dokumen slip gaji yang didistribusikan."} />
            ) : (
              <div>
                {payslipViewMode === "table" ? (
                  <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[45%]">Informasi Penerima</TableHead>
                          <TableHead className="w-[35%]">Periode Dokumen</TableHead>
                          <TableHead className="text-right w-[20%]">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSlips.map(slip => {
                          const emp = users.find(u => u.id === slip.userId);
                          const empName = emp?.name || "Karyawan Tidak Dikenal";
                          return (
                            <TableRow key={slip.id} className="group cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setViewingPdf(slip)}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-8 h-8 border shadow-sm rounded-lg">
                                    {emp?.avatar && <AvatarImage src={getUploadUrl(emp.avatar)} />}
                                    <AvatarFallback className="bg-muted text-foreground text-[10px] font-bold rounded-lg">{getInitials(empName)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-foreground">{empName}</span>
                                    <span className="text-[10px] text-muted-foreground">{emp?.position || "-"}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs bg-muted/50 font-medium">
                                  {MONTH_NAMES[slip.month]} {slip.year}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div onClick={e => e.stopPropagation()}>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button size="icon" variant="ghost" className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-40 p-1" align="end">
                                      <button
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted rounded-md transition-colors"
                                        onClick={() => setViewingPdf(slip)}
                                      >
                                        <Eye className="w-3.5 h-3.5" /> Lihat Slip
                                      </button>
                                      <button
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                        onClick={() => setConfirmDeleteId(slip.id)}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" /> Hapus
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
                    {filteredSlips.map(slip => {
                      const emp = users.find(u => u.id === slip.userId);
                      const empName = emp?.name || "Karyawan Tidak Dikenal";
                      return (
                        <div key={slip.id} className="bg-card border border-border shadow-sm rounded-xl p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col" onClick={() => setViewingPdf(slip)}>
                          <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/50">
                            <Badge variant="secondary" className="text-[10px] bg-muted/50 font-medium">
                              {MONTH_NAMES[slip.month]} {slip.year}
                            </Badge>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button size="icon" variant="ghost" className="w-6 h-6 text-muted-foreground hover:text-foreground">
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-40 p-1" align="end">
                                  <button
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted rounded-md transition-colors"
                                    onClick={() => setViewingPdf(slip)}
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Lihat Slip
                                  </button>
                                  <button
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                    onClick={() => setConfirmDeleteId(slip.id)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                                  </button>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10 border shadow-sm rounded-lg">
                              {emp?.avatar && <AvatarImage src={getUploadUrl(emp.avatar)} />}
                              <AvatarFallback className="bg-muted text-foreground text-[10px] font-bold rounded-lg">{getInitials(empName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-foreground line-clamp-1">{empName}</span>
                              <span className="text-[10px] text-muted-foreground">{emp?.position || "-"}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* PDF Viewer */}
        <Dialog open={!!viewingPdf} onOpenChange={o => { if (!o) setViewingPdf(null); }}>
          <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
            {viewingPdf && (
              <>
                <DialogHeader className="p-4 border-b border-border bg-card">
                  <DialogTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Slip Gaji — {MONTH_NAMES[viewingPdf.month]} {viewingPdf.year}
                  </DialogTitle>
                </DialogHeader>
                <iframe src={getUploadUrl(viewingPdf.pdfUrl)} className="w-full h-[75vh] bg-muted/10" title="Slip Gaji PDF" />
              </>
            )}
          </DialogContent>
        </Dialog>

        <ConfirmDialog open={!!confirmDeleteId} onOpenChange={o => { if (!o) setConfirmDeleteId(null); }} title="Hapus Dokumen?" description="Dokumen slip gaji ini akan dihapus secara permanen." variant="destructive" confirmText="Hapus Permanen" onConfirm={handleDelete} />
        <SuccessDialog open={!!successDialog} onOpenChange={() => setSuccessDialog(null)} title={successDialog?.title || ""} description={successDialog?.description} />
      </motion.div>
    );
  }

  // ===== EMPLOYEE SPECIFIC VIEW (BY ID via Route Params) =====
  if (canManage && employeeId) {
    const empSlips = payslips.filter(s => s.userId === employeeId);
    const empName = users.find(u => u.id === employeeId)?.name || "";

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 max-w-5xl mx-auto pb-10">
        <EmployeeHeader employeeId={employeeId} backPath="/payslip" />
        
        <div className="flex items-center justify-between">
           <h2 className="text-sm font-semibold text-foreground">Riwayat Dokumen Slip Gaji</h2>
           <Button size="sm" className="gap-2 text-xs h-9 shadow-sm" onClick={() => setShowUploadForm(true)}>
             <Upload className="w-3.5 h-3.5" /> Upload Slip Gaji
           </Button>
        </div>

        {/* Upload Form Dialog */}
        <Dialog open={showUploadForm} onOpenChange={setShowUploadForm}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden">
            <DialogHeader className="p-5 border-b border-border bg-card">
               <DialogTitle className="text-base font-bold flex items-center gap-2">
                 <Upload className="w-5 h-5 text-muted-foreground" /> Upload Dokumen
               </DialogTitle>
            </DialogHeader>
            <div className="p-5 space-y-5 bg-muted/5">
              <div className="p-3 bg-card border border-border rounded-lg shadow-sm">
                 <p className="text-[10px] text-muted-foreground mb-1 uppercase font-semibold">Penerima Dokumen</p>
                 <p className="text-sm font-bold text-foreground">{empName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Bulan</Label>
                  <Select value={formMonth} onValueChange={setFormMonth}>
                    <SelectTrigger className="text-xs h-10 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>{MONTH_NAMES.slice(1).map((m, i) => <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tahun</Label>
                  <Input type="number" value={formYear} onChange={e => setFormYear(e.target.value)} className="text-xs h-10 bg-background" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">File Dokumen (PDF)</Label>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                <div 
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors bg-background"
                  onClick={() => fileRef.current?.click()}
                >
                   <FileDown className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                   <p className="text-xs font-medium text-foreground">{pdfFile ? pdfFile.name : "Klik untuk memilih file PDF"}</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-border bg-card flex justify-end gap-2">
               <Button variant="ghost" className="text-xs h-9 px-6" onClick={() => setShowUploadForm(false)}>Batal</Button>
               <Button className="text-xs h-9 px-6" onClick={handleUpload} disabled={uploading || !pdfFile}>
                {uploading ? "Mengupload..." : "Kirim Dokumen"}
               </Button>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? <PayslipCardSkeleton /> : empSlips.length === 0 ? (
          <EmptyState icon={FileText} title="Belum ada dokumen" description="Riwayat slip gaji karyawan ini akan tampil di sini." compact />
        ) : (
          <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
            <Table>
               <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                     <TableHead className="w-[60%]">Periode</TableHead>
                     <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                 {empSlips.map(slip => (
                   <TableRow key={slip.id} className="cursor-pointer hover:bg-muted/40 transition-colors group" onClick={() => setViewingPdf(slip)}>
                      <TableCell>
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                               <FileText className="w-4 h-4 text-foreground" />
                            </div>
                            <span className="font-semibold text-sm text-foreground">{MONTH_NAMES[slip.month]} {slip.year}</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-right">
                         <div onClick={e => e.stopPropagation()}>
                           <Popover>
                             <PopoverTrigger asChild>
                               <Button size="icon" variant="ghost" className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                                 <MoreVertical className="w-4 h-4" />
                               </Button>
                             </PopoverTrigger>
                             <PopoverContent className="w-40 p-1" align="end">
                               <button
                                 className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted rounded-md transition-colors"
                                 onClick={() => setViewingPdf(slip)}
                               >
                                 <Eye className="w-3.5 h-3.5" /> Lihat Slip
                               </button>
                               <button
                                 className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                 onClick={() => setConfirmDeleteId(slip.id)}
                               >
                                 <Trash2 className="w-3.5 h-3.5" /> Hapus
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
        )}

        {/* PDF Viewer */}
        <Dialog open={!!viewingPdf} onOpenChange={o => { if (!o) setViewingPdf(null); }}>
          <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
            {viewingPdf && (
              <>
                <DialogHeader className="p-4 border-b border-border bg-card">
                  <DialogTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Slip Gaji — {MONTH_NAMES[viewingPdf.month]} {viewingPdf.year}
                  </DialogTitle>
                </DialogHeader>
                <iframe src={getUploadUrl(viewingPdf.pdfUrl)} className="w-full h-[75vh] bg-muted/10" title="Slip Gaji PDF" />
              </>
            )}
          </DialogContent>
        </Dialog>

        <ConfirmDialog open={!!confirmDeleteId} onOpenChange={o => { if (!o) setConfirmDeleteId(null); }} title="Hapus Dokumen?" description="Dokumen slip gaji ini akan dihapus permanen." variant="destructive" confirmText="Hapus Permanen" onConfirm={handleDelete} />
        <SuccessDialog open={!!successDialog} onOpenChange={() => setSuccessDialog(null)} title={successDialog?.title || ""} description={successDialog?.description} />
      </motion.div>
    );
  }

  // ===== STANDARD EMPLOYEE VIEW =====
  const mySlips = payslips.filter(s => {
    const matchMonth = filterMonth === "all" || s.month === parseInt(filterMonth);
    const matchYear = filterYear === "all" || s.year === parseInt(filterYear);
    return matchMonth && matchYear;
  });

  const years = [...new Set(payslips.map(s => s.year))].sort((a, b) => b - a);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
            <FileText className="w-6 h-6" /> Arsip Slip Gaji
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Akses dokumen slip gaji bulanan Anda dengan aman.</p>
        </div>
        <div className="flex items-center gap-2">
          {pinVerified && <Button size="sm" variant="outline" className="gap-2 text-xs h-9 shadow-sm" onClick={() => setChangePinOpen(true)}><KeyRound className="w-3.5 h-3.5" /> Ubah PIN</Button>}
          {!pinVerified && <Button size="sm" className="gap-2 text-xs h-9 shadow-sm" onClick={() => setPinDialogOpen(true)}><Lock className="w-3.5 h-3.5" /> Verifikasi Akses</Button>}
        </div>
      </div>

      {!pinVerified && (
        <div className="bg-card border border-border shadow-sm rounded-xl p-10 text-center space-y-4 max-w-md mx-auto mt-10">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground mb-1">Dokumen Terkunci</h3>
            <p className="text-[10px] text-muted-foreground">Otorisasi PIN diperlukan untuk mengakses slip gaji.</p>
          </div>
          <Button onClick={() => setPinDialogOpen(true)} className="text-xs h-9 w-full">Buka Kunci (PIN)</Button>
        </div>
      )}

      {pinVerified && (
        <>
          {/* Filters */}
          <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap items-center gap-3 shadow-sm">
            <Filter className="w-4 h-4 text-muted-foreground ml-1" />
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[150px] h-8 text-xs bg-muted/30"><SelectValue placeholder="Semua Bulan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Semua Bulan</SelectItem>
                {MONTH_NAMES.slice(1).map((m, i) => <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[120px] h-8 text-xs bg-muted/30"><SelectValue placeholder="Tahun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Semua Tahun</SelectItem>
                {years.map(y => <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? <PayslipCardSkeleton /> : mySlips.length === 0 ? (
            <EmptyState icon={FileText} title="Dokumen Tidak Ditemukan" description="Slip gaji Anda untuk periode ini belum tersedia." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {mySlips.map(slip => (
                <div key={slip.id} className="bg-card border border-border shadow-sm rounded-xl p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group" onClick={() => setViewingPdf(slip)}>
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <FileText className="w-5 h-5 text-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Periode</span>
                        <span className="text-sm font-bold text-foreground">{MONTH_NAMES[slip.month]} {slip.year}</span>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="w-8 h-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileDown className="w-4 h-4" />
                    <p className="text-[11px] font-medium">Klik untuk membuka dokumen PDF</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PDF Viewer */}
          <Dialog open={!!viewingPdf} onOpenChange={o => { if (!o) setViewingPdf(null); }}>
            <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
              {viewingPdf && (
                <>
                  <DialogHeader className="p-4 border-b border-border bg-card">
                    <DialogTitle className="text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      Slip Gaji — {MONTH_NAMES[viewingPdf.month]} {viewingPdf.year}
                    </DialogTitle>
                  </DialogHeader>
                  <iframe src={getUploadUrl(viewingPdf.pdfUrl)} className="w-full h-[75vh] bg-muted/10" title="Slip Gaji PDF" />
                </>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* PIN Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="max-w-xs p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-border bg-muted/20">
            <DialogTitle className="text-sm text-center flex flex-col items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-muted-foreground" />
              Otorisasi Keamanan
            </DialogTitle>
          </DialogHeader>
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-center block">Masukkan 6 Digit PIN</Label>
              <Input type="password" maxLength={6} value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, ""))} placeholder="••••••" className="text-center text-lg tracking-[0.75em] h-12 bg-muted/30" onKeyDown={e => e.key === "Enter" && handlePinVerify()} />
            </div>
            {!user?.pin && <p className="text-[10px] text-muted-foreground text-center bg-muted/50 p-2 rounded">PIN default Anda adalah: <strong className="text-foreground">1234</strong></p>}
            <Button onClick={handlePinVerify} className="w-full text-xs h-9">Verifikasi PIN</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change PIN Dialog */}
      <Dialog open={changePinOpen} onOpenChange={o => { setChangePinOpen(o); if (!o) { setOldPin(""); setNewPin(""); setConfirmNewPin(""); } }}>
        <DialogContent className="sm:max-w-xs p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-border bg-muted/20">
            <DialogTitle className="text-sm text-center flex flex-col items-center gap-2">
              <KeyRound className="w-5 h-5 text-muted-foreground" />
              Ubah Kode Keamanan
            </DialogTitle>
          </DialogHeader>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5"><Label className="text-xs font-semibold">PIN Lama</Label><Input type="password" maxLength={6} value={oldPin} onChange={e => setOldPin(e.target.value.replace(/\D/g, ""))} placeholder="••••••" className="text-center text-lg tracking-[0.5em] bg-muted/30 h-10" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">PIN Baru</Label><Input type="password" maxLength={6} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ""))} placeholder="••••••" className="text-center text-lg tracking-[0.5em] bg-muted/30 h-10" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Konfirmasi PIN Baru</Label><Input type="password" maxLength={6} value={confirmNewPin} onChange={e => setConfirmNewPin(e.target.value.replace(/\D/g, ""))} placeholder="••••••" className="text-center text-lg tracking-[0.5em] bg-muted/30 h-10" /></div>
            <Button className="w-full text-xs h-9 mt-2" onClick={async () => {
              if (oldPin !== (user?.pin || "1234")) { toast.error("PIN lama salah"); return; }
              if (newPin.length < 4) { toast.error("PIN baru minimal 4 digit"); return; }
              if (newPin !== confirmNewPin) { toast.error("Konfirmasi PIN tidak cocok"); return; }
              try { await updateProfile({ pin: newPin } as any); toast.success("PIN berhasil diubah"); setChangePinOpen(false); } catch { toast.error("Gagal mengubah PIN"); }
            }}>Simpan PIN Baru</Button>
          </div>
        </DialogContent>
      </Dialog>

      <SuccessDialog open={!!successDialog} onOpenChange={() => setSuccessDialog(null)} title={successDialog?.title || ""} description={successDialog?.description} />
    </motion.div>
  );
};

export default Payslip;