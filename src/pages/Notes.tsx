import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMenuSettings } from "@/contexts/MenuSettingsContext";
import { getUploadUrl } from "@/lib/api";
import api from "@/lib/api";
import type { AdminNote, Announcement, DailyNote } from "@/types";
import { AnimatePresence, motion } from "framer-motion";

import {
  AlertTriangle,
  Calendar,
  CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  Edit2,
  FileText,
  Layers,
  Megaphone,
  MessageSquarePlus,
  Plus,
  Send,
  ShieldCheck,
  StickyNote,
  Trash2,
  User,
  Users2,
  X,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import StatsCard from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { addDays, format, subDays } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import EmployeeGrid, { EmployeeHeader } from "@/components/EmployeeGrid";

const STICKY_COLORS = [
  "bg-amber-900 text-foreground",
  "bg-blue-900 text-foreground",
  "bg-green-900 text-foreground",
  "bg-pink-900 text-foreground",
  "bg-purple-900 text-foreground",
];
const ADMIN_STICKY_COLOR = "bg-primary text-primary-foreground";
const ADMIN_IMPORTANT_COLOR = "bg-primary text-primary-foreground";

function getStickyColor(
  id: string,
  isAdmin?: boolean,
  priority?: string,
): string {
  if (isAdmin) {
    return priority === "important"
      ? ADMIN_IMPORTANT_COLOR
      : ADMIN_STICKY_COLOR;
  }
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
  }
  return STICKY_COLORS[Math.abs(hash) % STICKY_COLORS.length];
}

function generateNoteTransform() {
  const randomX = 2 + Math.random() * 70;
  const randomY = 2 + Math.random() * 65;
  const randomRot = -4 + Math.random() * 8;
  return { x: `${randomX}%`, y: `${randomY}%`, rot: randomRot };
}

// ─── Admin Sticky Note Card ───────────────────────────────────────────────────
function AdminStickyCard({
  note,
  onDelete,
}: {
  note: AdminNote;
  onDelete?: (id: string) => void;
}) {
  const isImportant = note.priority === "important";
  const colorStyle = isImportant ? ADMIN_IMPORTANT_COLOR : ADMIN_STICKY_COLOR;
  const rot = useRef((-3 + Math.random() * 6).toFixed(2)).current;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.18 } }}
      className={`group relative w-full min-h-[10rem] p-4 flex flex-col rounded-sm rounded-br-[28px]
        shadow-[0_4px_12px_rgba(0,0,0,0.10)] hover:shadow-[0_8px_18px_rgba(0,0,0,0.14)]
        transition-shadow cursor-default ${colorStyle}`}
      style={{ transform: `rotate(${rot}deg)` }}
    >
      <div
        className={`absolute top-0 left-0 right-0 flex items-center gap-1.5 px-3 py-1 rounded-t-sm text-[9px] font-bold tracking-widest uppercase
          ${
          isImportant
            ? "bg-destructive/30 text-destructive"
            : "bg-warning/30 text-warning"
        }`}
      >
        <ShieldCheck className="w-3 h-3 flex-shrink-0" />
        {isImportant ? "Admin · Penting" : "Admin · Normal"}
      </div>
      <div className="h-4 mb-2" />
      <div className="flex-grow pointer-events-none">
        <p className="text-xs leading-relaxed whitespace-pre-wrap line-clamp-6">
          {note.content}
        </p>
      </div>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5 dark:border-white/5">
        <span className="text-[9px] opacity-60 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {format(new Date(note.createdAt), "d MMM, HH:mm", { locale: localeID })}
        </span>
        {onDelete && (
          <button
            onClick={() => onDelete(note.id)}
            className="hover:text-destructive transition-colors p-1"
            title="Hapus"
          >
            <Trash2 className="w-3 h-3 mr-5" />
          </button>
        )}
      </div>
      <div className="absolute bottom-0 right-0 w-8 h-8 bg-black/5 dark:bg-white/5 rounded-br-3xl
        border-l border-t border-black/5 dark:border-white/5 rounded-tl-lg
        shadow-[-2px_-2px_6px_rgba(0,0,0,0.05)] pointer-events-none
        transition-all duration-300 group-hover:w-9 group-hover:h-9" />
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const Notes = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, users } = useAuth();
  const { hasAccess } = useMenuSettings();

  const [adminNotes, setAdminNotes] = useState<AdminNote[]>([]);
  const [adminNoteContent, setAdminNoteContent] = useState("");
  const [adminNotePriority, setAdminNotePriority] = useState<"normal" | "important">("normal");
  const [isSending, setIsSending] = useState(false);
  const [confirmAdminDelete, setConfirmAdminDelete] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dailyNotes, setDailyNotes] = useState<DailyNote[]>([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<(DailyNote | AdminNote) | null>(null);

  const [filterMode, setFilterMode] = useState<"all" | "date">("all");
  const boardRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [highestZ, setHighestZ] = useState(10);
  const [noteTransforms, setNoteTransforms] = useState<
    Record<string, { x: string; y: string; rot: number; z: number }>
  >({});

  const hasNotesAccess = hasAccess("notes");
  const canManageNotes = isAdmin || hasNotesAccess;

  const [notesTab, setNotesTab] = useState<"pribadi" | "karyawan" | "pengumuman">("pribadi");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  // ── Announcements state (Announcements-page style) ──
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(false);
  const [annCreateOpen, setAnnCreateOpen] = useState(false);
  const [annEditItem, setAnnEditItem] = useState<Announcement | null>(null);
  const [annDetailItem, setAnnDetailItem] = useState<Announcement | null>(null);
  const [annFormTitle, setAnnFormTitle] = useState("");
  const [annFormContent, setAnnFormContent] = useState("");
  const [annFormExpiresAt, setAnnFormExpiresAt] = useState<Date | undefined>(undefined);
  const [annFormStatus, setAnnFormStatus] = useState<"active" | "draft">("active");
  const [confirmDeleteAnnId, setConfirmDeleteAnnId] = useState<string | null>(null);

  const hasAnnouncementAccess = isAdmin || hasAccess("pengumuman");

  const resetAnnForm = () => {
    setAnnFormTitle("");
    setAnnFormContent("");
    setAnnFormExpiresAt(undefined);
    setAnnFormStatus("active");
  };

  const refreshAnnouncements = async () => {
    try {
      setAnnLoading(true);
      const data = await api.getAnnouncements();
      setAnnouncements(data);
    } catch {}
    finally { setAnnLoading(false); }
  };

  useEffect(() => {
    if (notesTab === "pengumuman") {
      refreshAnnouncements();
    }
  }, [notesTab]);

  // Announcement helpers
  const getUser = (id: string) => users.find(u => u.id === id);
  const getUserName = (id: string) => getUser(id)?.name ?? "Tidak dikenal";
  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").substring(0, 2);
  const getUserAvatar = (id: string) => {
    const u = getUser(id);
    return u?.avatar ? getUploadUrl(u.avatar) : null;
  };

  const activeAnnCount = announcements.filter(a => a.status === "active" || !a.status).length;
  const draftAnnCount = announcements.filter(a => a.status === "draft").length;

  const handleAnnCreate = async () => {
    if (!annFormTitle.trim() || !annFormContent.trim()) return;
    try {
      await api.createAnnouncement({
        title: annFormTitle.trim(),
        content: annFormContent.trim(),
        expiresAt: annFormExpiresAt ? annFormExpiresAt.toISOString() : undefined,
        status: annFormStatus,
      });
      setAnnCreateOpen(false);
      resetAnnForm();
      refreshAnnouncements();
      toast.success("Pengumuman berhasil dibuat");
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat pengumuman");
    }
  };

  const handleAnnUpdate = async () => {
    if (!annEditItem || !annFormTitle.trim() || !annFormContent.trim()) return;
    try {
      await api.updateAnnouncement(annEditItem.id, {
        title: annFormTitle.trim(),
        content: annFormContent.trim(),
        expiresAt: annFormExpiresAt ? annFormExpiresAt.toISOString() : undefined,
        status: annFormStatus,
      });
      setAnnEditItem(null);
      resetAnnForm();
      refreshAnnouncements();
      toast.success("Pengumuman diperbarui");
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui");
    }
  };

  const handleAnnDelete = async () => {
    if (!confirmDeleteAnnId) return;
    try {
      await api.deleteAnnouncement(confirmDeleteAnnId);
      setAnnouncements(prev => prev.filter(a => a.id !== confirmDeleteAnnId));
      setConfirmDeleteAnnId(null);
      toast.success("Pengumuman dihapus");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus");
    }
  };

  const openAnnEdit = (item: Announcement) => {
    setAnnEditItem(item);
    setAnnFormTitle(item.title);
    setAnnFormContent(item.content);
    setAnnFormExpiresAt(item.expiresAt ? new Date(item.expiresAt) : undefined);
    setAnnFormStatus(item.status || "active");
  };

  const toggleAnnStatus = async (item: Announcement) => {
    const newStatus = item.status === "active" ? "draft" : "active";
    try {
      await api.updateAnnouncement(item.id, { status: newStatus });
      refreshAnnouncements();
      toast.success(`Status diubah ke ${newStatus === "active" ? "Aktif" : "Draft"}`);
    } catch {
      toast.error("Gagal mengubah status");
    }
  };

  // ── Tabs header helper ──
  const AdminTabs = () => (
    <Tabs
      value={notesTab}
      onValueChange={(v) => {
        setNotesTab(v as "pribadi" | "karyawan" | "pengumuman");
        setAdminNotes([]);
        setDailyNotes([]);
      }}
    >
      <TabsList className="relative w-[350px] grid grid-cols-3">
        <TabsTrigger value="pribadi" className="relative text-xs px-3 h-7 gap-1.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
          <span className="relative z-10 flex items-center gap-1"><User className="w-3.5 h-3.5" /> Pribadi</span>
        </TabsTrigger>
        <TabsTrigger value="karyawan" className="relative text-xs px-3 h-7 gap-1.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
          <span className="relative z-10 flex items-center gap-1"><Users2 className="w-3.5 h-3.5" /> Karyawan</span>
        </TabsTrigger>
        <TabsTrigger value="pengumuman" className="relative text-xs px-3 h-7 gap-1.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
          <span className="relative z-10 flex items-center gap-1"><Megaphone className="w-3.5 h-3.5" /> Pengumuman</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  const EmployeeTabs = () => (
    <Tabs
      value={notesTab}
      onValueChange={(v) => setNotesTab(v as any)}
    >
      <TabsList className="relative w-[200px] grid grid-cols-2">
        <TabsTrigger value="pribadi" className="relative text-xs px-3 h-7 gap-1.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
          <span className="relative z-10 flex items-center gap-1"><StickyNote className="w-3.5 h-3.5" /> Pribadi</span>
        </TabsTrigger>
        <TabsTrigger value="pengumuman" className="relative text-xs px-3 h-7 gap-1.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
          <span className="relative z-10 flex items-center gap-1"><Megaphone className="w-3.5 h-3.5" /> Pengumuman</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  // ── Shared Announcement Form Dialog ──
  const AnnFormDialog = ({
    open,
    onOpenChange,
    isEdit,
  }: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    isEdit: boolean;
  }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            {isEdit ? "Edit Pengumuman" : "Buat Pengumuman"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Judul</Label>
            <Input
              value={annFormTitle}
              onChange={e => setAnnFormTitle(e.target.value)}
              placeholder="Judul pengumuman"
              className="text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Isi</Label>
            <Textarea
              value={annFormContent}
              onChange={e => setAnnFormContent(e.target.value)}
              placeholder="Tulis isi pengumuman... (mendukung Markdown)"
              className="text-xs min-h-[120px]"
            />
            <p className="text-[10px] text-muted-foreground">Mendukung format Markdown</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Berakhir Pada (opsional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal text-xs", !annFormExpiresAt && "text-muted-foreground")}
                >
                  <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                  {annFormExpiresAt
                    ? format(annFormExpiresAt, "d MMM yyyy", { locale: localeID })
                    : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={annFormExpiresAt}
                  onSelect={setAnnFormExpiresAt}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {annFormExpiresAt && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] h-5 px-1"
                onClick={() => setAnnFormExpiresAt(undefined)}
              >
                Hapus tanggal
              </Button>
            )}
          </div>
          {hasAnnouncementAccess && (
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={annFormStatus} onValueChange={v => setAnnFormStatus(v as "active" | "draft")}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" className="text-xs">Aktif</SelectItem>
                  <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            className="w-full text-xs"
            onClick={isEdit ? handleAnnUpdate : handleAnnCreate}
            disabled={!annFormTitle.trim() || !annFormContent.trim()}
          >
            {isEdit ? "Simpan Perubahan" : "Buat Pengumuman"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // ── Announcements Table View ──
  const AnnouncementsView = () => (
    <div className="space-y-4">
      {/* Stats — only for managers */}
      {hasAnnouncementAccess && (
        <div className="grid grid-cols-3 gap-2">
          <StatsCard label="Total" value={announcements.length} icon={Megaphone} color="text-primary" bgColor="bg-primary/10" delay={0} />
          <StatsCard label="Aktif" value={activeAnnCount} icon={CheckCircle2} color="text-success" bgColor="bg-success/10" delay={1} />
          <StatsCard label="Draft" value={draftAnnCount} icon={Clock} color="text-muted-foreground" bgColor="bg-muted" delay={2} />
        </div>
      )}

      {/* Create button */}
      {hasAnnouncementAccess && (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => { resetAnnForm(); setAnnCreateOpen(true); }}
          >
            <Plus className="w-3.5 h-3.5" /> Buat Pengumuman
          </Button>
        </div>
      )}

      {/* Table */}
      {annLoading ? (
        <div className="p-8 text-center text-xs text-muted-foreground">Memuat...</div>
      ) : announcements.length === 0 ? (
        <div className="ms-card p-8">
          <EmptyState icon={Megaphone} title="Belum ada pengumuman" description="Pengumuman akan muncul di sini" compact />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-[40px]">No</TableHead>
                <TableHead className="text-xs">Judul</TableHead>
                <TableHead className="text-xs max-w-[200px]">Isi</TableHead>
                <TableHead className="text-xs">Pembuat</TableHead>
                <TableHead className="text-xs">Dibuat</TableHead>
                {hasAnnouncementAccess && <TableHead className="text-xs">Berakhir</TableHead>}
                {hasAnnouncementAccess && <TableHead className="text-xs">Status</TableHead>}
                {hasAnnouncementAccess && <TableHead className="text-xs w-[80px]">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.map((ann, idx) => {
                const authorName = getUserName(ann.createdBy);
                return (
                  <TableRow
                    key={ann.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setAnnDetailItem(ann)}
                  >
                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="text-xs font-medium text-foreground">{ann.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {ann.content.substring(0, 60)}{ann.content.length > 60 ? "..." : ""}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <Avatar className="w-5 h-5">
                          {getUserAvatar(ann.createdBy) && <AvatarImage src={getUserAvatar(ann.createdBy)!} />}
                          <AvatarFallback className="bg-primary text-primary-foreground text-[7px] font-semibold">
                            {getInitials(authorName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-muted-foreground">{authorName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(ann.createdAt), "d MMM yyyy", { locale: localeID })}
                    </TableCell>
                    {hasAnnouncementAccess && (
                      <TableCell className="text-xs text-muted-foreground">
                        {ann.expiresAt
                          ? format(new Date(ann.expiresAt), "d MMM yyyy", { locale: localeID })
                          : "—"}
                      </TableCell>
                    )}
                    {hasAnnouncementAccess && (
                      <TableCell>
                        <Badge
                          variant={ann.status === "active" || !ann.status ? "default" : "secondary"}
                          className="text-[9px] cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); toggleAnnStatus(ann); }}
                        >
                          {ann.status === "active" || !ann.status ? "Aktif" : "Draft"}
                        </Badge>
                      </TableCell>
                    )}
                    {hasAnnouncementAccess && (
                      <TableCell>
                        <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => openAnnEdit(ann)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-6 h-6 text-destructive"
                            onClick={() => setConfirmDeleteAnnId(ann.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!annDetailItem} onOpenChange={o => { if (!o) setAnnDetailItem(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" /> {annDetailItem?.title}
            </DialogTitle>
          </DialogHeader>
          {annDetailItem && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="w-5 h-5">
                  {getUserAvatar(annDetailItem.createdBy) && (
                    <AvatarImage src={getUserAvatar(annDetailItem.createdBy)!} />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground text-[7px]">
                    {getInitials(getUserName(annDetailItem.createdBy))}
                  </AvatarFallback>
                </Avatar>
                {getUserName(annDetailItem.createdBy)} ·{" "}
                {format(new Date(annDetailItem.createdAt), "d MMM yyyy, HH:mm", { locale: localeID })}
                {annDetailItem.status && (
                  <Badge
                    variant={annDetailItem.status === "active" ? "default" : "secondary"}
                    className="text-[9px] ml-2"
                  >
                    {annDetailItem.status === "active" ? "Aktif" : "Draft"}
                  </Badge>
                )}
              </div>
              {annDetailItem.expiresAt && (
                <p className="text-[10px] text-muted-foreground">
                  Berakhir: {format(new Date(annDetailItem.expiresAt), "d MMM yyyy", { locale: localeID })}
                </p>
              )}
              <div className="prose prose-sm max-w-none text-sm text-foreground">
                <ReactMarkdown>{annDetailItem.content}</ReactMarkdown>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <AnnFormDialog
        open={annCreateOpen}
        onOpenChange={o => { if (!o) setAnnCreateOpen(false); }}
        isEdit={false}
      />

      {/* Edit Dialog */}
      <AnnFormDialog
        open={!!annEditItem}
        onOpenChange={o => { if (!o) setAnnEditItem(null); }}
        isEdit={true}
      />

      <ConfirmDialog
        open={!!confirmDeleteAnnId}
        onOpenChange={o => { if (!o) setConfirmDeleteAnnId(null); }}
        title="Hapus pengumuman ini?"
        variant="destructive"
        confirmText="Hapus"
        onConfirm={handleAnnDelete}
      />
    </div>
  );

  const [employeeSearch, setEmployeeSearch] = useState("");
  const employees = users.filter((u) => u.role === "employee");
  const filteredEmployees = employeeSearch
    ? employees.filter((e) => e.name.toLowerCase().includes(employeeSearch.toLowerCase()))
    : employees;

  useEffect(() => {
    if (canManageNotes && employeeId) {
      api.getAdminNotes({ toEmployeeId: employeeId }).then(setAdminNotes).catch(() => {});
    } else if (canManageNotes && !employeeId && notesTab === "pribadi") {
      if (user) {
        api.getDailyNotes({ userId: user.id }).then(setDailyNotes).catch(() => {});
        api.getAdminNotes({ toEmployeeId: user.id }).then(setAdminNotes).catch(() => {});
      }
    } else if (canManageNotes && !employeeId && notesTab === "karyawan" && selectedEmployeeId) {
      api.getAdminNotes({ toEmployeeId: selectedEmployeeId }).then(setAdminNotes).catch(() => {});
    } else if (!canManageNotes && user) {
      api.getDailyNotes({ userId: user.id }).then(setDailyNotes).catch(() => {});
      api.getAdminNotes({ toEmployeeId: user.id }).then(setAdminNotes).catch(() => {});
    }
  }, [canManageNotes, employeeId, user, notesTab, selectedEmployeeId]);

  const prevDay = () => setCurrentDate(format(subDays(new Date(currentDate), 1), "yyyy-MM-dd"));
  const nextDay = () => setCurrentDate(format(addDays(new Date(currentDate), 1), "yyyy-MM-dd"));

  const myAdminNotes = adminNotes.filter((n) => n.toEmployeeId === user?.id);
  const allBoardNotes: ((DailyNote & { _type: "daily" }) | (AdminNote & { _type: "admin" }))[] = [
    ...dailyNotes.map((n) => ({ ...n, _type: "daily" as const })),
    ...myAdminNotes.map((n) => ({ ...n, _type: "admin" as const })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const displayedNotes = filterMode === "all"
    ? allBoardNotes
    : allBoardNotes.filter((n) => {
      if (n._type === "daily") return (n as DailyNote & { _type: "daily" }).date === currentDate;
      return n.createdAt.startsWith(currentDate);
    });

  useEffect(() => {
    setNoteTransforms((prev) => {
      const newTransforms = { ...prev };
      let changed = false;
      displayedNotes.forEach((note) => {
        if (!newTransforms[note.id]) {
          newTransforms[note.id] = { ...generateNoteTransform(), z: 1 };
          changed = true;
        }
      });
      return changed ? newTransforms : prev;
    });
  }, [displayedNotes]);

  // ============================================================
  // VIEW: ADMIN/ACCESS — Tab Karyawan
  // ============================================================
  if (canManageNotes && !employeeId && notesTab === "karyawan") {
    const empNotes = adminNotes.filter((n) => n.toEmployeeId === selectedEmployeeId);
    const empName = users.find((u) => u.id === selectedEmployeeId)?.name || "";

    const handleSendNote = async () => {
      if (!adminNoteContent.trim() || !user || !selectedEmployeeId) return;
      setIsSending(true);
      try {
        const note = await api.createAdminNote({
          toEmployeeId: selectedEmployeeId,
          content: adminNoteContent.trim(),
          priority: adminNotePriority,
        });
        setAdminNotes((prev) => [note, ...prev]);
        setAdminNoteContent("");
        toast.success(`Catatan terkirim ke ${empName}`);
      } catch {
        toast.error("Gagal mengirim catatan");
      } finally {
        setIsSending(false);
      }
    };

    const handleAdminDeleteNote = async (id: string) => {
      try {
        await api.deleteAdminNote(id);
        setAdminNotes((prev) => prev.filter((n) => n.id !== id));
        setConfirmAdminDelete(null);
        toast.success("Catatan dihapus");
      } catch {
        toast.error("Gagal menghapus catatan");
      }
    };

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
        <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <StickyNote className="w-5 h-5" /> Info Center
        </h1>
        <AdminTabs />

        <div className="ms-card p-4 space-y-3">
          <Select value={selectedEmployeeId} onValueChange={(v) => { setSelectedEmployeeId(v); setAdminNotes([]); }}>
            <SelectTrigger className="text-xs h-9 w-[460px]">
              <SelectValue placeholder="Pilih karyawan..." />
            </SelectTrigger>
            <SelectContent className="h-96">
              <div className="p-2">
                <Input
                  placeholder="Cari nama..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              {filteredEmployees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id} className="text-xs">
                  {emp.name} {emp.position ? <Badge className="">{emp.position}</Badge> : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedEmployeeId ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
            <div className="lg:col-span-2 space-y-3">
              <div className="ms-card p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                    <MessageSquarePlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-semibold text-foreground leading-none">Kirim Catatan</h2>
                    <p className="text-[10px] text-muted-foreground mt-0.5">ke {empName}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Prioritas</Label>
                  <Select value={adminNotePriority} onValueChange={(v) => setAdminNotePriority(v as "normal" | "important")}>
                    <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                      <SelectItem value="important" className="text-xs">Penting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Isi Catatan</Label>
                  <Textarea
                    value={adminNoteContent}
                    onChange={(e) => setAdminNoteContent(e.target.value.slice(0, 2000))}
                    placeholder="Tulis instruksi, pengingat, atau arahan..."
                    className="text-sm resize-none min-h-[200px]"
                  />
                  <div className="flex justify-end">
                    <span className="text-[10px] text-muted-foreground">{adminNoteContent.length}/2000</span>
                  </div>
                </div>
                <Button onClick={handleSendNote} className="w-full text-xs gap-1.5" disabled={!adminNoteContent.trim() || isSending}>
                  <Send className="w-3.5 h-3.5" /> {isSending ? "Mengirim..." : "Kirim ke Papan Karyawan"}
                </Button>
              </div>
            </div>
            <div className="lg:col-span-3 space-y-3">
              {empNotes.length === 0 ? (
                <div className="ms-card">
                  <EmptyState icon={StickyNote} title="Belum ada catatan" description="Catatan yang kamu kirim akan muncul di sini." compact />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {empNotes.map((note) => (
                      <AdminStickyCard key={note.id} note={note} onDelete={(id) => setConfirmAdminDelete(id)} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="ms-card">
            <EmptyState icon={StickyNote} title="Pilih karyawan" description="Pilih karyawan dari dropdown di atas untuk mengirim atau melihat catatan." compact />
          </div>
        )}

        <ConfirmDialog
          open={!!confirmAdminDelete}
          onOpenChange={(open) => { if (!open) setConfirmAdminDelete(null); }}
          title="Hapus catatan ini?"
          description="Catatan yang dihapus tidak dapat dikembalikan."
          confirmText="Hapus"
          variant="destructive"
          onConfirm={() => confirmAdminDelete && (async () => {
            try {
              await api.deleteAdminNote(confirmAdminDelete);
              setAdminNotes((prev) => prev.filter((n) => n.id !== confirmAdminDelete));
              setConfirmAdminDelete(null);
              toast.success("Catatan dihapus");
            } catch { toast.error("Gagal menghapus catatan"); }
          })()}
        />
      </motion.div>
    );
  }

  // ============================================================
  // VIEW: PENGUMUMAN TAB — Announcements-page style UI
  // ============================================================
  if (notesTab === "pengumuman") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <StickyNote className="w-5 h-5" /> Info Center
        </h1>

        {canManageNotes ? <AdminTabs /> : <EmployeeTabs />}

        <AnnouncementsView />
      </motion.div>
    );
  }

  // ============================================================
  // VIEW: ADMIN — specific employee via route param
  // ============================================================
  if ((isAdmin || hasNotesAccess) && employeeId) {
    const empNotes = adminNotes.filter((n) => n.toEmployeeId === employeeId);
    const empName = users.find((u) => u.id === employeeId)?.name || "";

    const handleSendNote = async () => {
      if (!adminNoteContent.trim() || !user) return;
      setIsSending(true);
      try {
        const note = await api.createAdminNote({
          toEmployeeId: employeeId,
          content: adminNoteContent.trim(),
          priority: adminNotePriority,
        });
        setAdminNotes((prev) => [note, ...prev]);
        setAdminNoteContent("");
        toast.success(`Catatan terkirim ke ${empName}`);
      } catch {
        toast.error("Gagal mengirim catatan");
      } finally {
        setIsSending(false);
      }
    };

    const handleAdminDeleteNote = async (id: string) => {
      try {
        await api.deleteAdminNote(id);
        setAdminNotes((prev) => prev.filter((n) => n.id !== id));
        setConfirmAdminDelete(null);
        toast.success("Catatan dihapus");
      } catch {
        toast.error("Gagal menghapus catatan");
      }
    };

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-8xl">
        <EmployeeHeader employeeId={employeeId} backPath="/notes" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
          <div className="lg:col-span-2 space-y-3">
            <div className="ms-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <MessageSquarePlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-foreground leading-none">Kirim Catatan</h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">ke {empName}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Prioritas</Label>
                <Select value={adminNotePriority} onValueChange={(v) => setAdminNotePriority(v as "normal" | "important")}>
                  <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal" className="text-xs">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-warning inline-block" /> Normal
                      </span>
                    </SelectItem>
                    <SelectItem value="important" className="text-xs">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-destructive inline-block" /> Penting (Mencolok)
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={`rounded-md px-3 py-2 text-[10px] font-semibold flex items-center gap-1.5 transition-colors
                ${adminNotePriority === "important" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                <ShieldCheck className="w-3 h-3" />
                {adminNotePriority === "important"
                  ? "Catatan ini akan ditandai PENTING — menonjol di papan karyawan"
                  : "Catatan ini akan muncul dengan label Admin di papan karyawan"}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Isi Catatan</Label>
                <Textarea
                  value={adminNoteContent}
                  onChange={(e) => setAdminNoteContent(e.target.value.slice(0, 2000))}
                  placeholder="Tulis instruksi, pengingat, atau arahan untuk karyawan..."
                  className="text-sm resize-none min-h-[240px]"
                  rows={5}
                />
                <div className="flex justify-end">
                  <span className="text-[10px] text-muted-foreground">{adminNoteContent.length}/2000</span>
                </div>
              </div>
              <Button onClick={handleSendNote} className="w-full text-xs gap-1.5" disabled={!adminNoteContent.trim() || isSending}>
                <Send className="w-3.5 h-3.5" />
                {isSending ? "Mengirim..." : "Kirim ke Papan Karyawan"}
              </Button>
            </div>
          </div>
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              {empNotes.some((n) => n.priority === "important") && (
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" /> Ada catatan penting
                </Badge>
              )}
            </div>
            {empNotes.length === 0 ? (
              <div className="ms-card">
                <EmptyState icon={StickyNote} title="Belum ada catatan" description="Catatan yang kamu kirim ke karyawan ini akan muncul di sini sebagai sticky note." compact />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <AnimatePresence>
                  {empNotes.map((note) => (
                    <AdminStickyCard key={note.id} note={note} onDelete={(id) => setConfirmAdminDelete(id)} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
        <ConfirmDialog
          open={!!confirmAdminDelete}
          onOpenChange={(open) => { if (!open) setConfirmAdminDelete(null); }}
          title="Hapus catatan ini?"
          description="Catatan yang dihapus tidak dapat dikembalikan dan akan hilang dari papan karyawan."
          confirmText="Hapus"
          variant="destructive"
          onConfirm={() => confirmAdminDelete && handleAdminDeleteNote(confirmAdminDelete)}
        />
      </motion.div>
    );
  }

  // ============================================================
  // VIEW: KARYAWAN — Papan Catatan (Drag & Drop)
  // ============================================================
  const doAddNote = async () => {
    if (!newNoteText.trim() || !user) return;
    try {
      const targetDate = filterMode === "date" ? currentDate : format(new Date(), "yyyy-MM-dd");
      const note = await api.createDailyNote({ date: targetDate, content: newNoteText.trim() });
      setDailyNotes((prev) => [note, ...prev]);
      setNewNoteText("");
      setConfirmSave(false);
      toast.success("Catatan tersimpan di papan");
    } catch {
      toast.error("Gagal menyimpan catatan");
      setConfirmSave(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await api.deleteDailyNote(id);
      setDailyNotes((prev) => prev.filter((n) => n.id !== id));
      setConfirmDelete(null);
      setSelectedNote(null);
      toast.success("Catatan dihapus");
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  const isAdminNote = (note: any): note is AdminNote => "fromAdminId" in note;

  const bringToFront = (id: string) => {
    setHighestZ((prev) => prev + 1);
    setNoteTransforms((prev) => ({ ...prev, [id]: { ...prev[id], z: highestZ + 1 } }));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <StickyNote className="w-5 h-5" /> Info Center
      </h1>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {canManageNotes && !employeeId ? <AdminTabs /> : <EmployeeTabs />}
        <div className="bg-background p-1 rounded-md shadow-sm border inline-flex">
          <button
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${filterMode === "all" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Layers className="w-3.5 h-3.5 inline" />
          </button>
          <button
            onClick={() => setFilterMode("date")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${filterMode === "date" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Calendar className="w-3.5 h-3.5 inline" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[75vh]">
        <div className="lg:col-span-4 flex flex-col gap-4 h-full">
          <AnimatePresence>
            {filterMode === "date" && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="ms-card p-3 flex items-center justify-between"
              >
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={prevDay}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-medium text-foreground">
                    {format(new Date(currentDate), "d MMMM yyyy", { locale: localeID })}
                  </span>
                  <Input
                    type="date"
                    value={currentDate}
                    onChange={(e) => e.target.value && setCurrentDate(e.target.value)}
                    className="w-[110px] h-6 text-[10px] bg-transparent border-none p-0 text-center text-muted-foreground focus-visible:ring-0 shadow-none"
                  />
                </div>
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={nextDay}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="ms-card p-4 space-y-3 flex flex-col flex-grow">
            <h2 className="text-xs font-semibold text-foreground">
              {filterMode === "date" ? `Tambah Catatan (${format(new Date(currentDate), "d MMM")})` : "Tambah Catatan Baru"}
            </h2>
            <Textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value.slice(0, 2000))}
              placeholder="Tulis catatan harian atau tugas..."
              className="flex-grow min-h-[150px] text-sm resize-none bg-transparent"
            />
            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-muted-foreground">{newNoteText.length}/2000</span>
              <Button
                size="sm"
                className="gap-1 text-xs"
                onClick={() => { if (newNoteText.trim()) setConfirmSave(true); }}
                disabled={!newNoteText.trim()}
              >
                <Plus className="w-3 h-3" /> Tempel di Papan
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 relative h-full">
          <div ref={boardRef} className="absolute inset-0 rounded-xl border-2 border-dashed border-border bg-muted/30 overflow-hidden">
            {displayedNotes.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-sm text-muted-foreground">Papan catatan masih kosong</p>
              </div>
            ) : (
              <AnimatePresence>
                {displayedNotes.map((note) => {
                  const noteIsAdmin = note._type === "admin";
                  const priority = noteIsAdmin ? (note as AdminNote).priority : "normal";
                  const colorStyle = getStickyColor(note.id, noteIsAdmin, priority);
                  const transform = noteTransforms[note.id] || { x: "50%", y: "50%", rot: 0, z: 1 };

                  return (
                    <motion.div
                      key={note.id}
                      drag
                      dragConstraints={boardRef}
                      dragMomentum={false}
                      onDragStart={() => { isDragging.current = true; }}
                      onDragEnd={() => { setTimeout(() => { isDragging.current = false; }, 150); }}
                      onPointerDown={() => bringToFront(note.id)}
                      whileDrag={{ scale: 1.05, cursor: "grabbing" }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                      style={{
                        position: "absolute",
                        left: transform.x,
                        top: transform.y,
                        rotate: `${transform.rot}deg`,
                        zIndex: transform.z,
                      }}
                      className={`group relative w-40 sm:w-44 min-h-[11rem] flex flex-col rounded-sm rounded-br-[28px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.12)] cursor-grab transition-shadow ${colorStyle}`}
                      onClick={(e) => {
                        if (isDragging.current) { e.preventDefault(); return; }
                        setSelectedNote(note);
                      }}
                    >
                      {noteIsAdmin && (
                        <div className={`flex items-center gap-1 px-2.5 py-1 text-[8px] font-bold tracking-widest uppercase rounded-t-sm flex-shrink-0
                          ${priority === "important" ? "bg-destructive/30 text-destructive" : "bg-warning/30 text-warning"}`}>
                          <ShieldCheck className="w-2.5 h-2.5 flex-shrink-0" />
                          {priority === "important" ? "Admin · Penting" : "Admin"}
                        </div>
                      )}
                      <div className="p-3 flex flex-col flex-grow">
                        <div className="flex justify-between items-start mb-2 relative z-10">
                          <p className="text-[9px] opacity-70">
                            {format(new Date(note.createdAt), "d MMM, HH:mm", { locale: localeID })}
                          </p>
                          {!noteIsAdmin && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDelete(note.id); }}
                              className="opacity-40 hover:opacity-100 hover:text-destructive transition-opacity p-1 -mr-1 -mt-1"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex-grow mt-1 pointer-events-none relative z-10">
                          <p className="text-xs leading-relaxed whitespace-pre-wrap line-clamp-6">{note.content}</p>
                        </div>
                      </div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 bg-black/5 dark:bg-white/5 rounded-br-3xl border-l border-t border-black/5 dark:border-white/5 rounded-tl-lg shadow-[-2px_-2px_6px_rgba(0,0,0,0.05)] pointer-events-none transition-all duration-300 group-hover:w-9 group-hover:h-9" />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedNote} onOpenChange={(open) => { if (!open) setSelectedNote(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <StickyNote className="w-4 h-4" />
              {selectedNote && isAdminNote(selectedNote) ? "Catatan dari Admin" : "Catatan Harian"}
            </DialogTitle>
          </DialogHeader>
          {selectedNote && (
            <div className="space-y-3">
              {isAdminNote(selectedNote) && (
                <Badge
                  variant={selectedNote.priority === "important" ? "destructive" : "outline"}
                  className={`text-[9px] gap-1 ${selectedNote.priority !== "important" ? "border-warning text-warning" : ""}`}
                >
                  <ShieldCheck className="w-2.5 h-2.5" />
                  {selectedNote.priority === "important" ? "Admin · Penting" : "Admin · Normal"}
                </Badge>
              )}
              <p className="text-sm text-foreground whitespace-pre-wrap max-h-96 overflow-y-auto">{selectedNote.content}</p>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(selectedNote.createdAt), "EEEE, d MMMM yyyy HH:mm", { locale: localeID })}
              </p>
              {!isAdminNote(selectedNote) && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs gap-1 mt-2"
                  onClick={() => { setConfirmDelete(selectedNote.id); setSelectedNote(null); }}
                >
                  <Trash2 className="w-3 h-3" /> Hapus Catatan
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmSave}
        onOpenChange={setConfirmSave}
        title="Simpan catatan?"
        description="Catatan akan disimpan ke papan."
        confirmText="Ya, Simpan"
        onConfirm={doAddNote}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}
        title="Hapus catatan ini?"
        description="Catatan yang dihapus tidak dapat dikembalikan."
        confirmText="Hapus"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDeleteNote(confirmDelete)}
      />
    </motion.div>
  );
};

export default Notes;