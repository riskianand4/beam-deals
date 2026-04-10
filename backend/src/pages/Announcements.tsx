import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMenuSettings } from "@/contexts/MenuSettingsContext";
import { getUploadUrl } from "@/lib/api";
import api from "@/lib/api";
import type { Announcement } from "@/types";
import { motion } from "framer-motion";
import { Megaphone, Plus, Edit2, Trash2, ArrowLeft, CheckCircle2, Clock, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import StatsCard from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";

const Announcements = () => {
  const { user, isAdmin, users } = useAuth();
  const { hasAccess } = useMenuSettings();
  const navigate = useNavigate();
  const canManage = isAdmin || hasAccess("pengumuman");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formExpiresAt, setFormExpiresAt] = useState<Date | undefined>(undefined);
  const [formStatus, setFormStatus] = useState<"active" | "draft">("active");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<Announcement | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAnnouncements();
      setAnnouncements(data);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const getUser = (id: string) => users.find(u => u.id === id);
  const getUserName = (id: string) => getUser(id)?.name ?? "Tidak dikenal";
  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").substring(0, 2);
  const getUserAvatar = (id: string) => { const u = getUser(id); return u?.avatar ? getUploadUrl(u.avatar) : null; };

  const activeCount = announcements.filter(a => a.status === "active" || !a.status).length;
  const draftCount = announcements.filter(a => a.status === "draft").length;

  const handleCreate = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;
    try {
      await api.createAnnouncement({
        title: formTitle.trim(),
        content: formContent.trim(),
        expiresAt: formExpiresAt ? formExpiresAt.toISOString() : undefined,
        status: formStatus,
      });
      setCreateOpen(false);
      resetForm();
      refresh();
      toast.success("Pengumuman berhasil dibuat");
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat pengumuman");
    }
  };

  const handleUpdate = async () => {
    if (!editItem || !formTitle.trim() || !formContent.trim()) return;
    try {
      await api.updateAnnouncement(editItem.id, {
        title: formTitle.trim(),
        content: formContent.trim(),
        expiresAt: formExpiresAt ? formExpiresAt.toISOString() : undefined,
        status: formStatus,
      });
      setEditItem(null);
      resetForm();
      refresh();
      toast.success("Pengumuman diperbarui");
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui");
    }
  };

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormExpiresAt(undefined);
    setFormStatus("active");
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.deleteAnnouncement(confirmDeleteId);
      setAnnouncements(prev => prev.filter(a => a.id !== confirmDeleteId));
      setConfirmDeleteId(null);
      toast.success("Pengumuman dihapus");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus");
    }
  };

  const openEdit = (item: Announcement) => {
    setEditItem(item);
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormExpiresAt(item.expiresAt ? new Date(item.expiresAt) : undefined);
    setFormStatus(item.status || "active");
  };

  const toggleStatus = async (item: Announcement) => {
    const newStatus = item.status === "active" ? "draft" : "active";
    try {
      await api.updateAnnouncement(item.id, { status: newStatus });
      refresh();
      toast.success(`Status diubah ke ${newStatus === "active" ? "Aktif" : "Draft"}`);
    } catch {
      toast.error("Gagal mengubah status");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-8xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => navigate("/notes")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-primary" /> Pengumuman
          </h1>
        </div>
        {canManage && (
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Buat Pengumuman
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {canManage && (
        <div className="grid grid-cols-3 gap-2">
          <StatsCard label="Total" value={announcements.length} icon={Megaphone} color="text-primary" bgColor="bg-primary/10" delay={0} />
          <StatsCard label="Aktif" value={activeCount} icon={CheckCircle2} color="text-success" bgColor="bg-success/10" delay={1} />
          <StatsCard label="Draft" value={draftCount} icon={Clock} color="text-muted-foreground" bgColor="bg-muted" delay={2} />
        </div>
      )}

      {loading ? (
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
                {canManage && <TableHead className="text-xs">Berakhir</TableHead>}
                {canManage && <TableHead className="text-xs">Status</TableHead>}
                {canManage && <TableHead className="text-xs w-[80px]">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.map((ann, idx) => {
                const authorName = getUserName(ann.createdBy);
                return (
                  <TableRow key={ann.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetailItem(ann)}>
                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="text-xs font-medium text-foreground">{ann.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{ann.content.substring(0, 60)}{ann.content.length > 60 ? "..." : ""}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <Avatar className="w-5 h-5">
                          {getUserAvatar(ann.createdBy) && <AvatarImage src={getUserAvatar(ann.createdBy)!} />}
                          <AvatarFallback className="bg-primary text-primary-foreground text-[7px] font-semibold">{getInitials(authorName)}</AvatarFallback>
                        </Avatar>
                        <span className="text-muted-foreground">{authorName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(ann.createdAt), "d MMM yyyy", { locale: localeID })}</TableCell>
                    {canManage && (
                      <TableCell className="text-xs text-muted-foreground">
                        {ann.expiresAt ? format(new Date(ann.expiresAt), "d MMM yyyy", { locale: localeID }) : "—"}
                      </TableCell>
                    )}
                    {canManage && (
                      <TableCell>
                        <Badge
                          variant={ann.status === "active" || !ann.status ? "default" : "secondary"}
                          className="text-[9px] cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); toggleStatus(ann); }}
                        >
                          {ann.status === "active" || !ann.status ? "Aktif" : "Draft"}
                        </Badge>
                      </TableCell>
                    )}
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => openEdit(ann)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="w-6 h-6 text-destructive" onClick={() => setConfirmDeleteId(ann.id)}>
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
      <Dialog open={!!detailItem} onOpenChange={o => { if (!o) setDetailItem(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" /> {detailItem?.title}
            </DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="w-5 h-5">
                  {getUserAvatar(detailItem.createdBy) && <AvatarImage src={getUserAvatar(detailItem.createdBy)!} />}
                  <AvatarFallback className="bg-primary text-primary-foreground text-[7px]">{getInitials(getUserName(detailItem.createdBy))}</AvatarFallback>
                </Avatar>
                {getUserName(detailItem.createdBy)} · {format(new Date(detailItem.createdAt), "d MMM yyyy, HH:mm", { locale: localeID })}
                {detailItem.status && <Badge variant={detailItem.status === "active" ? "default" : "secondary"} className="text-[9px] ml-2">{detailItem.status === "active" ? "Aktif" : "Draft"}</Badge>}
              </div>
              {detailItem.expiresAt && (
                <p className="text-[10px] text-muted-foreground">Berakhir: {format(new Date(detailItem.expiresAt), "d MMM yyyy", { locale: localeID })}</p>
              )}
              <div className="prose prose-sm max-w-none text-sm text-foreground">
                <ReactMarkdown>{detailItem.content}</ReactMarkdown>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog open={createOpen || !!editItem} onOpenChange={o => { if (!o) { setCreateOpen(false); setEditItem(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" /> {editItem ? "Edit Pengumuman" : "Buat Pengumuman"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Judul</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Judul pengumuman" className="text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Isi</Label>
              <Textarea value={formContent} onChange={e => setFormContent(e.target.value)} placeholder="Tulis isi pengumuman... (mendukung Markdown)" className="text-xs min-h-[120px]" />
              <p className="text-[10px] text-muted-foreground">Mendukung format Markdown</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Berakhir Pada (opsional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs", !formExpiresAt && "text-muted-foreground")}>
                    <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                    {formExpiresAt ? format(formExpiresAt, "d MMM yyyy", { locale: localeID }) : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={formExpiresAt} onSelect={setFormExpiresAt} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              {formExpiresAt && (
                <Button variant="ghost" size="sm" className="text-[10px] h-5 px-1" onClick={() => setFormExpiresAt(undefined)}>Hapus tanggal</Button>
              )}
            </div>
            {canManage && (
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={formStatus} onValueChange={v => setFormStatus(v as "active" | "draft")}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-xs">Aktif</SelectItem>
                    <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full text-xs" onClick={editItem ? handleUpdate : handleCreate} disabled={!formTitle.trim() || !formContent.trim()}>
              {editItem ? "Simpan Perubahan" : "Buat Pengumuman"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!confirmDeleteId} onOpenChange={o => { if (!o) setConfirmDeleteId(null); }} title="Hapus pengumuman ini?" variant="destructive" confirmText="Hapus" onConfirm={handleDelete} />
    </motion.div>
  );
};

export default Announcements;
