import { useState, useRef } from "react";
import { Priority, TaskAttachment, TeamGroup } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/contexts/TaskContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Paperclip, X, FileText } from "lucide-react";

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

interface CreateTaskDialogProps {
  teams?: TeamGroup[];
  isLeader?: boolean;
}

const CreateTaskDialog = ({ teams = [], isLeader = false }: CreateTaskDialogProps) => {
  const { addTask } = useTasks();
  const { users, isAdmin } = useAuth();
  const employees = users.filter((u) => u.role === "employee");

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [deadline, setDeadline] = useState("");
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [taskType, setTaskType] = useState<"personal" | "team">(isLeader && !isAdmin ? "team" : "personal");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: TaskAttachment[] = Array.from(files).map((file) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) return;
    if (taskType === "personal" && !assigneeId) return;
    if (taskType === "team" && !selectedTeamId) return;

    addTask({
      id: `task-${Date.now()}`,
      title,
      description,
      assigneeId: taskType === "personal" ? assigneeId : "",
      teamId: taskType === "team" ? selectedTeamId : "",
      type: taskType,
      status: "todo",
      priority,
      deadline,
      createdAt: new Date().toISOString().split("T")[0],
      notes: [],
      attachments,
    });
    setTitle(""); setDescription(""); setAssigneeId(""); setPriority("medium"); setDeadline(""); setAttachments([]);
    setTaskType("personal"); setSelectedTeamId("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Tugas Baru</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Buat Tugas</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task type selector — show for admin or leader */}
          {(isAdmin || isLeader) && teams.length > 0 && (
            <div className="space-y-1">
              <Label className="text-sm">Tipe Tugas</Label>
              {isLeader && !isAdmin ? (
                // Leader only sees team option
                <div className="text-sm text-muted-foreground py-2 px-3 rounded-md bg-muted">Tugas Tim</div>
              ) : (
                <Select value={taskType} onValueChange={(v) => setTaskType(v as "personal" | "team")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">karyawan</SelectItem>
                    <SelectItem value="team">Tim</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-sm">Judul</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Deskripsi</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[60px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {taskType === "personal" && isAdmin && (
              <div className="space-y-1">
                <Label className="text-sm">Ditugaskan Kepada</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                  <SelectContent className=" max-h-56">
                    {employees.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {taskType === "team" && (
              <div className="space-y-1">
                <Label className="text-sm">Pilih Tim</Label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger><SelectValue placeholder="Pilih tim..." /></SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-sm">Prioritas</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Tinggi</SelectItem>
                  <SelectItem value="medium">Sedang</SelectItem>
                  <SelectItem value="low">Rendah</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Tenggat Waktu</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
          </div>

          {/* File Attachments */}
          <div className="space-y-2">
            <Label className="text-sm">Lampiran</Label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip,.rar"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs w-full border-dashed"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-3.5 h-3.5" /> Tambah File
            </Button>
            {attachments.length > 0 && (
              <div className="space-y-1.5">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted text-xs">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1 text-foreground">{att.name}</span>
                    <span className="text-muted-foreground shrink-0">{formatFileSize(att.size)}</span>
                    <button type="button" onClick={() => removeAttachment(att.id)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" className="w-full">Buat Tugas</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;
