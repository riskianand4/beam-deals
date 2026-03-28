import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMenuSettings } from "@/contexts/MenuSettingsContext";
import api, { getUploadUrl } from "@/lib/api";
import type { PayslipData } from "@/types";
import { motion } from "framer-motion";
import { FileText, Upload, Lock, Eye, Trash2, KeyRound, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import SuccessDialog from "@/components/SuccessDialog";
import EmployeeGrid, { EmployeeHeader } from "@/components/EmployeeGrid";
import { EmployeeGridSkeleton, PayslipCardSkeleton } from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";

const MONTH_NAMES = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const Payslip = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, updateProfile, users } = useAuth();
  const { hasAccess } = useMenuSettings();
  const canManage = isAdmin || hasAccess("payslip");

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

  const employees = users.filter(u => u.role === "employee");

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
        description: `Slip gaji ${MONTH_NAMES[parseInt(formMonth)]} ${formYear} untuk ${empName} berhasil diupload.`,
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Slip Gaji</h1>
          <Button size="sm" className="gap-1 text-xs" onClick={() => setShowUploadForm(true)}>
            <Upload className="w-3 h-3" /> Upload Slip Gaji
          </Button>
        </div>

        {/* Filters */}
        <div className="ms-card p-3 flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <div className="relative flex-1 max-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Cari karyawan..." value={adminSearch} onChange={e => setAdminSearch(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
          <Select value={adminFilterMonth} onValueChange={setAdminFilterMonth}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Bulan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Semua Bulan</SelectItem>
              {MONTH_NAMES.slice(1).map((m, i) => <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={adminFilterYear} onValueChange={setAdminFilterYear}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue placeholder="Tahun" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Semua</SelectItem>
              {adminYears.map(y => <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Upload Form Dialog */}
        <Dialog open={showUploadForm} onOpenChange={setShowUploadForm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="text-sm">Upload Slip Gaji</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Karyawan</Label>
                <Select value={formUserId} onValueChange={setFormUserId}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Pilih karyawan..." /></SelectTrigger>
                  <SelectContent className="h-64">
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id} className="text-xs">{e.name} — {e.position}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Bulan</Label>
                  <Select value={formMonth} onValueChange={setFormMonth}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{MONTH_NAMES.slice(1).map((m, i) => <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tahun</Label>
                  <Input type="number" value={formYear} onChange={e => setFormYear(e.target.value)} className="text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">File PDF</Label>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                <Button variant="outline" className="w-full text-xs gap-1.5 border-dashed" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" /> {pdfFile ? pdfFile.name : "Pilih file PDF..."}
                </Button>
              </div>
              <Button className="w-full text-xs" onClick={handleUpload} disabled={uploading || !pdfFile || !formUserId}>
                {uploading ? "Mengupload..." : "Kirim Slip Gaji"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* All payslips list */}
        {loading ? <PayslipCardSkeleton /> : filteredSlips.length === 0 ? (
          <EmptyState icon={FileText} title="Tidak ada slip gaji" description={adminSearch || adminFilterMonth !== "all" || adminFilterYear !== "all" ? "Coba ubah filter pencarian." : "Upload slip gaji untuk karyawan."} compact />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSlips.map(slip => {
              const empName = users.find(u => u.id === slip.userId)?.name || "Karyawan";
              return (
                <div key={slip.id} className="ms-card-hover p-4 cursor-pointer group" onClick={() => setViewingPdf(slip)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 " />
                      <span className="text-xs font-semibold text-foreground">{MONTH_NAMES[slip.month]} {slip.year}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="w-6 h-6 text-destructive opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); setConfirmDeleteId(slip.id); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-foreground">{empName}</p>
                  <p className="text-[10px] text-muted-foreground">Klik untuk melihat</p>
                </div>
              );
            })}
          </div>
        )}

        {/* PDF Viewer */}
        <Dialog open={!!viewingPdf} onOpenChange={o => { if (!o) setViewingPdf(null); }}>
          <DialogContent className="max-w-3xl max-h-[85vh]">
            {viewingPdf && (
              <>
                <DialogHeader><DialogTitle className="text-sm">Slip Gaji — {MONTH_NAMES[viewingPdf.month]} {viewingPdf.year}</DialogTitle></DialogHeader>
                <iframe src={getUploadUrl(viewingPdf.pdfUrl)} className="w-full h-[65vh] rounded-md border border-border" title="Slip Gaji PDF" />
              </>
            )}
          </DialogContent>
        </Dialog>

        <ConfirmDialog open={!!confirmDeleteId} onOpenChange={o => { if (!o) setConfirmDeleteId(null); }} title="Hapus slip gaji ini?" description="Slip gaji akan dihapus permanen." variant="destructive" confirmText="Hapus" onConfirm={handleDelete} />
        <SuccessDialog open={!!successDialog} onOpenChange={() => setSuccessDialog(null)} title={successDialog?.title || ""} description={successDialog?.description} />
      </motion.div>
    );
  }

  // ===== ADMIN: Employee Payslip List =====
  if (canManage && employeeId) {
    const empSlips = payslips.filter(s => s.userId === employeeId);
    const empName = users.find(u => u.id === employeeId)?.name || "";

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <EmployeeHeader employeeId={employeeId} backPath="/payslip" />
        
        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowUploadForm(true)}>
          <Upload className="w-3 h-3" /> Upload Slip Gaji
        </Button>

        {/* Upload Form Dialog */}
        <Dialog open={showUploadForm} onOpenChange={setShowUploadForm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="text-sm">Upload Slip Gaji — {empName}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Bulan</Label>
                  <Select value={formMonth} onValueChange={setFormMonth}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{MONTH_NAMES.slice(1).map((m, i) => <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tahun</Label>
                  <Input type="number" value={formYear} onChange={e => setFormYear(e.target.value)} className="text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">File PDF</Label>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                <Button variant="outline" className="w-full text-xs gap-1.5 border-dashed" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" /> {pdfFile ? pdfFile.name : "Pilih file PDF..."}
                </Button>
              </div>
              <Button className="w-full text-xs" onClick={handleUpload} disabled={uploading || !pdfFile}>
                {uploading ? "Mengupload..." : "Kirim Slip Gaji"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? <PayslipCardSkeleton /> : empSlips.length === 0 ? (
          <EmptyState icon={FileText} title="Belum ada slip gaji" description="Upload slip gaji PDF untuk karyawan ini." compact />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {empSlips.map(slip => (
              <div key={slip.id} className="ms-card-hover p-4 cursor-pointer group" onClick={() => setViewingPdf(slip)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 " />
                    <span className="text-xs font-semibold text-foreground">{MONTH_NAMES[slip.month]} {slip.year}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="w-6 h-6 text-destructive opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); setConfirmDeleteId(slip.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground">Slip Gaji PDF</p>
                <p className="text-[10px] text-muted-foreground">Klik untuk melihat</p>
              </div>
            ))}
          </div>
        )}

        {/* PDF Viewer */}
        <Dialog open={!!viewingPdf} onOpenChange={o => { if (!o) setViewingPdf(null); }}>
          <DialogContent className="max-w-3xl max-h-[85vh]">
            {viewingPdf && (
              <>
                <DialogHeader><DialogTitle className="text-sm">Slip Gaji — {MONTH_NAMES[viewingPdf.month]} {viewingPdf.year}</DialogTitle></DialogHeader>
                <iframe src={getUploadUrl(viewingPdf.pdfUrl)} className="w-full h-[65vh] rounded-md border border-border" title="Slip Gaji PDF" />
              </>
            )}
          </DialogContent>
        </Dialog>

        <ConfirmDialog open={!!confirmDeleteId} onOpenChange={o => { if (!o) setConfirmDeleteId(null); }} title="Hapus slip gaji ini?" description="Slip gaji akan dihapus permanen." variant="destructive" confirmText="Hapus" onConfirm={handleDelete} />
        <SuccessDialog open={!!successDialog} onOpenChange={() => setSuccessDialog(null)} title={successDialog?.title || ""} description={successDialog?.description} />
      </motion.div>
    );
  }

  // ===== EMPLOYEE VIEW =====
  const mySlips = payslips.filter(s => {
    const matchMonth = filterMonth === "all" || s.month === parseInt(filterMonth);
    const matchYear = filterYear === "all" || s.year === parseInt(filterYear);
    return matchMonth && matchYear;
  });

  const years = [...new Set(payslips.map(s => s.year))].sort((a, b) => b - a);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Slip Gaji</h1>
        <div className="flex items-center gap-2">
          {pinVerified && <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setChangePinOpen(true)}><KeyRound className="w-3 h-3" /> Ubah PIN</Button>}
          {!pinVerified && <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setPinDialogOpen(true)}><Lock className="w-3 h-3" /> Verifikasi PIN</Button>}
        </div>
      </div>

      {!pinVerified && (
        <div className="ms-card p-8 text-center space-y-3">
          <Lock className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Masukkan PIN untuk mengakses slip gaji</p>
          <Button onClick={() => setPinDialogOpen(true)} className="text-xs">Masukkan PIN</Button>
        </div>
      )}

      {pinVerified && (
        <>
          {/* Filters */}
          <div className="flex gap-2 items-center flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Bulan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Semua Bulan</SelectItem>
                {MONTH_NAMES.slice(1).map((m, i) => <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue placeholder="Tahun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Semua</SelectItem>
                {years.map(y => <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? <PayslipCardSkeleton /> : mySlips.length === 0 ? (
            <EmptyState icon={FileText} title="Tidak ada slip gaji" description="Slip gaji Anda akan muncul di sini setelah dikirim oleh admin." compact />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mySlips.map(slip => (
                <div key={slip.id} className="ms-card-hover p-4 cursor-pointer" onClick={() => setViewingPdf(slip)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /><span className="text-xs font-semibold text-foreground">{MONTH_NAMES[slip.month]} {slip.year}</span></div>
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Lihat Slip Gaji</p>
                  <p className="text-[10px] text-muted-foreground">Klik untuk membuka PDF</p>
                </div>
              ))}
            </div>
          )}

          {/* PDF Viewer */}
          <Dialog open={!!viewingPdf} onOpenChange={o => { if (!o) setViewingPdf(null); }}>
            <DialogContent className="max-w-3xl max-h-[85vh]">
              {viewingPdf && (
                <>
                  <DialogHeader><DialogTitle className="text-sm">Slip Gaji — {MONTH_NAMES[viewingPdf.month]} {viewingPdf.year}</DialogTitle></DialogHeader>
                  <iframe src={getUploadUrl(viewingPdf.pdfUrl)} className="w-full h-[65vh] rounded-md border border-border" title="Slip Gaji PDF" />
                </>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* PIN Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="text-sm text-center">Masukkan PIN</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">PIN (maks. 6 digit)</Label>
              <Input type="password" maxLength={6} value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, ""))} placeholder="••••••" className="text-center text-lg tracking-[0.5em]" onKeyDown={e => e.key === "Enter" && handlePinVerify()} />
            </div>
            {!user?.pin && <p className="text-[10px] text-muted-foreground text-center">PIN default: 1234</p>}
            <Button onClick={handlePinVerify} className="w-full text-xs">Verifikasi</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change PIN Dialog */}
      <Dialog open={changePinOpen} onOpenChange={o => { setChangePinOpen(o); if (!o) { setOldPin(""); setNewPin(""); setConfirmNewPin(""); } }}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="text-sm text-center">Ubah PIN</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">PIN Lama</Label><Input type="password" maxLength={6} value={oldPin} onChange={e => setOldPin(e.target.value.replace(/\D/g, ""))} placeholder="••••••" className="text-center text-lg tracking-[0.5em]" /></div>
            <div className="space-y-1"><Label className="text-xs">PIN Baru</Label><Input type="password" maxLength={6} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ""))} placeholder="••••••" className="text-center text-lg tracking-[0.5em]" /></div>
            <div className="space-y-1"><Label className="text-xs">Konfirmasi PIN</Label><Input type="password" maxLength={6} value={confirmNewPin} onChange={e => setConfirmNewPin(e.target.value.replace(/\D/g, ""))} placeholder="••••••" className="text-center text-lg tracking-[0.5em]" /></div>
            <Button className="w-full text-xs" onClick={async () => {
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
