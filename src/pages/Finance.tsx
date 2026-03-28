import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { useMenuSettings } from "@/contexts/MenuSettingsContext";
import type { Reimbursement } from "@/types";
import { motion } from "framer-motion";
import { Receipt, Plus, Check, X, Paperclip, FileText, Eye } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmployeeGrid, { EmployeeHeader } from "@/components/EmployeeGrid";
import { useAdminBadges } from "@/hooks/useAdminBadges";

const REQUEST_BADGE: Record<string, string> = { pending: "bg-warning/10 text-warning border-warning/20", approved: "bg-success/10 text-success border-success/20", rejected: "bg-destructive/10 text-destructive border-destructive/20" };
const REQUEST_LABEL: Record<string, string> = { pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak" };
const formatCurrency = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const Finance = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { hasAccess } = useMenuSettings();
  const canManage = isAdmin || hasAccess("finance");
  const adminBadges = useAdminBadges();
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [reimbOpen, setReimbOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rCategory, setRCategory] = useState("Transportasi");
  const [rAmount, setRAmount] = useState("");
  const [rDesc, setRDesc] = useState("");
  const [rAttachments, setRAttachments] = useState<string[]>([]);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approvePayNote, setApprovePayNote] = useState("Transfer langsung");
  const [approvePayDate, setApprovePayDate] = useState("");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmReject, setConfirmReject] = useState<string | null>(null);
  const [viewAttachments, setViewAttachments] = useState<string[] | null>(null);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (employeeId) params.userId = employeeId;
    else if (!canManage && user) params.userId = user.id;
    api.getReimbursements(params).then(setReimbursements).catch(() => {});
  }, [employeeId, isAdmin, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const files = e.target.files; if (!files) return; setRAttachments((prev) => [...prev, ...Array.from(files).map((f) => f.name)]); };

  const doApprove = async () => {
    if (!approveId || !approvePayDate) { toast.error("Isi tanggal pembayaran"); return; }
    try { await api.approveReimbursement(approveId, { status: "approved", paymentNote: approvePayNote, paymentDate: approvePayDate }); setReimbursements(reimbursements.map((r) => r.id === approveId ? { ...r, status: "approved" as const, approvedBy: user?.id, paymentNote: approvePayNote, paymentDate: approvePayDate } : r)); setApproveDialogOpen(false); setApproveId(null); toast.success("Reimbursement disetujui"); } catch { toast.error("Gagal"); }
  };

  const doReject = async () => {
    if (confirmReject) { try { await api.approveReimbursement(confirmReject, { status: "rejected" }); setReimbursements(reimbursements.map((r) => r.id === confirmReject ? { ...r, status: "rejected" as const } : r)); setConfirmReject(null); toast.info("Reimbursement ditolak"); } catch { toast.error("Gagal"); } }
  };

  if (canManage && !employeeId) {
    return (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3"><h1 className="text-lg font-semibold text-foreground">Keuangan</h1><EmployeeGrid basePath="/finance" badgeCounts={Object.fromEntries(Object.entries(adminBadges.perEmployee).map(([k, v]) => [k, v.finance]))} /></motion.div>);
  }

  if (canManage && employeeId) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <EmployeeHeader employeeId={employeeId} backPath="/finance" />
        <div className="space-y-2">{reimbursements.length === 0 ? <EmptyState icon={Receipt} title="Belum ada pengajuan" description="Karyawan ini belum mengajukan reimbursement apapun." compact /> : reimbursements.map((r) => (<div key={r.id} className="ms-card p-3"><div className="flex items-start justify-between"><div className="space-y-0.5 flex-1"><div className="flex items-center gap-2 flex-wrap"><span className="text-xs font-medium text-foreground">{r.category}</span><span className="text-xs font-semibold text-foreground">{formatCurrency(r.amount)}</span><span className={`text-[10px] px-2 py-0.5 rounded-full border ${REQUEST_BADGE[r.status]}`}>{REQUEST_LABEL[r.status]}</span></div><p className="text-[10px] text-muted-foreground">{r.description}</p><p className="text-[10px] text-muted-foreground">{r.createdAt}</p>{r.status === "approved" && r.paymentNote && <div className="mt-1 p-2 rounded bg-success/5 border border-success/20"><p className="text-[10px] text-success font-medium">{r.paymentNote}</p>{r.paymentDate && <p className="text-[10px] text-muted-foreground">Dibayar: {r.paymentDate}</p>}</div>}</div>{r.status === "pending" && <div className="flex gap-1 shrink-0 ml-2"><Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-success" onClick={() => { setApproveId(r.id); setApproveDialogOpen(true); }}><Check className="w-3.5 h-3.5" /></Button><Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => setConfirmReject(r.id)}><X className="w-3.5 h-3.5" /></Button></div>}</div></div>))}</div>
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle className="text-sm">Setujui & Keterangan Pembayaran</DialogTitle></DialogHeader><div className="space-y-3"><div className="space-y-1"><Label className="text-xs">Metode Pembayaran</Label><Select value={approvePayNote} onValueChange={setApprovePayNote}><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Transfer langsung" className="text-xs">Transfer langsung</SelectItem><SelectItem value="Ditambahkan ke slip gaji bulan depan" className="text-xs">Masuk slip gaji bulan depan</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label className="text-xs">Tanggal Pembayaran</Label><Input type="date" value={approvePayDate} onChange={(e) => setApprovePayDate(e.target.value)} className="text-xs" /></div><Button onClick={doApprove} className="w-full text-xs">Setujui</Button></div></DialogContent></Dialog>
        <ConfirmDialog open={!!confirmReject} onOpenChange={(o) => { if (!o) setConfirmReject(null); }} title="Tolak pengajuan ini?" variant="destructive" confirmText="Tolak" onConfirm={doReject} />
      </motion.div>
    );
  }

  // Employee
  const doSubmitReimb = async () => {
    const amt = parseInt(rAmount);
    try { const newR = await api.createReimbursement({ category: rCategory, amount: amt, description: rDesc.trim(), attachments: rAttachments }); setReimbursements([newR, ...reimbursements]); setReimbOpen(false); setRAmount(""); setRDesc(""); setRAttachments([]); setConfirmSubmit(false); toast.success("Pengajuan reimbursement berhasil"); } catch { toast.error("Gagal mengirim"); setConfirmSubmit(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2"><h1 className="text-lg font-semibold text-foreground">Keuangan</h1><Dialog open={reimbOpen} onOpenChange={setReimbOpen}><DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1 text-xs"><Receipt className="w-3.5 h-3.5" /> Ajukan Reimbursement</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle className="text-sm">Ajukan Reimbursement</DialogTitle></DialogHeader><div className="space-y-3"><div className="space-y-1"><Label className="text-xs">Kategori</Label><Select value={rCategory} onValueChange={setRCategory}><SelectTrigger className="text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Transportasi" className="text-xs">Transportasi</SelectItem><SelectItem value="Operasional" className="text-xs">Operasional</SelectItem><SelectItem value="Makan" className="text-xs">Makan</SelectItem><SelectItem value="Lainnya" className="text-xs">Lainnya</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label className="text-xs">Nominal (Rp)</Label><Input type="number" value={rAmount} onChange={(e) => setRAmount(e.target.value)} placeholder="150000" className="text-xs" /></div><div className="space-y-1"><Label className="text-xs">Keterangan</Label><Textarea value={rDesc} onChange={(e) => setRDesc(e.target.value)} placeholder="Deskripsi pengeluaran..." className="text-xs" rows={2} /></div><div className="space-y-1"><Label className="text-xs">Lampiran Bukti (wajib)</Label><input ref={fileRef} type="file" multiple accept="image/*,.pdf" onChange={handleFileChange} className="hidden" /><Button size="sm" variant="outline" className="gap-1 text-xs w-full" onClick={() => fileRef.current?.click()}><Paperclip className="w-3 h-3" /> Pilih File</Button>{rAttachments.length > 0 && <div className="space-y-1 mt-1">{rAttachments.map((name, i) => (<div key={i} className="flex items-center gap-2 text-xs bg-muted px-2 py-1 rounded"><FileText className="w-3 h-3 text-muted-foreground" /><span className="truncate flex-1">{name}</span><button onClick={() => setRAttachments(rAttachments.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button></div>))}</div>}</div><Button onClick={() => { const amt = parseInt(rAmount); if (!amt || !rDesc.trim() || rAttachments.length === 0) { toast.error("Lengkapi semua field dan lampiran bukti"); return; } setConfirmSubmit(true); }} className="w-full text-xs">Kirim</Button></div></DialogContent></Dialog></div>
      <div className="space-y-2">{reimbursements.length === 0 ? <EmptyState icon={Receipt} title="Belum ada pengajuan reimbursement" description="" /> : reimbursements.map((r) => (<div key={r.id} className="ms-card p-3"><div className="flex items-start justify-between"><div className="space-y-0.5 flex-1"><div className="flex items-center gap-2 flex-wrap"><span className="text-xs font-medium text-foreground">{r.category}</span><span className="text-xs font-semibold text-foreground">{formatCurrency(r.amount)}</span><span className={`text-[10px] px-2 py-0.5 rounded-full border ${REQUEST_BADGE[r.status]}`}>{REQUEST_LABEL[r.status]}</span></div><p className="text-[10px] text-muted-foreground">{r.description}</p><p className="text-[10px] text-muted-foreground">{r.createdAt}</p>{r.status === "approved" && r.paymentNote && <div className="mt-1 p-2 rounded bg-success/5 border border-success/20"><p className="text-[10px] text-success font-medium">💰 {r.paymentNote}</p>{r.paymentDate && <p className="text-[10px] text-muted-foreground">Dibayar: {r.paymentDate}</p>}</div>}</div></div></div>))}</div>
      <ConfirmDialog open={confirmSubmit} onOpenChange={setConfirmSubmit} title="Kirim pengajuan?" description="Pengajuan reimbursement akan dikirim ke admin." onConfirm={doSubmitReimb} />
    </motion.div>
  );
};

export default Finance;