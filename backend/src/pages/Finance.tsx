import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMenuSettings } from "@/contexts/MenuSettingsContext";
import api, { getUploadUrl } from "@/lib/api";
import type { Reimbursement, User } from "@/types";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  Download,
  Eye,
  FileText,
  Info,
  LayoutGrid,
  List,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Plus,
  Receipt,
  Search,
  Send,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import StatsCard from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import SuccessDialog from "@/components/SuccessDialog";
import { formatDistanceToNow, format } from "date-fns";
import { id as localeID } from "date-fns/locale";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  reviewing: "bg-primary/10   border-primary/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  reviewing: "Sedang Ditinjau",
  approved: "Disetujui",
  rejected: "Ditolak",
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const Finance = () => {
  const { user, isAdmin, users } = useAuth();
  const { hasAccess } = useMenuSettings();
  const canManage = isAdmin || hasAccess("finance");
  const isEmployee = !isAdmin && hasAccess("finance");

  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [manageTab, setManageTab] = useState<"kelola" | "pribadi">("kelola");

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [formSubject, setFormSubject] = useState("");
  const [formCategory, setFormCategory] = useState("Reimbursement");
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formApprovers, setFormApprovers] = useState<string[]>([]);
  const [formCC, setFormCC] = useState<string[]>([]);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [approverSearch, setApproverSearch] = useState("");
  const [ccSearch, setCcSearch] = useState("");
  const [approverUsers, setApproverUsers] = useState<User[]>([]);

  // Detail
  const [detailOpen, setDetailOpen] = useState<Reimbursement | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Respond
  const [respondDialog, setRespondDialog] = useState<{ reimb: Reimbursement; action: "approved" | "rejected" } | null>(null);
  const [respondReason, setRespondReason] = useState("");
  const [respondFile, setRespondFile] = useState<File | null>(null);

  // Comment
  const [commentText, setCommentText] = useState("");

  const [successDialog, setSuccessDialog] = useState<{ title: string; description?: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getReimbursements(canManage ? {} : { userId: user?.id || "" });
      setReimbursements(data);
    } catch { } finally { setLoading(false); }
  }, [canManage, user]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { api.getApprovers().then(setApproverUsers).catch(() => []); }, []);

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || "Tidak dikenal";
  const getUserAvatarUrl = (id: string) => { const u = users.find(u => u.id === id); return u?.avatar ? getUploadUrl(u.avatar) : null; };
  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  const categories = useMemo(() => {
    const cats = new Set(reimbursements.map(r => r.category));
    return Array.from(cats);
  }, [reimbursements]);

  const filtered = useMemo(() => {
    return reimbursements.filter(r => {
      const st = r.overallStatus || r.status;
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (search) {
        const name = (r.requesterName || getUserName(r.userId)).toLowerCase();
        const desc = (r.description || "").toLowerCase();
        const subj = (r.subject || "").toLowerCase();
        const q = search.toLowerCase();
        if (!name.includes(q) && !desc.includes(q) && !subj.includes(q)) return false;
      }
      return true;
    });
  }, [reimbursements, statusFilter, categoryFilter, search]);

  const stats = useMemo(() => ({
    total: reimbursements.length,
    pending: reimbursements.filter(r => (r.overallStatus || r.status) === "pending").length,
    approved: reimbursements.filter(r => (r.overallStatus || r.status) === "approved").length,
    rejected: reimbursements.filter(r => (r.overallStatus || r.status) === "rejected").length,
  }), [reimbursements]);

  const toggleApprover = (id: string) => setFormApprovers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleCC = (id: string) => setFormCC(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleCreate = async () => {
    const amt = parseInt(formAmount);
    if (!formSubject.trim() || !amt || formApprovers.length === 0 || !formFile) {
      toast.error("Lengkapi subjek, nominal, peninjau, dan lampiran");
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append("userId", user?.id || "");
      formData.append("subject", formSubject.trim());
      formData.append("category", formCategory);
      formData.append("amount", amt.toString());
      formData.append("description", formDesc.trim());
      formData.append("approvers", JSON.stringify(formApprovers.map(id => ({ userId: id, status: "pending", reason: "", reviewedAt: null }))));
      if (formCC.length > 0) {
        formData.append("cc", JSON.stringify(formCC.map(id => ({ userId: id, name: getUserName(id) }))));
      }
      formData.append("attachment", formFile);

      // Gunakan ini jika backend mendukung FormData. Jika murni JSON:
      await api.createReimbursement(formData as any); 
      
      setCreateOpen(false);
      setFormSubject(""); setFormAmount(""); setFormDesc(""); setFormApprovers([]); setFormCC([]); setFormFile(null);
      refresh();
      setSuccessDialog({ title: "Pengajuan pembayaran berhasil dikirim!" });
    } catch { toast.error("Gagal mengirim pengajuan"); }
  };

  const handleRespond = async () => {
    if (!respondDialog) return;
    try {
      if (respondFile) {
        const fd = new FormData();
        fd.append("responseAttachment", respondFile);
        await api.respondReimbursement(respondDialog.reimb.id, respondDialog.action, respondReason, fd);
      } else {
        await api.respondReimbursement(respondDialog.reimb.id, respondDialog.action, respondReason);
      }
      setRespondDialog(null);
      setRespondReason("");
      setRespondFile(null);
      refresh();
      setSuccessDialog({ title: respondDialog.action === "approved" ? "Pembayaran disetujui!" : "Pembayaran ditolak" });
      
      // Update detail view if open
      if (detailOpen && detailOpen.id === respondDialog.reimb.id) {
          const updated = await api.getReimbursements(canManage ? {} : { userId: user?.id || "" });
          const fresh = updated.find(r => r.id === detailOpen.id);
          if (fresh) setDetailOpen(fresh);
      }
    } catch { toast.error("Gagal memproses respon"); }
  };

  const handleUpdateStatus = async (reimbId: string, status: string) => {
    try {
      await api.updateReimbursementStatus(reimbId, status);
      refresh();
    } catch {}
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.deleteReimbursement(confirmDeleteId);
      setReimbursements(prev => prev.filter(r => r.id !== confirmDeleteId));
      setConfirmDeleteId(null);
      if (detailOpen?.id === confirmDeleteId) setDetailOpen(null);
      setSuccessDialog({ title: "Pengajuan berhasil dihapus" });
    } catch { toast.error("Gagal menghapus pengajuan"); }
  };

  const handleAddComment = async () => {
    if (!detailOpen || !commentText.trim()) return;
    try {
      await api.addReimbursementComment(detailOpen.id, { text: commentText.trim() });
      setCommentText("");
      refresh();
      const updated = await api.getReimbursements(canManage ? {} : { userId: user?.id || "" });
      const found = updated.find(r => r.id === detailOpen.id);
      if (found) setDetailOpen(found);
    } catch { toast.error("Gagal mengirim komentar"); }
  };

  // Render Table Component
  function renderList(items: Reimbursement[]) {
    if (items.length === 0) return <EmptyState icon={Receipt} title="Belum ada pengajuan pembayaran" description="Seluruh riwayat pengajuan akan tampil di sini." />;
    return (
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[35%]">Informasi Pengajuan</TableHead>
              <TableHead className="w-[20%]">Nominal</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right w-[80px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => {
              const st = r.overallStatus || r.status;
              return (
                <TableRow key={r.id} className="group cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setDetailOpen(r)}>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <Avatar className="w-9 h-9 border shadow-sm rounded-lg mt-0.5">
                        <AvatarFallback className="bg-primary/10   text-xs font-bold rounded-lg">
                          {getInitials(r.requesterName || getUserName(r.userId))}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm text-foreground line-clamp-1">{r.subject}</p>
                        <p className="text-xs text-muted-foreground">{r.requesterName || getUserName(r.userId)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-sm text-foreground">{formatCurrency(r.amount)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] bg-background">{r.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] border-transparent font-medium ${STATUS_BADGE[st]}`}>
                      {STATUS_LABEL[st]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {(canManage || r.userId === user?.id) && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button size="icon" variant="ghost" className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-1" align="end">
                            {st === "pending" && (
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                onClick={() => setConfirmDeleteId(r.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Hapus
                              </button>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }

  const renderManageView = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard label="Total Pengajuan" value={stats.total} icon={Receipt} color="" bgColor="bg-primary/10" delay={0} />
        <StatsCard label="Menunggu" value={stats.pending} icon={Clock} color="text-warning" bgColor="bg-warning/10" delay={1} />
        <StatsCard label="Disetujui" value={stats.approved} icon={ThumbsUp} color="text-success" bgColor="bg-success/10" delay={2} />
        <StatsCard label="Ditolak" value={stats.rejected} icon={ThumbsDown} color="text-destructive" bgColor="bg-destructive/10" delay={3} />
      </div>

      <div className="bg-card border border-border rounded-lg p-1 flex items-center gap-3 shadow-sm flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari pemohon atau subjek..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-xs bg-muted/30" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9 text-xs bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
            <SelectItem value="pending" className="text-xs">Menunggu</SelectItem>
            <SelectItem value="reviewing" className="text-xs">Sedang Ditinjau</SelectItem>
            <SelectItem value="approved" className="text-xs">Disetujui</SelectItem>
            <SelectItem value="rejected" className="text-xs">Ditolak</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px] h-9 text-xs bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Semua Kategori</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {renderList(filtered)}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-8xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
            <Wallet className="w-6 h-6 " /> Keuangan & Pembayaran
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Kelola dan ajukan pencairan dana operasional dengan mudah.</p>
        </div>
        <Button size="sm" className="gap-2 text-xs h-9 shadow-sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> Ajukan Pembayaran
        </Button>
      </div>

      {isEmployee ? (
        <Tabs value={manageTab} onValueChange={v => setManageTab(v as "kelola" | "pribadi")}>
          <TabsList className="mb-4">
            <TabsTrigger value="kelola" className="text-xs px-6 h-8">Kelola Pengajuan</TabsTrigger>
            <TabsTrigger value="pribadi" className="text-xs px-6 h-8">Pengajuan Pribadi</TabsTrigger>
          </TabsList>
          <TabsContent value="kelola" className="mt-0">{renderManageView()}</TabsContent>
          <TabsContent value="pribadi" className="mt-0">
            {renderList(reimbursements.filter(r => r.userId === user?.id))}
          </TabsContent>
        </Tabs>
      ) : (
        renderManageView()
      )}

      {/* DETAIL DIALOG (2-COLUMN LAYOUT) */}
      {detailOpen && (() => {
        const st = detailOpen.overallStatus || detailOpen.status;
        const isApprover = detailOpen.approvers?.some(a => a.userId === user?.id);
        const myApproverEntry = detailOpen.approvers?.find(a => a.userId === user?.id);
        const canRespond = isApprover && myApproverEntry?.status === "pending" && (st === "pending" || st === "reviewing");

        return (
          <Dialog open={!!detailOpen} onOpenChange={o => { if (!o) setDetailOpen(null); }}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col  p-0 gap-0">
              {/* Header Modal */}
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-card">
                <DialogHeader className="p-0">
                  <DialogTitle className="text-base flex items-center gap-2 font-bold text-foreground">
                    <Receipt className="w-5 h-5" /> Detail Pembayaran
                  </DialogTitle>
                </DialogHeader>
                <Badge variant="outline" className={`text-xs px-2.5 py-1 font-medium border-transparent ${STATUS_BADGE[st]}`}>
                  {STATUS_LABEL[st]}
                </Badge>
              </div>

              {/* Body Modal - 2 Columns */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-muted/10">
                <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6">
                  
                  {/* KOLOM KIRI (Info Pemohon, Nominal & Lampiran) */}
                  <div className="space-y-5">
                    <div className="bg-card p-4 sm:p-5 rounded-xl border border-border shadow-sm space-y-5">
                       {/* Requester Info */}
                       <div className="flex items-start gap-4">
                          <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                            {getUserAvatarUrl(detailOpen.userId) && <AvatarImage src={getUserAvatarUrl(detailOpen.userId)!} />}
                            <AvatarFallback className="bg-primary/10   font-bold text-lg">
                              {getInitials(detailOpen.requesterName || getUserName(detailOpen.userId))}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1 flex-1">
                             <p className="text-sm font-bold text-foreground leading-none">{detailOpen.requesterName || getUserName(detailOpen.userId)}</p>
                             <div className="flex items-center gap-2 text-xs text-muted-foreground">
                               <Calendar className="w-3.5 h-3.5" /> 
                               {format(new Date(detailOpen.createdAt || new Date()), "dd MMM yyyy, HH:mm", { locale: localeID })}
                             </div>
                             <Badge variant="secondary" className="text-[10px] mt-1 bg-muted">{detailOpen.category}</Badge>
                          </div>
                       </div>
                       
                       {/* Nominal Highlight */}
                       <div className=" p-4 rounded-xl border border-primary flex flex-col items-center justify-center">
                          <span className="text-[10px]   uppercase font-bold tracking-wider mb-1">Total Pengajuan</span>
                          <span className="text-3xl font-black ">{formatCurrency(detailOpen.amount)}</span>
                       </div>

                       {/* Subjek & Deskripsi */}
                       <div className="space-y-3 pt-2 border-t border-border">
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Subjek Pengajuan</p>
                            <h3 className="text-xs font-semibold text-foreground">{detailOpen.subject||"-"}</h3>
                          </div>
                          {detailOpen.description && (
                            <div className=" max-h-64 overflow-y-auto">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Deskripsi Lengkap</p>
                              <div className="text-xs text-foreground bg-muted/30 p-3 rounded-lg whitespace-pre-wrap leading-relaxed border border-border/50">
                                {detailOpen.description}
                              </div>
                            </div>
                          )}
                       </div>
                    </div>

                    {/* Lampiran Bukti Pemohon */}
                    <div className="bg-card p-4 sm:p-5 rounded-xl border border-border shadow-sm space-y-3">
                       <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                         <Paperclip className="w-3 h-3"/> Lampiran Bukti 
                       </p>
                       {/* Rendering logic for attachments depending on structure */}
                       {detailOpen.attachmentUrl ? (
                         <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border">
                            <FileText className="w-8 h-8 " />
                            <div className="flex-1 flex gap-2">
                               <a href={getUploadUrl(detailOpen.attachmentUrl as string)} target="_blank" rel="noreferrer" className="flex-1 text-[11px] font-semibold bg-background hover:bg-muted text-foreground px-3 py-2 rounded-md border border-border text-center transition-colors shadow-sm">Lihat File</a>
                               <a href={getUploadUrl(detailOpen.attachmentUrl as string)} download className="flex-1 text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 rounded-md text-center transition-colors shadow-sm">Unduh</a>
                            </div>
                         </div>
                       ) : detailOpen.attachments && detailOpen.attachments.length > 0 ? (
                         <div className="space-y-2">
                           {detailOpen.attachments.map((att: any, i: number) => (
                              <div key={i} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border">
                                <FileText className="w-8 h-8 " />
                                <div className="flex-1 flex gap-2">
                                   <a href={getUploadUrl(att.url || att)} target="_blank" rel="noreferrer" className="flex-1 text-[11px] font-semibold bg-background hover:bg-muted text-foreground px-3 py-2 rounded-md border border-border text-center transition-colors shadow-sm">Lihat File</a>
                                   <a href={getUploadUrl(att.url || att)} download className="flex-1 text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 rounded-md text-center transition-colors shadow-sm">Unduh</a>
                                </div>
                              </div>
                           ))}
                         </div>
                       ) : (
                         <p className="text-xs text-muted-foreground italic bg-muted/20 p-3 rounded-lg border border-dashed border-border text-center">Tidak ada lampiran bukti yang disertakan.</p>
                       )}
                    </div>

                    {/* CC (Tembusan) Pemohon */}
                    {detailOpen.cc && detailOpen.cc.length > 0 && (
                      <div className="bg-card p-4 sm:p-5 rounded-xl border border-border shadow-sm space-y-3">
                         <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                           <Copy className="w-3 h-3"/> CC (Tembusan)
                         </p>
                         <div className="flex flex-wrap gap-1.5">
                           {detailOpen.cc.map((cc: any, i: number) => (
                             <Badge key={i} variant="outline" className="text-[10px] bg-background font-medium">
                               {cc.name || getUserName(cc.userId)}
                             </Badge>
                           ))}
                         </div>
                      </div>
                    )}
                  </div>

                  {/* KOLOM KANAN (Status Reviewer & Komentar) */}
                  <div className="space-y-5 flex flex-col">
                    
                    {/* Status Peninjau */}
                    <div className="bg-card p-4 sm:p-5 rounded-xl border border-border shadow-sm space-y-4">
                       <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Eye className="w-4 h-4 " /> Status Peninjauan</p>
                       <div className="space-y-3">
                          {detailOpen.approvers.map((appr: any, i: number) => (
                            <div key={i} className="rounded-lg border border-border bg-muted/10 p-3 space-y-2 relative overflow-hidden">
                              <div className={`absolute top-0 left-0 w-1 h-full `} />
                              <div className="flex items-start justify-between pl-2">
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-7 h-7 border shadow-sm">
                                    {getUserAvatarUrl(appr.userId) && <AvatarImage src={getUserAvatarUrl(appr.userId)!} />}
                                    <AvatarFallback className="bg-primary/10   text-[8px] font-semibold">{getInitials(getUserName(appr.userId))}</AvatarFallback>
                                  </Avatar>
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-semibold text-foreground leading-none">{getUserName(appr.userId)}</p>
                                    <p className={`text-[9px] font-medium ${appr.status === 'approved' ? 'text-success' : appr.status === 'rejected' ? 'text-destructive' : 'text-warning'}`}>
                                      {STATUS_LABEL[appr.status] || appr.status}
                                    </p>
                                  </div>
                                </div>
                                {appr.reviewedAt && (
                                  <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" /> 
                                    {format(new Date(appr.reviewedAt), "dd MMM, HH:mm", {locale: localeID})}
                                  </span>
                                )}
                              </div>
                              
                              {appr.reason && (
                                <div className="pl-2 mt-2">
                                   <div className="text-[10px] text-foreground bg-background p-2 rounded border border-border/50 italic">
                                     "{appr.reason}"
                                   </div>
                                </div>
                              )}

                              {/* Lampiran Peninjau */}
                              {appr.attachmentUrl && (
                                <div className="pl-2 mt-2 flex flex-wrap gap-1.5">
                                  {(Array.isArray(appr.attachmentUrl) ? appr.attachmentUrl : [appr.attachmentUrl]).filter(Boolean).map((url: string, fi: number) => (
                                    <a
                                      key={fi}
                                      href={getUploadUrl(url)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] font-medium bg-background border border-border/60 px-2 py-1.5 rounded hover:bg-muted transition-colors text-foreground"
                                    >
                                      <Paperclip className="w-3 h-3 " />
                                      File Peninjau {fi + 1}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                       </div>
                    </div>

                    {/* Komentar */}
                    <div className="bg-card p-4 sm:p-5 rounded-xl border border-border shadow-sm flex-1 flex flex-col">
                       <p className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-3"><MessageSquare className="w-4 h-4 " /> Diskusi & Komentar</p>
                       
                       <ScrollArea className="flex-1 h-[150px] pr-3 -mr-3 mb-3">
                          {detailOpen.comments && detailOpen.comments.length > 0 ? (
                            <div className="space-y-3">
                              {detailOpen.comments.map((c: any, i: number) => (
                                <div key={i} className={`flex flex-col ${c.userId === user?.id ? 'items-end' : 'items-start'}`}>
                                   <div className="flex items-center gap-1.5 mb-1 mx-1">
                                      <span className="text-[9px] font-bold text-muted-foreground">{c.userId === user?.id ? 'Anda' : getUserName(c.userId)}</span>
                                      <span className="text-[8px] text-muted-foreground/70">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: localeID })}</span>
                                   </div>
                                   <div className={`text-xs p-2.5 rounded-xl max-w-[90%] ${c.userId === user?.id ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}>
                                     {c.text}
                                   </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
                              <MessageSquare className="w-6 h-6 mb-1" />
                              <span className="text-[10px]">Belum ada diskusi</span>
                            </div>
                          )}
                       </ScrollArea>

                       <div className="flex gap-2 pt-3 border-t border-border mt-auto">
                          <Input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Ketik komentar..." className="text-xs h-9 bg-muted/30 focus-visible:bg-background" onKeyDown={e => { if (e.key === "Enter") handleAddComment(); }} />
                          <Button size="icon" className="h-9 w-10 shrink-0" onClick={handleAddComment} disabled={!commentText.trim()}>
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                       </div>
                    </div>

                  </div>
                </div>
              </div>
              
              {/* Footer Actions (Sticky Bottom) */}
              <div className="p-4 sm:p-5 border-t border-border bg-card flex flex-wrap items-center justify-end gap-3">
                 {/* Owner/Admin Delete Action */}
                 {(canManage || detailOpen.userId === user?.id) && (isAdmin || detailOpen.overallStatus === "pending" || detailOpen.status === "pending") && (
                  <Button size="sm" variant="ghost" className="text-xs text-destructive hover:bg-destructive/10 mr-auto" onClick={() => { setDetailOpen(null); setConfirmDeleteId(detailOpen.id); }}>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Hapus Pengajuan
                  </Button>
                )}

                {/* Reviewer Actions */}
                {canManage && st === "pending" && !isApprover && (
                  <Button size="sm" className="gap-1.5 text-xs h-9 px-6 bg-primary" onClick={() => { handleUpdateStatus(detailOpen.id, "reviewing"); setDetailOpen({ ...detailOpen, overallStatus: "reviewing" } as any); }}>
                    <ArrowRight className="w-3.5 h-3.5" /> Mulai Tinjau Secara Paksa
                  </Button>
                )}
                
                {isApprover && myApproverEntry?.status === "pending" && st === "pending" && (
                  <Button size="sm" className="gap-1.5 text-xs h-9 px-6 bg-primary" onClick={() => { handleUpdateStatus(detailOpen.id, "reviewing"); setDetailOpen({ ...detailOpen, overallStatus: "reviewing" } as any); }}>
                    <ArrowRight className="w-3.5 h-3.5" /> Mulai Tinjau
                  </Button>
                )}

                {canRespond && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-9 px-6 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setRespondDialog({ reimb: detailOpen, action: "rejected" })}>
                      <XCircle className="w-3.5 h-3.5" /> Tolak
                    </Button>
                    <Button size="sm" className="gap-1.5 text-xs h-9 px-6 bg-success hover:bg-success/90 text-success-foreground" onClick={() => setRespondDialog({ reimb: detailOpen, action: "approved" })}>
                      <CheckCircle className="w-3.5 h-3.5" /> Setujui
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* CREATE DIALOG */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if(!o) { setFormSubject(""); setFormAmount(""); setFormDesc(""); setFormApprovers([]); setFormCC([]); setFormFile(null); }}}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0">
          <DialogHeader className="p-5 border-b border-border bg-card">
            <DialogTitle className="text-base flex items-center gap-2 font-bold">
              <Plus className="w-5 h-5" /> Ajukan Pembayaran
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-3 bg-muted/5 overflow-y-auto">
            <div className="space-y-5 p-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Subjek Pengajuan <span className="text-destructive">*</span></Label>
                <Input value={formSubject} onChange={(e) => setFormSubject(e.target.value)} placeholder="cth. Pembayaran Tiket Pesawat Dinas" className="text-xs h-10 bg-background" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Kategori <span className="text-destructive">*</span></Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger className="text-xs h-10 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Reimbursement", "Transportasi", "Operasional", "Makan", "Akomodasi", "Lainnya"].map(c => (
                        <SelectItem key={c} value={c} className="text-xs py-2">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nominal (Rp) <span className="text-destructive">*</span></Label>
                  <Input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="cth. 1500000" className="text-xs h-10 bg-background font-bold " />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Deskripsi Lengkap</Label>
                <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Jelaskan secara rinci rincian pengeluaran..." className="text-xs min-h-[100px] resize-none bg-background" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 p-4 border border-border rounded-xl bg-card">
                  <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    Peninjau (Approver) <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-[10px] text-muted-foreground">Pilih atasan yang berhak menyetujui.</p>
                  
                  {formApprovers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {formApprovers.map((id) => (
                        <Badge key={id} variant="secondary" className="text-[10px] pl-2 pr-1 py-1 gap-1 bg-primary/10   hover:bg-primary/20">
                          {getUserName(id)}
                          <button type="button" onClick={() => toggleApprover(id)} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-xs text-muted-foreground h-9 mt-2">
                        <Search className="w-3.5 h-3.5 mr-2" /> Tambah Peninjau...
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                      <Input placeholder="Cari nama..." value={approverSearch} onChange={(e) => setApproverSearch(e.target.value)} className="text-xs h-8 mb-2" />
                      <ScrollArea className="h-40">
                        <div className="space-y-0.5">
                          {approverUsers.filter((u) => u.name.toLowerCase().includes(approverSearch.toLowerCase())).map((u) => (
                            <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer transition-colors">
                              <Checkbox checked={formApprovers.includes(u.id)} onCheckedChange={() => toggleApprover(u.id)} className="w-3.5 h-3.5" />
                              <div className="flex flex-col">
                                <span className="text-xs text-foreground font-medium">{u.name}</span>
                                <span className="text-[9px] text-muted-foreground">{u.position || u.role}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2 p-4 border border-border rounded-xl bg-card">
                  <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    Tembusan (CC)
                  </Label>
                  <p className="text-[10px] text-muted-foreground">Pilih pihak yang perlu diinfokan.</p>
                  
                  {formCC.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {formCC.map((id) => (
                        <Badge key={id} variant="outline" className="text-[10px] pl-2 pr-1 py-1 gap-1">
                          {getUserName(id)}
                          <button type="button" onClick={() => toggleCC(id)} className="hover:bg-muted rounded-full p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-xs text-muted-foreground h-9 mt-2">
                        <Plus className="w-3.5 h-3.5 mr-2" /> Tambah CC...
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                      <Input placeholder="Cari nama..." value={ccSearch} onChange={(e) => setCcSearch(e.target.value)} className="text-xs h-8 mb-2" />
                      <ScrollArea className="h-40">
                        <div className="space-y-0.5">
                          {approverUsers.filter((u) => u.name.toLowerCase().includes(ccSearch.toLowerCase()) && !formApprovers.includes(u.id)).map((u) => (
                            <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer transition-colors">
                              <Checkbox checked={formCC.includes(u.id)} onCheckedChange={() => toggleCC(u.id)} className="w-3.5 h-3.5" />
                              <div className="flex flex-col">
                                <span className="text-xs text-foreground font-medium">{u.name}</span>
                                <span className="text-[9px] text-muted-foreground">{u.position || u.role}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2 p-4 border border-border rounded-xl bg-card border-dashed">
                <Label className="text-xs font-semibold">Lampiran Bukti (Kuitansi/Nota) <span className="text-destructive">*</span></Label>
                <div className="flex items-center gap-3">
                  <Input type="file" onChange={(e) => setFormFile(e.target.files?.[0] || null)} className="text-xs flex-1 cursor-pointer file:cursor-pointer file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3 hover:file:bg-primary/90" />
                </div>
                {!formFile && <p className="text-[10px] text-destructive flex items-center gap-1"><Info className="w-3 h-3"/> Lampiran bukti wajib disertakan.</p>}
              </div>
            </div>
          </ScrollArea>

          <div className="p-5 border-t border-border bg-card flex justify-end gap-3">
             <Button variant="ghost" className="text-xs h-9 px-6" onClick={() => setCreateOpen(false)}>Batal</Button>
             <Button className="text-xs h-9 px-8" onClick={handleCreate} disabled={!formSubject.trim() || !formAmount || formApprovers.length === 0 || !formFile}>
              <Send className="w-3.5 h-3.5 mr-2" /> Kirim Pengajuan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* RESPOND DIALOG */}
      <Dialog open={!!respondDialog} onOpenChange={o => { if (!o) { setRespondDialog(null); setRespondReason(""); setRespondFile(null); }}}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className={`text-base flex items-center gap-2 ${respondDialog?.action === 'approved' ? 'text-success' : 'text-destructive'}`}>
              {respondDialog?.action === "approved" ? <CheckCircle className="w-5 h-5"/> : <XCircle className="w-5 h-5"/>}
              {respondDialog?.action === "approved" ? "Setujui Pembayaran" : "Tolak Pembayaran"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan / Alasan {respondDialog?.action === 'rejected' ? <span className="text-destructive">*</span> : '(Opsional)'}</Label>
              <Textarea value={respondReason} onChange={(e) => setRespondReason(e.target.value)} placeholder="Berikan alasan keputusan Anda..." className="min-h-[80px] text-xs resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Lampiran Pendukung (Opsional)</Label>
              <Input type="file" onChange={(e) => setRespondFile(e.target.files?.[0] || null)} className="text-xs cursor-pointer file:cursor-pointer" />
            </div>
            <Button className={`w-full text-xs h-9 mt-2 ${respondDialog?.action === 'approved' ? 'bg-success hover:bg-success/90 text-success-foreground' : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'}`} 
              onClick={handleRespond} 
              disabled={respondDialog?.action === 'rejected' && !respondReason.trim()}>
              Konfirmasi {respondDialog?.action === "approved" ? "Persetujuan" : "Penolakan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={o => { if (!o) setConfirmDeleteId(null); }}
        title="Hapus Pengajuan?"
        description="Pengajuan beserta semua lampiran dan komentar akan dihapus secara permanen."
        variant="destructive"
        confirmText="Hapus Permanen"
        onConfirm={handleDelete}
      />
      <SuccessDialog open={!!successDialog} onOpenChange={() => setSuccessDialog(null)} title={successDialog?.title || ""} description={successDialog?.description} />
    </motion.div>
  );
};

export default Finance;