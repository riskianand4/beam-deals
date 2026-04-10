import { useCallback, useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMenuSettings } from "@/contexts/MenuSettingsContext";
import api, { getUploadUrl } from "@/lib/api";
import type { ApprovalRequest, User } from "@/types";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Copy,
  Download,
  Edit2,
  Eye,
  FileText,
  MessageSquare,
  Plus,
  Search,
  Send,
  Trash2,
  X,
  XCircle,
  MoreVertical,
  Calendar,
  Info,
  Paperclip
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import SuccessDialog from "@/components/SuccessDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow, format } from "date-fns";
import { id as localeID } from "date-fns/locale";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  reviewing: "bg-primary/10  border-primary/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  reviewing: "Sedang Ditinjau",
  approved: "Disetujui",
  rejected: "Ditolak",
};

const TYPE_LABEL: Record<string, string> = {
  leave: "Cuti/Izin",
  permission: "Izin",
  kendaraan: "Penggunaan Kendaraan",
  other: "Lainnya",
};

const Approval = () => {
  const { user, isAdmin, users } = useAuth();
  const { hasAccess } = useMenuSettings();
  const canApprove = isAdmin || hasAccess("approve");
  const hasCCAccess = hasAccess("viewApproval"); 

  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<ApprovalRequest | null>(null);
  
  type FormType = "permission" | "kendaraan" | "other";

  const [formType, setFormType] = useState<FormType | undefined>(undefined);
  const [formSubject, setFormSubject] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formApprovers, setFormApprovers] = useState<string[]>([]);
  const [formCC, setFormCC] = useState<string[]>([]);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [approverSearch, setApproverSearch] = useState("");
  const [ccSearch, setCcSearch] = useState("");

  const [respondDialog, setRespondDialog] = useState<{ approval: ApprovalRequest; action: "approved" | "rejected" } | null>(null);
  const [respondReason, setRespondReason] = useState("");
  const [respondFile, setRespondFile] = useState<File | null>(null);

  const [successDialog, setSuccessDialog] = useState<{ title: string; description?: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [approverUsers, setApproverUsers] = useState<User[]>([]);

  // Comment state
  const [commentText, setCommentText] = useState("");

  // Edit/reset response state
  const [editResponseDialog, setEditResponseDialog] = useState<{ approvalId: string; approver: any } | null>(null);
  const [editResponseReason, setEditResponseReason] = useState("");
  const [editResponseFile, setEditResponseFile] = useState<File | null>(null);
  const [confirmResetResponse, setConfirmResetResponse] = useState<{ approvalId: string; approverId: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getApprovals();
      setApprovals(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { api.getApprovers().then(setApproverUsers).catch(() => []); }, []);

  const getUserName = (id: string) => users.find((u) => u.id === id)?.name ?? "Tidak dikenal";
  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

  const handleCreate = async () => {
    if (!formSubject.trim() || formApprovers.length === 0 || !formFile) return;
    const formData = new FormData();
    formData.append("type", formType as string);
    formData.append("subject", formSubject.trim());
    formData.append("description", formDesc.trim());
    formData.append("approvers", JSON.stringify(formApprovers.map((id) => ({ userId: id }))));
    if (formCC.length > 0) {
      formData.append("cc", JSON.stringify(formCC.map((id) => ({ userId: id, name: getUserName(id) }))));
    }
    formData.append("attachment", formFile);
    try {
      await api.createApproval(formData);
      setCreateOpen(false);
      setFormSubject("");
      setFormDesc("");
      setFormApprovers([]);
      setFormCC([]);
      setFormFile(null);
      refresh();
      setSuccessDialog({ title: "Permintaan berhasil dikirim!" });
    } catch {}
  };

  const handleRespond = async () => {
    if (!respondDialog) return;
    try {
      if (respondFile) {
        const fd = new FormData();
        fd.append("responseAttachment", respondFile);
        await api.respondApproval(respondDialog.approval.id, respondDialog.action, respondReason, fd);
      } else {
        await api.respondApproval(respondDialog.approval.id, respondDialog.action, respondReason);
      }
      setRespondDialog(null);
      setRespondReason("");
      setRespondFile(null);
      refresh();
      setSuccessDialog({
        title: respondDialog.action === "approved" ? "Permintaan disetujui!" : "Permintaan ditolak",
      });
      // Update detail view if open
      if (detailOpen && detailOpen.id === respondDialog.approval.id) {
          refresh();
          const updated = await api.getApprovals();
          const fresh = updated.find((a: any) => a.id === detailOpen.id);
          if (fresh) setDetailOpen(fresh);
      }
    } catch {}
  };

  const handleUpdateStatus = async (approvalId: string, status: string) => {
    try {
      await api.updateApprovalStatus(approvalId, status);
      refresh();
    } catch {}
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.deleteApproval(confirmDeleteId);
      setApprovals((prev) => prev.filter((a) => a.id !== confirmDeleteId));
      setConfirmDeleteId(null);
      if (detailOpen?.id === confirmDeleteId) setDetailOpen(null);
      setSuccessDialog({ title: "Berhasil dihapus" });
    } catch {}
  };

  const handleAddComment = async () => {
    if (!detailOpen || !commentText.trim()) return;
    try {
      await api.addApprovalComment(detailOpen.id, { text: commentText.trim() });
      setCommentText("");
      refresh();
      const updated = await api.getApprovals();
      const fresh = updated.find((a: any) => a.id === detailOpen.id);
      if (fresh) setDetailOpen(fresh);
    } catch {}
  };

  const toggleApprover = (id: string) => {
    setFormApprovers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleCC = (id: string) => {
    setFormCC((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const filteredApproverUsers = approverUsers.filter((u) => u.name.toLowerCase().includes(approverSearch.toLowerCase()));

  const myRequests = approvals.filter((a) => a.requesterId === user?.id);
  const reviewRequests = approvals.filter((a) => a.approvers.some((ap) => ap.userId === user?.id));
  const canCreate = true;

  const renderKanbanCard = (a: ApprovalRequest, showActions: boolean) => (
    <motion.div
      key={a.id}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border shadow-sm rounded-lg p-3 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group"
      onClick={() => setDetailOpen(a)}
    >
      <div className="space-y-2.5">
        <div className="flex items-start justify-between">
          <Badge variant="secondary" className="text-[9px] bg-secondary/50 text-secondary-foreground font-medium">
            {TYPE_LABEL[a.type] || "Lainnya"}
          </Badge>
          
          {/* Menu Titik Tiga (Aksi) */}
          {(isAdmin || a.requesterId === user?.id) && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
               <Popover>
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" className="w-6 h-6 -mr-1 -mt-1 text-muted-foreground hover:text-foreground">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-36 p-1" align="end">
                   {(canApprove || a.requesterId === user?.id) && a.overallStatus === "pending" && (
                    <button
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      onClick={() => setConfirmDeleteId(a.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
        
        <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
          {a.subject}
        </p>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <Avatar className="w-5 h-5 border shadow-sm">
              <AvatarFallback className="bg-primary/10  text-[7px] font-bold">
                {getInitials(a.requesterName || getUserName(a.requesterId))}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[100px]">
              {a.requesterName || getUserName(a.requesterId)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
             <Clock className="w-2.5 h-2.5" />
             {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: localeID })}
          </div>
        </div>

        {/* Quick Actions (Inline) */}
        {showActions && a.overallStatus === "pending" && (
          <Button size="sm" variant="outline" className="w-full text-[10px] h-7 mt-2 gap-1.5 bg-primary/5 hover:bg-primary/10 border-primary/20 "
            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(a.id, "reviewing"); }}
          >
            <ArrowRight className="w-3 h-3" /> Mulai Tinjau
          </Button>
        )}
        {showActions && a.overallStatus === "reviewing" && a.approvers.some((ap) => ap.userId === user?.id && ap.status === "pending") && (
          <div className="flex gap-1.5 mt-2">
            <Button size="sm" className="flex-1 text-[10px] h-7 gap-1" onClick={(e) => { e.stopPropagation(); setRespondDialog({ approval: a, action: "approved" }); }}>
              <CheckCircle className="w-3 h-3" /> Setujui
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7 gap-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={(e) => { e.stopPropagation(); setRespondDialog({ approval: a, action: "rejected" }); }}>
              <XCircle className="w-3 h-3" /> Tolak
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderKanbanColumn = (title: string, icon: React.ReactNode, items: ApprovalRequest[], color: string, showActions: boolean) => (
    <div className="flex-1 min-w-[280px] flex flex-col bg-muted/20 border border-border rounded-xl overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-3 bg-card border-b border-border shadow-sm`}>
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${color}`}>{icon}</div>
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <Badge variant="secondary" className="text-[10px] ml-auto font-medium">
          {items.length}
        </Badge>
      </div>
      <ScrollArea className="flex-1 h-[calc(100vh-280px)] min-h-[400px] p-3">
        <div className="space-y-3 pb-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center space-y-2 opacity-50">
               <FileText className="w-8 h-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Kosong</p>
            </div>
          ) : items.map((a) => renderKanbanCard(a, showActions))}
        </div>
      </ScrollArea>
    </div>
  );

  const renderKanbanBoard = (showActions: boolean, sourceApprovals?: ApprovalRequest[]) => {
    const src = sourceApprovals || approvals;
    const pending = src.filter((a) => a.overallStatus === "pending");
    const reviewing = src.filter((a) => a.overallStatus === "reviewing");
    const done = src.filter((a) => a.overallStatus === "approved" || a.overallStatus === "rejected");

    return (
      <div className="flex gap-4 overflow-x-auto pb-2 items-stretch h-full">
        {renderKanbanColumn("Menunggu", <Clock className="w-3.5 h-3.5 text-warning" />, pending, "bg-warning/10", showActions)}
        {renderKanbanColumn("Sedang Ditinjau", <Eye className="w-3.5 h-3.5 " />, reviewing, "bg-primary/10", showActions)}
        {renderKanbanColumn("Selesai", <CheckCircle className="w-3.5 h-3.5 text-success" />, done, "bg-success/10", false)}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <ClipboardCheck className="w-5 h-5 text-primary" /> Pengajuan & Persetujuan
        </h1>
        {canCreate && (
          <Button size="sm" className="gap-1.5 text-xs h-8 shadow-sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Buat Pengajuan
          </Button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : (
        <div className="flex-1">
          {isAdmin ? (
            renderKanbanBoard(true)
          ) : canApprove ? (
            <Tabs defaultValue="all" className="h-full flex flex-col">
              <TabsList className="w-[320px] grid grid-cols-3 mb-4">
                <TabsTrigger value="all" className="text-[11px] h-8"><ClipboardCheck className="w-3.5 h-3.5 mr-1.5" />Semua</TabsTrigger>
                <TabsTrigger value="my-requests" className="text-[11px] h-8"><FileText className="w-3.5 h-3.5 mr-1.5" />Pengajuanku</TabsTrigger>
                <TabsTrigger value="reviews" className="text-[11px] h-8"><Eye className="w-3.5 h-3.5 mr-1.5" />Peninjauan</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="flex-1 mt-0">{renderKanbanBoard(true)}</TabsContent>
              <TabsContent value="my-requests" className="flex-1 mt-0">{renderKanbanBoard(false, myRequests)}</TabsContent>
              <TabsContent value="reviews" className="flex-1 mt-0">{renderKanbanBoard(true, reviewRequests)}</TabsContent>
            </Tabs>
          ) : (
            <Tabs defaultValue="my-requests" className="h-full flex flex-col">
              <TabsList className="w-[240px] grid grid-cols-2 mb-4">
                <TabsTrigger value="my-requests" className="text-[11px] h-8"><FileText className="w-3.5 h-3.5 mr-1.5" />Pengajuanku</TabsTrigger>
                <TabsTrigger value="reviews" className="text-[11px] h-8"><Eye className="w-3.5 h-3.5 mr-1.5" />Peninjauan</TabsTrigger>
              </TabsList>
              <TabsContent value="my-requests" className="flex-1 mt-0">{renderKanbanBoard(false, myRequests)}</TabsContent>
              <TabsContent value="reviews" className="flex-1 mt-0">{renderKanbanBoard(true, reviewRequests)}</TabsContent>
            </Tabs>
          )}
        </div>
      )}

      {/* DETAIL DIALOG (2 COLUMN LAYOUT) */}
      <Dialog open={!!detailOpen} onOpenChange={(o) => { if (!o) setDetailOpen(null); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0">
          {detailOpen && (
            <>
              {/* Header Modal */}
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-card">
                <DialogHeader className="p-0">
                  <DialogTitle className="text-base flex items-center gap-2 font-bold text-foreground">
                    <ClipboardCheck className="w-5 h-5 " /> Detail Pengajuan
                  </DialogTitle>
                </DialogHeader>
                <Badge variant="outline" className={`text-xs px-2.5 py-1 ${STATUS_BADGE[detailOpen.overallStatus]}`}>
                  {STATUS_LABEL[detailOpen.overallStatus]}
                </Badge>
              </div>

              {/* Body Modal - 2 Columns */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-muted/10">
                <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6">
                  
                  {/* KOLOM KIRI (Info & Deskripsi) */}
                  <div className="space-y-5">
                    
                    {/* Header Info */}
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                       <div className="flex items-start gap-4">
                          <Avatar className="w-12 h-12 border shadow-sm">
                            <AvatarFallback className="bg-primary/10  font-bold text-lg">
                              {getInitials(detailOpen.requesterName || getUserName(detailOpen.requesterId))}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1 flex-1">
                             <p className="text-sm font-bold text-foreground leading-none">{detailOpen.requesterName || getUserName(detailOpen.requesterId)}</p>
                             <div className="flex items-center gap-2 text-xs text-muted-foreground">
                               <Calendar className="w-3.5 h-3.5" /> 
                               {format(new Date(detailOpen.createdAt), "dd MMM yyyy, HH:mm", { locale: localeID })}
                             </div>
                             <Badge variant="secondary" className="text-[10px] mt-1">{TYPE_LABEL[detailOpen.type]}</Badge>
                          </div>
                       </div>
                       
                       <div className="pt-3 border-t border-border">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Subjek Pengajuan</p>
                          <h3 className="text-sm font-semibold text-foreground">{detailOpen.subject}</h3>
                       </div>
                       
                       {detailOpen.description && (
                          <div className="pt-2">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Deskripsi Lengkap</p>
                            <div className="text-xs text-foreground bg-muted/30 p-3 rounded-lg whitespace-pre-wrap leading-relaxed border border-border/50">
                              {detailOpen.description}
                            </div>
                          </div>
                       )}
                    </div>

                    {/* Lampiran / CC */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {detailOpen.attachmentUrl && (
                        <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-2">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Paperclip className="w-3 h-3"/> Lampiran Bukti</p>
                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border">
                             <FileText className="w-6 h-6 " />
                             <div className="flex-1 flex gap-2">
                                <a href={getUploadUrl(detailOpen.attachmentUrl)} target="_blank" rel="noreferrer" className="flex-1 text-[10px] font-semibold bg-background hover:bg-muted text-foreground px-2 py-1.5 rounded border border-border text-center transition-colors">Lihat File</a>
                                <a href={getUploadUrl(detailOpen.attachmentUrl)} download className="flex-1 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground px-2 py-1.5 rounded text-center transition-colors">Unduh</a>
                             </div>
                          </div>
                        </div>
                      )}

                      {detailOpen.cc && detailOpen.cc.length > 0 && (
                        <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-2">
                           <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">CC (Tembusan)</p>
                           <div className="flex flex-wrap gap-1.5">
                             {detailOpen.cc.map((cc: any, i: number) => (
                               <Badge key={i} variant="outline" className="text-[10px] bg-background">
                                 {cc.name || getUserName(cc.userId)}
                               </Badge>
                             ))}
                           </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* KOLOM KANAN (Status Reviewer & Komentar) */}
                  <div className="space-y-5 flex flex-col">
                    
                    {/* Status Peninjau */}
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-3">
                       <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Eye className="w-4 h-4 text-primary" /> Status Peninjau</p>
                       <div className="space-y-2">
                          {detailOpen.approvers.map((appr: any, i: number) => (
                            <div key={i} className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-2 relative overflow-hidden">
                              <div className={`absolute top-0 left-0 w-1 h-full`} />
                              <div className="flex items-start justify-between pl-2">
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6 border shadow-sm">
                                    <AvatarFallback className="bg-primary/10 text-[8px] font-semibold">{getInitials(getUserName(appr.userId))}</AvatarFallback>
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
                                      <Paperclip className="w-3 h-3 text-primary" />
                                      File Peninjau {fi + 1}
                                    </a>
                                  ))}
                                </div>
                              )}

                              {/* Admin Actions for Reviewers */}
                              {appr.userId === user?.id && appr.status !== "pending" && (isAdmin || (detailOpen.overallStatus !== "approved" && detailOpen.overallStatus !== "rejected")) && (
                                <div className="pl-2 flex justify-end gap-1 mt-2">
                                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => {
                                    setEditResponseDialog({ approvalId: detailOpen.id, approver: appr });
                                    setEditResponseReason(appr.reason || "");
                                  }}>
                                    <Edit2 className="w-3 h-3 mr-1" /> Edit Respon
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                       </div>
                    </div>

                    {/* Komentar */}
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex-1 flex flex-col">
                       <p className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-3"><MessageSquare className="w-4 h-4 text-primary" /> Diskusi & Komentar</p>
                       
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
                 {(canApprove || detailOpen.requesterId === user?.id) && (isAdmin || detailOpen.overallStatus === "pending") && (
                  <Button size="sm" variant="ghost" className="text-xs text-destructive hover:bg-destructive/10 mr-auto" onClick={() => { setDetailOpen(null); setConfirmDeleteId(detailOpen.id); }}>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Hapus Pengajuan
                  </Button>
                )}

                {/* Reviewer Actions */}
                {(isAdmin || (detailOpen.overallStatus !== "approved" && detailOpen.overallStatus !== "rejected")) && canApprove && detailOpen.overallStatus === "pending" && (
                  <Button size="sm" className="gap-1.5 text-xs h-9 px-6 bg-primary" onClick={() => { handleUpdateStatus(detailOpen.id, "reviewing"); setDetailOpen({ ...detailOpen, overallStatus: "reviewing" }); }}>
                    <ArrowRight className="w-3.5 h-3.5" /> Mulai Tinjau
                  </Button>
                )}

                {(isAdmin || (detailOpen.overallStatus !== "approved" && detailOpen.overallStatus !== "rejected")) && canApprove && (detailOpen.overallStatus === "reviewing" || detailOpen.overallStatus === "pending") && detailOpen.approvers.some((a: any) => a.userId === user?.id && a.status === "pending") && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-9 px-6 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setRespondDialog({ approval: detailOpen, action: "rejected" })}>
                      <XCircle className="w-3.5 h-3.5" /> Tolak
                    </Button>
                    <Button size="sm" className="gap-1.5 text-xs h-9 px-6 bg-success hover:bg-success/90 text-success-foreground" onClick={() => setRespondDialog({ approval: detailOpen, action: "approved" })}>
                      <CheckCircle className="w-3.5 h-3.5" /> Setujui
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* CREATE DIALOG */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if(!o) { setFormSubject(""); setFormDesc(""); setFormApprovers([]); setFormCC([]); setFormFile(null); setFormType(undefined); }}}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto flex flex-col  p-0 gap-0">
          <DialogHeader className="p-5 border-b border-border bg-card">
            <DialogTitle className="text-base flex items-center gap-2 font-bold">
              <Plus className="w-5 h-5 text-primary" /> Buat Pengajuan Baru
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-3 bg-muted/5 overflow-y-auto ">
            <div className="space-y-5 px-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipe Permintaan <span className="text-destructive">*</span></Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as typeof formType)}>
                  <SelectTrigger className="text-xs h-10 bg-background">
                    <SelectValue placeholder="Pilih jenis pengajuan..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permission" className="text-xs py-2">Pengajuan Izin / Cuti</SelectItem>
                    <SelectItem value="kendaraan" className="text-xs py-2">Penggunaan Kendaraan Inventaris</SelectItem>
                    <SelectItem value="other" className="text-xs py-2">Pengajuan Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Subjek Pengajuan <span className="text-destructive">*</span></Label>
                <Input value={formSubject} onChange={(e) => setFormSubject(e.target.value)} placeholder="cth. Izin Cuti Tahunan (3 Hari)" className="text-xs h-10 bg-background" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Deskripsi Lengkap</Label>
                <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Jelaskan secara rinci alasan atau tujuan pengajuan ini..." className="text-xs min-h-[100px] resize-none bg-background" />
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
                        <Badge key={id} variant="secondary" className="text-[10px] pl-2 pr-1 py-1 gap-1 bg-primary/10  hover:bg-primary/20">
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
                        <Copy className="w-3.5 h-3.5 mr-2" /> Tambah CC...
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
                <Label className="text-xs font-semibold">Lampiran Dokumen / Bukti <span className="text-destructive">*</span></Label>
                <div className="flex items-center gap-3">
                  <Input type="file" onChange={(e) => setFormFile(e.target.files?.[0] || null)} className="text-xs flex-1 cursor-pointer file:cursor-pointer file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3 hover:file:bg-primary/90" />
                </div>
                {!formFile && <p className="text-[10px] text-destructive flex items-center gap-1"><Info className="w-3 h-3"/> Lampiran pendukung wajib disertakan.</p>}
              </div>
            </div>
          </ScrollArea>

          <div className="p-5 border-t border-border bg-card flex justify-end gap-3">
             <Button variant="ghost" className="text-xs h-9 px-6" onClick={() => setCreateOpen(false)}>Batal</Button>
             <Button className="text-xs h-9 px-8" onClick={handleCreate} disabled={!formType || !formSubject.trim() || formApprovers.length === 0 || !formFile}>
              <Send className="w-3.5 h-3.5 mr-2" /> Kirim Pengajuan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Response Dialog */}
      <Dialog open={!!editResponseDialog} onOpenChange={(o) => { if (!o) { setEditResponseDialog(null); setEditResponseFile(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Edit Respon</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Alasan / Komentar</Label>
              <Textarea value={editResponseReason} onChange={e => setEditResponseReason(e.target.value)} className="min-h-[80px] text-xs resize-none" placeholder="Perbarui alasan penolakan/persetujuan..." />
            </div>
            <Button className="w-full text-xs h-9" onClick={async () => {
              if (!editResponseDialog) return;
              try {
                await api.editApprovalResponse(editResponseDialog.approvalId, { reason: editResponseReason });
                setEditResponseDialog(null);
                refresh();
                setSuccessDialog({ title: "Respon berhasil diperbarui" });
              } catch {}
            }}>Simpan Perubahan</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Dialogs */}
      <Dialog open={!!respondDialog} onOpenChange={(o) => { if (!o) { setRespondDialog(null); setRespondReason(""); setRespondFile(null); }}}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className={`text-base flex items-center gap-2 ${respondDialog?.action === 'approved' ? 'text-success' : 'text-destructive'}`}>
              {respondDialog?.action === "approved" ? <CheckCircle className="w-5 h-5"/> : <XCircle className="w-5 h-5"/>}
              {respondDialog?.action === "approved" ? "Setujui Pengajuan" : "Tolak Pengajuan"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan / Alasan {respondDialog?.action === 'rejected' ? <span className="text-destructive">*</span> : '(Opsional)'}</Label>
              <Textarea value={respondReason} onChange={(e) => setRespondReason(e.target.value)} placeholder="Berikan alasan keputusan Anda..." className="min-h-[80px] text-xs resize-none" />
            </div>
            <Button className={`w-full text-xs h-9 ${respondDialog?.action === 'approved' ? 'bg-success hover:bg-success/90 text-success-foreground' : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'}`} 
              onClick={handleRespond} 
              disabled={respondDialog?.action === 'rejected' && !respondReason.trim()}>
              Konfirmasi {respondDialog?.action === "approved" ? "Persetujuan" : "Penolakan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!confirmDeleteId} onOpenChange={(o) => { if (!o) setConfirmDeleteId(null); }} title="Hapus Pengajuan?" description="Pengajuan beserta semua lampiran dan komentar akan dihapus secara permanen." variant="destructive" confirmText="Hapus Permanen" onConfirm={handleDelete} />
      <SuccessDialog open={!!successDialog} onOpenChange={() => setSuccessDialog(null)} title={successDialog?.title || ""} description={successDialog?.description} />
    </motion.div>
  );
};

export default Approval;