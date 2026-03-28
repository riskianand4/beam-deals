import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMenuSettings } from "@/contexts/MenuSettingsContext";
import api from "@/lib/api";
import type { ApprovalRequest, User } from "@/types";
import { motion } from "framer-motion";
import {
  ClipboardCheck, Plus, CheckCircle, XCircle, FileText, Download, Eye, Trash2, Paperclip, Search, X
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import SuccessDialog from "@/components/SuccessDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDistanceToNow } from "date-fns";
import { id as localeID } from "date-fns/locale";

const apiBase = import.meta.env.VITE_API_URL || "";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
};
const TYPE_LABEL: Record<string, string> = {
  leave: "Cuti/Izin",
  reimbursement: "Reimbursement",
  permission: "Izin",
  other: "Lainnya",
};

const Approval = () => {
  const { user, isAdmin, users } = useAuth();
  const { hasAccess } = useMenuSettings();
  const canApprove = isAdmin || hasAccess("approve");
  const canViewOnly = !isAdmin && !hasAccess("approve") && hasAccess("viewApproval");
  const isRegularEmployee = !isAdmin && !hasAccess("approve") && !hasAccess("viewApproval");

  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<ApprovalRequest | null>(null);

  // Create form
  const [formType, setFormType] = useState<"leave" | "reimbursement" | "permission" | "other">("leave");
  const [formSubject, setFormSubject] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formApprovers, setFormApprovers] = useState<string[]>([]);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [approverSearch, setApproverSearch] = useState("");

  // Response
  const [respondDialog, setRespondDialog] = useState<{ approval: ApprovalRequest; action: "approved" | "rejected" } | null>(null);
  const [respondReason, setRespondReason] = useState("");

  const [successDialog, setSuccessDialog] = useState<{ title: string; description?: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [approverUsers, setApproverUsers] = useState<User[]>([]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getApprovals();
      setApprovals(data);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    api.getApprovers().then(setApproverUsers).catch(() => []);
  }, []);

  const getUserName = (id: string) => users.find(u => u.id === id)?.name ?? "Tidak dikenal";
  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").substring(0, 2);

  const handleCreate = async () => {
    if (!formSubject.trim() || formApprovers.length === 0) return;
    const formData = new FormData();
    formData.append("type", formType);
    formData.append("subject", formSubject.trim());
    formData.append("description", formDesc.trim());
    formData.append("approvers", JSON.stringify(formApprovers.map(id => ({ userId: id }))));
    if (formFile) formData.append("attachment", formFile);

    try {
      await api.createApproval(formData);
      setCreateOpen(false);
      setFormSubject("");
      setFormDesc("");
      setFormApprovers([]);
      setFormFile(null);
      refresh();
      setSuccessDialog({ title: "Permintaan berhasil dikirim!" });
    } catch { }
  };

  const handleRespond = async () => {
    if (!respondDialog) return;
    try {
      await api.respondApproval(respondDialog.approval.id, respondDialog.action, respondReason);
      setRespondDialog(null);
      setRespondReason("");
      refresh();
      setSuccessDialog({
        title: respondDialog.action === "approved" ? "Permintaan disetujui!" : "Permintaan ditolak",
      });
    } catch { }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.deleteApproval(confirmDeleteId);
      setApprovals(prev => prev.filter(a => a.id !== confirmDeleteId));
      setConfirmDeleteId(null);
      setSuccessDialog({ title: "Berhasil dihapus" });
    } catch { }
  };

  const toggleApprover = (id: string) => {
    setFormApprovers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getUploadUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const base = apiBase.replace(/\/api\/?$/, "");
    return `${base}${path}`;
  };

  const filteredApproverUsers = approverUsers.filter(u =>
    u.name.toLowerCase().includes(approverSearch.toLowerCase())
  );

  // Filter approvals by role
  const myRequests = approvals.filter(a => a.requesterId === user?.id);
  const reviewRequests = approvals.filter(a => a.approvers.some(ap => ap.userId === user?.id));

  // Can this user create approvals? Admin/approver = NO, viewApproval = YES (they can also submit their own), regular = YES
  const canCreate = !canApprove;

  const renderApprovalCard = (a: ApprovalRequest, showActions: boolean) => (
    <div key={a.id} className="ms-card p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setDetailOpen(a)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-primary text-[10px] font-semibold">{getInitials(a.requesterName || getUserName(a.requesterId))}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-foreground">{a.requesterName || getUserName(a.requesterId)}</span>
              <Badge variant="outline" className="text-[8px] h-4 px-1">{TYPE_LABEL[a.type]}</Badge>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[a.overallStatus]}`}>{STATUS_LABEL[a.overallStatus]}</span>
            </div>
            <p className="text-xs font-medium text-foreground truncate">{a.subject}</p>
            {a.description && <p className="text-[10px] text-muted-foreground truncate">{a.description.substring(0, 100)}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {a.attachmentUrl && <Paperclip className="w-3 h-3 text-muted-foreground" />}
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: localeID })}
          </span>
          {a.requesterId === user?.id && (
            <Button size="icon" variant="ghost" className="w-6 h-6 text-destructive" onClick={e => { e.stopPropagation(); setConfirmDeleteId(a.id); }}>
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const renderApprovalList = (list: ApprovalRequest[], emptyMsg: string, showActions: boolean) => (
    list.length === 0 ? (
      <div className="ms-card p-8"><EmptyState icon={ClipboardCheck} title={emptyMsg} description="" compact /></div>
    ) : (
      <div className="space-y-2">
        {list.map(a => renderApprovalCard(a, showActions))}
      </div>
    )
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-8xl">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <ClipboardCheck className="w-4 h-4 text-primary" /> Persetujuan
        </h1>
        {canCreate && (
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Ajukan Persetujuan
          </Button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-muted-foreground">Memuat...</div>
      ) : canApprove ? (
        /* Admin / Approver: see all, can approve/reject, cannot create */
        renderApprovalList(approvals, "Belum ada permintaan persetujuan", true)
      ) : canViewOnly ? (
        /* viewApproval: 2 tabs - own requests + all reviews (read-only) */
        <Tabs defaultValue="my-requests">
          <TabsList>
            <TabsTrigger value="my-requests" className="text-xs">Persetujuan Saya</TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs">Semua Peninjauan</TabsTrigger>
          </TabsList>
          <TabsContent value="my-requests">
            {renderApprovalList(myRequests, "Belum ada permintaan yang Anda buat", false)}
          </TabsContent>
          <TabsContent value="reviews">
            {renderApprovalList(approvals, "Belum ada peninjauan", false)}
          </TabsContent>
        </Tabs>
      ) : (
        /* Regular employee: 2 tabs - own requests + reviews where they're an approver */
        <Tabs defaultValue="my-requests">
          <TabsList>
            <TabsTrigger value="my-requests" className="text-xs">Persetujuan Saya</TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs">Peninjauan</TabsTrigger>
          </TabsList>
          <TabsContent value="my-requests">
            {renderApprovalList(myRequests, "Belum ada permintaan yang Anda buat", false)}
          </TabsContent>
          <TabsContent value="reviews">
            {renderApprovalList(reviewRequests, "Belum ada peninjauan untuk Anda", false)}
          </TabsContent>
        </Tabs>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailOpen} onOpenChange={o => { if (!o) setDetailOpen(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-primary" /> Detail Persetujuan
            </DialogTitle>
          </DialogHeader>
          {detailOpen && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Pengaju</p>
                <p className="text-sm font-medium text-foreground">{detailOpen.requesterName || getUserName(detailOpen.requesterId)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Tipe</p>
                  <Badge variant="outline" className="text-xs">{TYPE_LABEL[detailOpen.type]}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE[detailOpen.overallStatus]}`}>{STATUS_LABEL[detailOpen.overallStatus]}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Subjek</p>
                <p className="text-sm text-foreground">{detailOpen.subject}</p>
              </div>
              {detailOpen.description && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Deskripsi</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{detailOpen.description}</p>
                </div>
              )}
              {detailOpen.attachmentUrl && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Bukti / Lampiran</p>
                  <div className="flex gap-2">
                    <a href={getUploadUrl(detailOpen.attachmentUrl)} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Lihat File
                    </a>
                    <a href={getUploadUrl(detailOpen.attachmentUrl)} download className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Download className="w-3 h-3" /> Unduh
                    </a>
                  </div>
                </div>
              )}

              {/* Approver statuses */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Status Peninjau</p>
                {detailOpen.approvers.map((appr, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg border border-border">
                    <span className="text-xs font-medium text-foreground">{getUserName(appr.userId)}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[appr.status]}`}>{STATUS_LABEL[appr.status]}</span>
                      {appr.reason && <span className="text-[10px] text-muted-foreground italic">"{appr.reason}"</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Approve/Reject buttons — only for users with approve access who are listed as approver */}
              {canApprove && detailOpen.approvers.some(a => a.userId === user?.id && a.status === "pending") && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="gap-1 text-xs flex-1" onClick={() => setRespondDialog({ approval: detailOpen, action: "approved" })}>
                    <CheckCircle className="w-3 h-3" /> Setujui
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-xs flex-1" onClick={() => setRespondDialog({ approval: detailOpen, action: "rejected" })}>
                    <XCircle className="w-3 h-3" /> Tolak
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Ajukan Persetujuan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipe Permintaan</Label>
              <Select value={formType} onValueChange={v => setFormType(v as typeof formType)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leave" className="text-xs">Cuti/Izin</SelectItem>
                  <SelectItem value="reimbursement" className="text-xs">Reimbursement</SelectItem>
                  <SelectItem value="permission" className="text-xs">Izin</SelectItem>
                  <SelectItem value="other" className="text-xs">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subjek</Label>
              <Input value={formSubject} onChange={e => setFormSubject(e.target.value)} placeholder="cth. Izin Cuti 3 Hari" className="text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Deskripsi (opsional)</Label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Jelaskan alasan..." className="text-xs min-h-[60px]" />
            </div>

            {/* Multi-select Approver Picker */}
            <div className="space-y-1">
              <Label className="text-xs">Pilih Peninjau</Label>
              {formApprovers.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {formApprovers.map(id => (
                    <Badge key={id} variant="secondary" className="text-[10px] gap-1 pr-1">
                      {getUserName(id)}
                      <button type="button" onClick={() => toggleApprover(id)} className="ml-0.5 hover:text-destructive">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs text-muted-foreground">
                    <Search className="w-3 h-3 mr-1.5" />
                    {formApprovers.length === 0 ? "Cari dan pilih peninjau..." : `${formApprovers.length} peninjau dipilih`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2" align="start">
                  <Input
                    placeholder="Cari nama..."
                    value={approverSearch}
                    onChange={e => setApproverSearch(e.target.value)}
                    className="text-xs h-8 mb-2"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {filteredApproverUsers.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground p-2">Tidak ditemukan</p>
                    ) : filteredApproverUsers.map(u => (
                      <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer">
                        <Checkbox
                          checked={formApprovers.includes(u.id)}
                          onCheckedChange={() => toggleApprover(u.id)}
                          className="w-3.5 h-3.5"
                        />
                        <span className="text-xs text-foreground">{u.name}</span>
                        {u.position && <span className="text-[10px] text-muted-foreground">— {u.position}</span>}
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Lampiran / Bukti (opsional)</Label>
              <Input type="file" onChange={e => setFormFile(e.target.files?.[0] || null)} className="text-xs" />
            </div>
            <Button className="w-full text-xs" onClick={handleCreate} disabled={!formSubject.trim() || formApprovers.length === 0}>
              Kirim Permintaan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Respond Dialog */}
      <Dialog open={!!respondDialog} onOpenChange={o => { if (!o) { setRespondDialog(null); setRespondReason(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{respondDialog?.action === "approved" ? "Setujui Permintaan" : "Tolak Permintaan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Alasan (opsional)</Label>
              <Textarea value={respondReason} onChange={e => setRespondReason(e.target.value)} placeholder="Tulis alasan..." className="min-h-[60px] text-xs" />
            </div>
            <Button className="w-full text-xs" onClick={handleRespond}>Konfirmasi</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!confirmDeleteId} onOpenChange={o => { if (!o) setConfirmDeleteId(null); }} title="Hapus permintaan ini?" variant="destructive" confirmText="Hapus" onConfirm={handleDelete} />
      <SuccessDialog open={!!successDialog} onOpenChange={() => setSuccessDialog(null)} title={successDialog?.title || ""} description={successDialog?.description} />
    </motion.div>
  );
};

export default Approval;
