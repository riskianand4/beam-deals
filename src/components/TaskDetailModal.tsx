import { useState, useRef, useEffect } from "react";
import { Task, TaskStatus, Priority, TaskAttachment, TaskReviewer, User } from "@/types";
import { useTasks } from "@/contexts/TaskContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMenuSettings } from "@/contexts/MenuSettingsContext";
import api, { getUploadUrl } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import ConfirmDialog from "@/components/ConfirmDialog";
import { MessageCircleCodeIcon, Send, Calendar, Flag, Edit2, Trash2, Paperclip, Download, FileText, X, Search, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams?: any[];
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Akan Dikerjakan",
  "in-progress": "Sedang Dikerjakan",
  "needs-review": "Perlu Ditinjau",
  completed: "Selesai",
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/10 text-warning",
  low: "bg-muted text-muted-foreground",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const TaskDetailModal = ({ task, open, onOpenChange, teams = [] }: Props) => {
  const { updateTaskStatus, reviewTask, addTaskNote, updateTask, deleteTask, refreshTasks } = useTasks();
  const { user, isAdmin, users } = useAuth();
  const { hasAccess } = useMenuSettings();
  const [noteText, setNoteText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>("medium");
  const [editDeadline, setEditDeadline] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmSaveEdit, setConfirmSaveEdit] = useState(false);
  const [confirmAddNote, setConfirmAddNote] = useState(false);
  const [confirmStatusChange, setConfirmStatusChange] = useState<TaskStatus | null>(null);

  // Reviewer selection for needs-review
  const [reviewerDialogOpen, setReviewerDialogOpen] = useState(false);
  const [availableReviewers, setAvailableReviewers] = useState<User[]>([]);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<string[]>([]);
  const [reviewerSearch, setReviewerSearch] = useState("");
  const [reviewDocFiles, setReviewDocFiles] = useState<File[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const reviewDocFileRef = useRef<HTMLInputElement>(null);

  // Reject reason dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processingReview, setProcessingReview] = useState(false);

  useEffect(() => {
    if (reviewerDialogOpen) {
      api.getReviewers().then(setAvailableReviewers).catch(() => setAvailableReviewers([]));
    }
  }, [reviewerDialogOpen]);

  if (!task) return null;

  // Permission logic
  const isTeamTask = task.type === "team";
  const isLeaderOfTask = isTeamTask && teams.some(t => t.leaderId === user?.id && t.id === task.teamId);
  const isReviewer = task.reviewers?.some(r => r.userId === user?.id) || false;
  const myReviewEntry = task.reviewers?.find(r => r.userId === user?.id);
  const hasReviewAccess = hasAccess("review");

  // Can this user change status?
  const canChangeStatus = (() => {
    if (task.status === "completed") return false;
    if (isAdmin) return true;

    if (isTeamTask) {
      if (task.status === "needs-review") return false; // reviewers use approve/reject buttons
      return isLeaderOfTask;
    }

    // Personal tasks
    if (task.status === "needs-review") return false; // reviewers use approve/reject buttons
    return task.assigneeId === user?.id;
  })();

  // Allowed statuses (no "completed" — that's handled by reviewer approve)
  const getAllowedStatuses = (): TaskStatus[] => {
    if (!canChangeStatus) return [];
    if (isAdmin) return ["todo", "in-progress", "needs-review", "completed"];
    return ["todo", "in-progress", "needs-review"];
  };

  const handleAddNote = () => {
    if (!noteText.trim() || !user) return;
    setConfirmAddNote(true);
  };

  const doAddNote = () => {
    if (!noteText.trim() || !user) return;
    addTaskNote(task.id, {
      text: noteText.trim(),
      createdAt: new Date().toISOString().split("T")[0],
      authorId: user.id,
    });
    setNoteText("");
    setConfirmAddNote(false);
    toast.success("Catatan progress ditambahkan");
  };

  const startEdit = () => {
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditPriority(task.priority);
    setEditDeadline(task.deadline);
    setEditing(true);
  };

  const saveEdit = () => {
    updateTask(task.id, { title: editTitle, description: editDesc, priority: editPriority, deadline: editDeadline });
    setEditing(false);
    setConfirmSaveEdit(false);
    toast.success("Tugas diperbarui");
  };

  const handleDelete = () => {
    deleteTask(task.id);
    onOpenChange(false);
    setConfirmDelete(false);
    toast.success("Tugas dihapus");
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (newStatus === "needs-review") {
      setSelectedReviewerIds([]);
      setReviewerSearch("");
      setReviewDocFiles([]);
      setReviewerDialogOpen(true);
      return;
    }
    setConfirmStatusChange(newStatus);
  };

  const doStatusChange = () => {
    if (confirmStatusChange) {
      updateTaskStatus(task.id, confirmStatusChange);
      setConfirmStatusChange(null);
    }
  };

  const toggleReviewerId = (id: string) => {
    setSelectedReviewerIds(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleReviewDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setReviewDocFiles(prev => [...prev, ...Array.from(files)]);
    if (reviewDocFileRef.current) reviewDocFileRef.current.value = "";
  };

  const confirmReviewerSelection = async () => {
    if (selectedReviewerIds.length === 0) return;
    try {
      setSubmittingReview(true);
      if (reviewDocFiles.length > 0) {
        const formData = new FormData();
        reviewDocFiles.forEach(file => formData.append("files", file));
        await api.uploadTaskAttachments(task.id, formData);
      }
      await updateTaskStatus(task.id, "needs-review", selectedReviewerIds);
      await refreshTasks();
      setReviewerDialogOpen(false);
      setSelectedReviewerIds([]);
      setReviewDocFiles([]);
      toast.success("Tugas dikirim untuk ditinjau");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah status");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleApprove = async () => {
    try {
      setProcessingReview(true);
      await reviewTask(task.id, "approved");
      await refreshTasks();
      toast.success("Tugas disetujui");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyetujui");
    } finally {
      setProcessingReview(false);
    }
  };

  const handleReject = async () => {
    try {
      setProcessingReview(true);
      await reviewTask(task.id, "rejected", rejectReason);
      await refreshTasks();
      setRejectDialogOpen(false);
      setRejectReason("");
      toast.success("Tugas ditolak dan dikembalikan");
    } catch (err: any) {
      toast.error(err.message || "Gagal menolak");
    } finally {
      setProcessingReview(false);
    }
  };

  const handleAddAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    try {
      setUploadingAttachment(true);
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));
      await api.uploadTaskAttachments(task.id, formData);
      await refreshTasks();
      toast.success(`${files.length} file ditambahkan`);
    } catch {
      toast.error("Gagal menambahkan lampiran");
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (attId: string) => {
    updateTask(task.id, { attachments: (task.attachments || []).filter((a) => a.id !== attId) });
    toast.success("Lampiran dihapus");
  };

  const downloadAttachment = (att: TaskAttachment) => {
    const link = document.createElement("a");
    link.href = getUploadUrl(att.url);
    link.download = att.name;
    link.click();
  };

  const attachments = task.attachments || [];
  const allowedStatuses = getAllowedStatuses();
  const filteredReviewers = availableReviewers.filter(r =>
    r.name.toLowerCase().includes(reviewerSearch.toLowerCase())
  );

  const getReviewerName = (userId: string) => {
    const u = users.find(u => u.id === userId);
    return u?.name || "Peninjau";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg">{task.title}</DialogTitle>
              <div className="flex items-center gap-1">
                {isAdmin && (
                  <>
                    <Button size="icon" variant="ghost" className="w-7 h-7" onClick={startEdit}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive" onClick={() => setConfirmDelete(true)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>

          {editing && isAdmin ? (
            <div className="space-y-3">
              <div className="space-y-1"><Label className="text-sm">Judul</Label><Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-sm">Deskripsi</Label><Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="min-h-[60px]" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Prioritas</Label>
                  <Select value={editPriority} onValueChange={(v) => setEditPriority(v as Priority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Tinggi</SelectItem>
                      <SelectItem value="medium">Sedang</SelectItem>
                      <SelectItem value="low">Rendah</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Tenggat Waktu</Label>
                  <Input type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Batal</Button>
                <Button size="sm" onClick={() => setConfirmSaveEdit(true)}>Simpan</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {task.description && (
                <p className="text-sm text-muted-foreground">{task.description}</p>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={PRIORITY_STYLES[task.priority]}>
                  <Flag className="w-3 h-3 mr-1" />
                  {PRIORITY_LABELS[task.priority]}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Tenggat {format(new Date(task.deadline), "d MMMM yyyy", { locale: localeID })}
                </span>
              </div>

              {/* Reviewer status list */}
              {task.reviewers && task.reviewers.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Status Peninjau</label>
                  <div className="space-y-1.5">
                    {task.reviewers.map((r, i) => (
                      <div key={r.userId + i} className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary">
                          {getReviewerName(r.userId).charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-foreground flex-1">{getReviewerName(r.userId)}</span>
                        {r.status === "pending" && (
                          <Badge variant="outline" className="text-[10px] gap-1"><Clock className="w-2.5 h-2.5" />Menunggu</Badge>
                        )}
                        {r.status === "approved" && (
                          <Badge className="text-[10px] gap-1 bg-success/10 text-success"><CheckCircle2 className="w-2.5 h-2.5" />Disetujui</Badge>
                        )}
                        {r.status === "rejected" && (
                          <Badge className="text-[10px] gap-1 bg-destructive/10 text-destructive"><XCircle className="w-2.5 h-2.5" />Ditolak</Badge>
                        )}
                      </div>
                    ))}
                    {task.reviewers.some(r => r.status === "rejected" && r.reason) && (
                      <div className="mt-1.5 space-y-1">
                        {task.reviewers.filter(r => r.status === "rejected" && r.reason).map((r, i) => (
                          <div key={i} className="px-3 py-2 rounded-md bg-destructive/5 border border-destructive/10">
                            <p className="text-[10px] text-destructive font-medium">{getReviewerName(r.userId)} — Alasan penolakan:</p>
                            <p className="text-xs text-foreground mt-0.5">{r.reason}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Approve/Reject buttons for reviewer */}
              {task.status === "needs-review" && isReviewer && myReviewEntry?.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 gap-1.5 bg-success hover:bg-success/90 text-success-foreground" onClick={handleApprove} disabled={processingReview}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Setujui
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1 gap-1.5" onClick={() => setRejectDialogOpen(true)} disabled={processingReview}>
                    <XCircle className="w-3.5 h-3.5" /> Tolak
                  </Button>
                </div>
              )}

              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Status</label>
                {canChangeStatus && allowedStatuses.length > 0 ? (
                  <Select value={task.status} onValueChange={(v) => handleStatusChange(v as TaskStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allowedStatuses.map((val) => (
                        <SelectItem key={val} value={val}>{STATUS_LABELS[val]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{STATUS_LABELS[task.status]}</Badge>
                    {task.status === "completed" && (
                      <span className="text-[10px] text-muted-foreground">Tugas selesai tidak dapat diubah</span>
                    )}
                    {task.status === "needs-review" && !isReviewer && !isAdmin && (
                      <span className="text-[10px] text-muted-foreground">Menunggu tinjauan peninjau</span>
                    )}
                    {!canChangeStatus && task.status !== "completed" && task.status !== "needs-review" && !isAdmin && isTeamTask && (
                      <span className="text-[10px] text-muted-foreground">Hanya ketua tim yang bisa ubah status</span>
                    )}
                  </div>
                )}
              </div>

              {/* Lampiran */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-primary" /> Lampiran
                  </h3>
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip,.rar" onChange={handleAddAttachment} className="hidden" />
                  <Button size="sm" variant="ghost" className="text-xs gap-1 h-7" onClick={() => fileInputRef.current?.click()} disabled={uploadingAttachment}>
                    <Paperclip className="w-3 h-3" /> {uploadingAttachment ? "Mengunggah..." : "Tambah"}
                  </Button>
                </div>
                {attachments.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Belum ada lampiran.</p>
                ) : (
                  <div className="space-y-1.5">
                    {attachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted group">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{att.name}</p>
                          <p className="text-[10px] text-muted-foreground">{formatFileSize(att.size)}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => downloadAttachment(att)}>
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        {isAdmin && (
                          <button onClick={() => removeAttachment(att.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Catatan Progres */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MessageCircleCodeIcon className="w-4 h-4 text-primary" /> Catatan Progres
                </h3>
                {task.notes.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Belum ada catatan.</p>
                )}
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {task.notes.map((note) => (
                    <div key={note.id} className="bg-muted rounded-md p-3">
                      <p className="text-sm text-foreground">{note.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">{note.createdAt}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Tambahkan catatan progres..." className="min-h-[60px] text-sm" />
                  <Button size="icon" onClick={handleAddNote} disabled={!noteText.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm dialogs */}
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Hapus tugas ini?" description="Tugas akan dihapus secara permanen." confirmText="Hapus" variant="destructive" onConfirm={handleDelete} />
      <ConfirmDialog open={confirmSaveEdit} onOpenChange={setConfirmSaveEdit} title="Simpan perubahan?" description="Perubahan tugas akan disimpan." onConfirm={saveEdit} />
      <ConfirmDialog open={confirmAddNote} onOpenChange={setConfirmAddNote} title="Simpan catatan progres?" description="Catatan akan ditambahkan ke tugas ini." onConfirm={doAddNote} />
      <ConfirmDialog open={!!confirmStatusChange} onOpenChange={(open) => { if (!open) setConfirmStatusChange(null); }} title="Ubah status tugas?" description={`Status akan diubah ke "${confirmStatusChange ? STATUS_LABELS[confirmStatusChange] : ""}".`} onConfirm={doStatusChange} />

      {/* Combined Reviewer + Documentation Dialog */}
      <Dialog open={reviewerDialogOpen} onOpenChange={(open) => { if (!open) { setReviewerDialogOpen(false); setSelectedReviewerIds([]); setReviewDocFiles([]); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Kirim untuk Ditinjau</DialogTitle>
            <DialogDescription className="text-xs">Pilih peninjau dan lampirkan dokumentasi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Pilih Peninjau (bisa lebih dari 1)</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Cari peninjau..." value={reviewerSearch} onChange={(e) => setReviewerSearch(e.target.value)} className="pl-8 h-9 text-xs" />
              </div>
              <ScrollArea className="max-h-[160px]">
                <div className="space-y-1">
                  {filteredReviewers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {availableReviewers.length === 0 ? "Belum ada karyawan dengan hak akses tinjau" : "Tidak ditemukan"}
                    </p>
                  ) : filteredReviewers.map((r) => (
                    <button key={r.id} onClick={() => toggleReviewerId(r.id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors ${selectedReviewerIds.includes(r.id) ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "hover:bg-muted"}`}>
                      <Checkbox checked={selectedReviewerIds.includes(r.id)} className="pointer-events-none" />
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary">{r.name.charAt(0).toUpperCase()}</div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">{r.name}</p>
                        <p className="text-[10px] text-muted-foreground">{r.position || r.department}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
              {selectedReviewerIds.length > 0 && (
                <p className="text-[10px] text-muted-foreground">{selectedReviewerIds.length} peninjau dipilih</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Dokumentasi (opsional)</label>
              <input ref={reviewDocFileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={handleReviewDocFileChange} className="hidden" />
              <Button variant="outline" size="sm" className="gap-1.5 text-xs w-full border-dashed" onClick={() => reviewDocFileRef.current?.click()}>
                <Paperclip className="w-3.5 h-3.5" /> Lampirkan Dokumentasi
              </Button>
              {reviewDocFiles.length > 0 && (
                <div className="space-y-1">
                  {reviewDocFiles.map((file, i) => (
                    <div key={`${file.name}-${i}`} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted text-xs">
                      <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1 text-foreground">{file.name}</span>
                      <button onClick={() => setReviewDocFiles(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button className="w-full text-xs" disabled={selectedReviewerIds.length === 0 || submittingReview} onClick={confirmReviewerSelection}>
              {submittingReview ? "Mengirim..." : `Kirim untuk Ditinjau (${selectedReviewerIds.length} peninjau)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={(open) => { if (!open) { setRejectDialogOpen(false); setRejectReason(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Tolak Tugas</DialogTitle>
            <DialogDescription className="text-xs">Berikan alasan penolakan agar karyawan bisa memperbaiki.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Alasan penolakan..." className="min-h-[80px] text-sm" />
            <Button variant="destructive" className="w-full text-xs" disabled={processingReview} onClick={handleReject}>
              {processingReview ? "Memproses..." : "Tolak Tugas"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskDetailModal;
