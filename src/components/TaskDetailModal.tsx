import { useState, useRef } from "react";

import { Task, TaskStatus, Priority, TaskAttachment } from "@/types";
import { useTasks } from "@/contexts/TaskContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMenuSettings } from "@/contexts/MenuSettingsContext";
import api, { getUploadUrl } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ConfirmDialog from "@/components/ConfirmDialog";
import { MessageCircleCodeIcon, Send, Calendar, Flag, Edit2, Trash2, Paperclip, Download, FileText, X, Info, Eye, CheckSquare } from "lucide-react";
import { format, isPast } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams?: any[];
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Tugas",
  completed: "Selesai",
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-muted text-muted-foreground border-border",
  none: "",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
  none: "",
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const TaskDetailModal = ({ task, open, onOpenChange, teams = [] }: Props) => {
  const { updateTaskStatus, addTaskNote, updateTask, deleteTask, refreshTasks } = useTasks();
  const { user, isAdmin, users } = useAuth();
  const { hasAccess } = useMenuSettings();
  const [noteText, setNoteText] = useState("");
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>("medium");
  const [editDeadline, setEditDeadline] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const noteFileInputRef = useRef<HTMLInputElement>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmSaveEdit, setConfirmSaveEdit] = useState(false);
  const [confirmAddNote, setConfirmAddNote] = useState(false);
  const [confirmStatusChange, setConfirmStatusChange] = useState<TaskStatus | null>(null);

  // Edit/delete note state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(null);

  // Preview dialog
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>("");

  if (!task) return null;

  const isTeamTask = task.type === "team";
  const isLeaderOfTask = isTeamTask && teams.some(t => t.leaderId === user?.id && t.id === task.teamId);
  const hasTasksAccess = hasAccess("tasks");

  const canChangeStatus = (() => {
    if (task.status === "completed") return false;
    if (isAdmin || hasTasksAccess) return true;
    if (isTeamTask) return isLeaderOfTask;
    return false;
  })();

  const canEdit = isAdmin || hasTasksAccess;

  const getAllowedStatuses = (): TaskStatus[] => {
    if (!canChangeStatus) return [];
    return ["todo", "completed"];
  };

  const handleAddNote = () => {
    if ((!noteText.trim() && noteFiles.length === 0) || !user) return;
    setConfirmAddNote(true);
  };

  const doAddNote = async () => {
    if (!user) return;
    setSendingNote(true);
    try {
      const formData = new FormData();
      formData.append("text", noteText.trim());
      formData.append("authorId", user.id);
      noteFiles.forEach(f => formData.append("files", f));
      await addTaskNote(task.id, formData);
      setNoteText("");
      setNoteFiles([]);
      setConfirmAddNote(false);
      toast.success("Catatan progress ditambahkan");
    } catch {
      toast.error("Gagal menambahkan catatan");
    } finally {
      setSendingNote(false);
    }
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
    setConfirmStatusChange(newStatus);
  };

  const doStatusChange = () => {
    if (confirmStatusChange) {
      updateTaskStatus(task.id, confirmStatusChange);
      setConfirmStatusChange(null);
    }
  };

  const handleNoteFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) setNoteFiles(prev => [...prev, ...Array.from(files)]);
    if (noteFileInputRef.current) noteFileInputRef.current.value = "";
  };

  const removeNoteFile = (index: number) => {
    setNoteFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openPreview = (url: string, type: string) => {
    const fullUrl = getUploadUrl(url);
    if (type.startsWith("image/") || type.includes("pdf")) {
      setPreviewUrl(fullUrl);
      setPreviewType(type);
    } else {
      window.open(fullUrl, "_blank");
    }
  };

  const getUploaderName = (userId?: string) => {
    if (!userId) return null;
    const u = users.find(u => u.id === userId);
    return u?.name || null;
  };

  const downloadAttachment = (att: TaskAttachment) => {
    const link = document.createElement("a");
    link.href = getUploadUrl(att.url);
    link.download = att.name;
    link.click();
  };

  const allNotes = task.notes || [];
  const allowedStatuses = getAllowedStatuses();

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setEditing(false); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0">
          
          {/* Header Dialog */}
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-card">
            <DialogHeader className="p-0">
              <DialogTitle className="text-base flex items-center gap-2 font-bold text-foreground">
                <CheckSquare className="w-5 h-5 text-foreground" /> Detail Tugas
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-1.5 mr-5">
              {canEdit && !editing && (
                <>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] px-3 bg-muted/50 hover:bg-muted" onClick={startEdit}>
                    <Edit2 className="w-3 h-3 mr-1.5" /> Edit
                  </Button>
                  <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-muted/10">
            {editing && canEdit ? (
              /* ================== EDIT MODE ================== */
              <div className="max-w-2xl mx-auto bg-card p-5 rounded-xl border border-border shadow-sm space-y-4">
                <h3 className="text-sm font-semibold border-b border-border pb-2 mb-4">Edit Informasi Tugas</h3>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Judul Tugas</Label>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-xs h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Deskripsi Lengkap</Label>
                  <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="min-h-[150px] text-xs resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Prioritas</Label>
                    <Select value={editPriority} onValueChange={(v) => setEditPriority(v as Priority)}>
                      <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs py-1.5">Tanpa Prioritas</SelectItem>
                        <SelectItem value="high" className="text-xs py-1.5">Tinggi</SelectItem>
                        <SelectItem value="medium" className="text-xs py-1.5">Sedang</SelectItem>
                        <SelectItem value="low" className="text-xs py-1.5">Rendah</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tenggat Waktu (Deadline)</Label>
                    <Input type="datetime-local" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} className="text-xs h-9" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-4 border-t border-border mt-4">
                  <Button variant="ghost" size="sm" className="text-xs h-8 px-4" onClick={() => setEditing(false)}>Batal</Button>
                  <Button size="sm" className="text-xs h-8 px-6" onClick={() => setConfirmSaveEdit(true)}>Simpan Perubahan</Button>
                </div>
              </div>
            ) : (
              /* ================== VIEW MODE (2-COLUMN) ================== */
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-5 h-full">
                
                {/* KOLOM KIRI (Info Tugas Utama) */}
                <div className="space-y-4">
                  <div className="bg-card p-4 sm:p-5 rounded-xl border border-border shadow-sm space-y-4">
                    {/* Header Judul & Badge */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {isTeamTask && <Badge variant="secondary" className="text-[9px] bg-muted/50 font-medium px-2 py-0.5">Tugas Tim</Badge>}
                        {task.priority !== "none" && (
                          <Badge variant="outline" className={`text-[9px] font-medium px-2 py-0.5 ${PRIORITY_STYLES[task.priority]}`}>
                            Prioritas {PRIORITY_LABELS[task.priority]}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[9px] px-2 py-0.5 bg-background">
                          {STATUS_LABELS[task.status]}
                        </Badge>
                      </div>
                      <h3 className="text-sm font-bold text-foreground leading-snug">{task.title}</h3>
                    </div>

                    {/* Meta Data */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tenggat Waktu</p>
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className={isPast(new Date(task.deadline)) && task.status !== "completed" ? "text-destructive" : "text-foreground"}>
                            {format(new Date(task.deadline), task.deadline.includes("T") ? "d MMM yyyy, HH:mm" : "d MMM yyyy", { locale: localeID })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Update Status</p>
                        {canChangeStatus && allowedStatuses.length > 0 ? (
                          <Select value={task.status} onValueChange={(v) => handleStatusChange(v as TaskStatus)}>
                            <SelectTrigger className="h-8 text-[10px] w-full bg-muted/20"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {allowedStatuses.map((val) => (
                                <SelectItem key={val} value={val} className="text-[10px] py-1.5">{STATUS_LABELS[val]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="h-8 flex items-center">
                            <span className="text-[10px] font-medium text-muted-foreground italic">
                              {task.status === "completed" ? "Tugas selesai (Tidak dapat diubah)" : "Akses dibatasi"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Deskripsi */}
                    {task.description && (
                      <div className="pt-3 border-t border-border">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Deskripsi Lengkap</p>
                        <div className="text-[11px] text-foreground bg-muted/20 p-3 rounded-lg whitespace-pre-wrap leading-relaxed border border-border/50 max-h-64 overflow-y-auto">
                          {task.description}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* KOLOM KANAN (Catatan Progress / Attachments) */}
                <div className="flex flex-col h-full max-h-[600px] sm:max-w-[420px] bg-card p-4 sm:p-5 rounded-xl border border-border shadow-sm">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-3">
                    <MessageCircleCodeIcon className="w-4 h-4 text-foreground" /> Catatan & Bukti Progress
                  </h3>

                  {/* List Catatan */}
                  <div className="flex-1 overflow-y-auto pr-2 -mr-2 mb-3 space-y-2">
                    {allNotes.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
                        <MessageCircleCodeIcon className="w-6 h-6 mb-1.5" />
                        <span className="text-[10px]">Belum ada catatan progres.</span>
                      </div>
                    ) : (
                      <Accordion type="multiple" className="space-y-2">
                        {allNotes.map((note, idx) => {
                          const authorName = getUploaderName(note.authorId);
                          const noteAttachments = note.attachments || [];
                          const hasAttachments = noteAttachments.length > 0;
                          const hasText = !!note.text?.trim();

                          return (
                            <AccordionItem key={note.id || idx} value={note.id || `note-${idx}`} className="border border-border/50 bg-muted/10 rounded-lg overflow-hidden px-1">
                              <AccordionTrigger className="px-2 py-2.5 hover:no-underline flex gap-2">
                                <div className="flex flex-col items-start min-w-0 flex-1 text-left gap-1">
                                  <div className="flex items-center gap-1.5 w-full">
                                    <span className="text-[10px] font-bold text-foreground">{authorName || "Sistem"}</span>
                                    <span className="text-[8px] text-muted-foreground font-normal">
                                      {note.createdAt?.includes("T") ? format(new Date(note.createdAt), "d MMM, HH:mm", { locale: localeID }) : note.createdAt}
                                    </span>
                                  </div>
                                  
                                  {hasAttachments && !hasText && (
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                      <Paperclip className="w-3 h-3" /> Melampirkan {noteAttachments.length} file
                                    </div>
                                  )}
                        
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-2 pb-3 pt-1">
                                {hasText && (
                                  <p className="text-[10px] text-muted-foreground  bg-background p-2 rounded border border-border/50 mb-2 leading-relaxed">
                                    {note.text}
                                  </p>
                                )}
                                {hasAttachments && (
                                  <div className="space-y-1.5">
                                    {noteAttachments.map((att) => (
                                      <div key={att.id} className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-background border border-border/50 shadow-sm">
                                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <div className="flex-1 min-w-0 flex flex-col">
                                          <p className="text-[10px] font-medium text-foreground truncate">{att.name}</p>
                                          <p className="text-[8px] text-muted-foreground">{formatFileSize(att.size)}</p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <Button size="icon" variant="ghost" className="w-6 h-6 hover:bg-muted" onClick={() => openPreview(att.url, att.type)}>
                                            <Eye className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                                          </Button>
                                          <Button size="icon" variant="ghost" className="w-6 h-6 hover:bg-muted" onClick={() => downloadAttachment(att)}>
                                            <Download className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Edit/Delete for author */}
                                {note.authorId === user?.id && note.id && (
                                  <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-border/50">
                                    <Button size="sm" variant="ghost" className="h-6 text-[9px] px-2 text-muted-foreground hover:text-foreground" onClick={() => { setEditingNoteId(note.id); setEditNoteText(note.text || ""); }}>
                                      <Edit2 className="w-2.5 h-2.5 mr-1" /> Edit
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-6 text-[9px] px-2 text-destructive hover:bg-destructive/10" onClick={() => setConfirmDeleteNoteId(note.id)}>
                                      <Trash2 className="w-2.5 h-2.5 mr-1" /> Hapus
                                    </Button>
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    )}
                  </div>

                  {/* Input Form Tambah Catatan */}
                  <div className="pt-3 border-t border-border mt-auto space-y-2">
                    {noteFiles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-muted/20 rounded-md border border-border/50 max-h-20 overflow-y-auto">
                        {noteFiles.map((f, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] gap-1 pr-1 bg-background font-normal border-border">
                            <Paperclip className="w-2.5 h-2.5 text-muted-foreground" />
                            <span className="truncate max-w-[120px]">{f.name}</span>
                            <button onClick={() => removeNoteFile(i)} className="ml-0.5 hover:bg-destructive/10 hover:text-destructive rounded-full p-0.5 transition-colors">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-end gap-2">
                      <div className="flex-1 relative">
                        <Textarea 
                          value={noteText} 
                          onChange={(e) => setNoteText(e.target.value)} 
                          placeholder="Ketik catatan progres tugas..." 
                          className="min-h-[40px] max-h-[120px] text-[11px] bg-muted/10 resize-none pb-8" 
                        />
                        <div className="absolute bottom-1.5 left-1.5">
                          <input ref={noteFileInputRef} type="file" multiple className="hidden" onChange={handleNoteFileSelect} />
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => noteFileInputRef.current?.click()}>
                            <Paperclip className="w-3 h-3 mr-1" /> Lampirkan File
                          </Button>
                        </div>
                      </div>
                      <Button size="icon" className="h-10 w-10 shrink-0 shadow-sm" onClick={handleAddNote} disabled={(!noteText.trim() && noteFiles.length === 0) || sendingNote}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(o) => { if (!o) { setPreviewUrl(null); setPreviewType(""); } }}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-muted/10">
          <DialogHeader className="p-3 border-b border-border bg-card">
            <DialogTitle className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Pratinjau Dokumen
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 flex items-center justify-center min-h-[50vh]">
            {previewUrl && (
              previewType.startsWith("image/") ? (
                <img src={previewUrl} alt="Preview" className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-sm border border-border bg-background" />
              ) : previewType.includes("pdf") ? (
                <iframe src={previewUrl} className="w-full h-[75vh] rounded-lg border border-border bg-background shadow-sm" />
              ) : null
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm dialogs */}
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Hapus tugas ini?" description="Tugas beserta seluruh catatan dan lampirannya akan dihapus secara permanen." confirmText="Hapus Permanen" variant="destructive" onConfirm={handleDelete} />
      <ConfirmDialog open={confirmSaveEdit} onOpenChange={setConfirmSaveEdit} title="Simpan perubahan?" description="Informasi tugas akan diperbarui dengan data baru." onConfirm={saveEdit} />
      <ConfirmDialog open={confirmAddNote} onOpenChange={setConfirmAddNote} title="Kirim catatan progres?" description="Catatan dan lampiran akan ditambahkan ke riwayat tugas ini." onConfirm={doAddNote} />
      <ConfirmDialog open={!!confirmStatusChange} onOpenChange={(open) => { if (!open) setConfirmStatusChange(null); }} title="Ubah status tugas?" description={`Anda akan memindahkan status tugas ini menjadi "${confirmStatusChange ? STATUS_LABELS[confirmStatusChange] : ""}".`} onConfirm={doStatusChange} />
      
      <ConfirmDialog open={!!confirmDeleteNoteId} onOpenChange={(o) => { if (!o) setConfirmDeleteNoteId(null); }} title="Hapus catatan ini?" description="Catatan progres ini akan dihapus secara permanen." variant="destructive" confirmText="Hapus Permanen" onConfirm={async () => {
        if (confirmDeleteNoteId) {
          try {
            await api.deleteTaskNote(task.id, confirmDeleteNoteId);
            await refreshTasks();
            setConfirmDeleteNoteId(null);
            toast.success("Catatan berhasil dihapus");
          } catch { toast.error("Gagal menghapus catatan"); }
        }
      }} />

      {/* Edit Note Dialog */}
      <Dialog open={!!editingNoteId} onOpenChange={(o) => { if (!o) setEditingNoteId(null); }}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-border bg-card">
             <DialogTitle className="text-xs font-bold text-foreground flex items-center gap-1.5"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /> Edit Catatan Progres</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-3 bg-muted/5">
            <Textarea value={editNoteText} onChange={e => setEditNoteText(e.target.value)} className="min-h-[100px] text-[11px] resize-none bg-background" placeholder="Ubah teks catatan..." />
            <Button className="w-full text-xs h-8" onClick={async () => {
              if (editingNoteId) {
                try {
                  await api.editTaskNote(task.id, editingNoteId, { text: editNoteText });
                  await refreshTasks();
                  setEditingNoteId(null);
                  toast.success("Catatan berhasil diperbarui");
                } catch { toast.error("Gagal memperbarui catatan"); }
              }
            }}>Simpan Perubahan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default TaskDetailModal;