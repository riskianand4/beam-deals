import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMenuSettings } from "@/contexts/MenuSettingsContext";
import api, { getUploadUrl } from "@/lib/api";
import type { ExplorerFolder, ExplorerFile, User, TeamGroup, PartnerData, AccessPermission } from "@/types";
import { motion } from "framer-motion";
import {
  Archive, ChevronRight, Clipboard, Copy, Download, Edit3, ExternalLink, Eye, File, FileText,
  Folder, FolderOpen, FolderPlus, Grid3X3, Handshake, Home, Image, List,
  Lock, MoreVertical, Music, Pin, PinOff, Scissors, Search, Share2,
  Star, Trash2, Unlock, Upload, Video, X,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import SuccessDialog from "@/components/SuccessDialog";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType.includes("pdf")) return FileText;
  return File;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const canPreview = (mimeType: string) => {
  return mimeType.startsWith("image/") || mimeType.startsWith("video/") || mimeType.startsWith("audio/") || mimeType.includes("pdf");
};

type ClipboardItem = { type: "folder" | "file"; item: any; action: "copy" | "cut" };

const Explorer = () => {
  const { user, isAdmin, users } = useAuth();
  const { hasAccess } = useMenuSettings();
  const canManage = isAdmin || hasAccess("explorer");

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<ExplorerFolder[]>([]);
  const [files, setFiles] = useState<ExplorerFile[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Selection
  const [selectedItem, setSelectedItem] = useState<{ type: "folder" | "file"; id: string } | null>(null);

  // Clipboard
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);

  // Drag
  const [dragItem, setDragItem] = useState<{ type: "folder" | "file"; id: string } | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [isDraggingExternal, setIsDraggingExternal] = useState(false);

  // Dialogs
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameDialog, setRenameDialog] = useState<{ type: "folder" | "file"; id: string; name: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "folder" | "file"; id: string; name: string } | null>(null);
  const [shareDialog, setShareDialog] = useState<ExplorerFolder | null>(null);
  const [shareAccessType, setShareAccessType] = useState("all");
  const [shareAccessIds, setShareAccessIds] = useState<string[]>([]);
  const [sharePermissions, setSharePermissions] = useState<AccessPermission[]>([]);
  const [successDialog, setSuccessDialog] = useState<{ title: string } | null>(null);
  const [linkPartnerDialog, setLinkPartnerDialog] = useState<ExplorerFolder | null>(null);
  const [linkPartnerId, setLinkPartnerId] = useState("");
  const [partners, setPartners] = useState<PartnerData[]>([]);

  // Preview
  const [previewFile, setPreviewFile] = useState<ExplorerFile | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: "folder" | "file"; item: any } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [teams, setTeams] = useState<TeamGroup[]>([]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getExplorerContents(currentFolderId || undefined);
      setFolders(data.folders);
      setFiles(data.files);
      setBreadcrumb(data.breadcrumb);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [currentFolderId]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    api.getTeams().then(setTeams).catch(() => {});
    api.getPartners().then(setPartners).catch(() => {});
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedItem || !canManage) return;
      const item = selectedItem.type === "folder" 
        ? folders.find(f => f.id === selectedItem.id) 
        : files.find(f => f.id === selectedItem.id);
      if (!item) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        setClipboard({ type: selectedItem.type, item, action: "copy" });
        toast.info("Disalin ke clipboard");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "x") {
        e.preventDefault();
        setClipboard({ type: selectedItem.type, item, action: "cut" });
        toast.info("Dipotong ke clipboard");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedItem, folders, files, canManage]);

  // Ctrl+V paste
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (!canManage) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        if (clipboard) {
          e.preventDefault();
          try {
            if (clipboard.action === "copy" && clipboard.type === "file") {
              await api.copyExplorerFile(clipboard.item.id, currentFolderId);
              toast.success("File berhasil disalin");
            } else if (clipboard.action === "cut") {
              await api.moveExplorerItem(clipboard.item.id, clipboard.type, currentFolderId);
              toast.success("Berhasil dipindahkan");
              setClipboard(null);
            }
            refresh();
          } catch (err: any) {
            toast.error(err.message || "Gagal");
          }
          return;
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [clipboard, currentFolderId, canManage, refresh]);

  // Paste from OS clipboard (files)
  useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      if (!canManage) return;
      const clipFiles = e.clipboardData?.files;
      if (clipFiles && clipFiles.length > 0) {
        e.preventDefault();
        for (let i = 0; i < clipFiles.length; i++) {
          const fd = new FormData();
          fd.append("file", clipFiles[i]);
          if (currentFolderId) fd.append("folderId", currentFolderId);
          try {
            await api.uploadExplorerFile(fd);
          } catch {}
        }
        refresh();
        toast.success(`${clipFiles.length} file diunggah dari clipboard`);
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [currentFolderId, canManage, refresh]);

  const getUserName = (id: string) => users.find((u) => u.id === id)?.name || "Unknown";

  // Sort: pinned first
  const sortedFolders = useMemo(() => {
    const filtered = folders.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
    return [...filtered].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [folders, search]);

  const sortedFiles = useMemo(() => {
    const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
    return [...filtered].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [files, search]);

  const canDeleteItem = (createdAt: string) => {
    if (isAdmin) return true;
    return Date.now() - new Date(createdAt).getTime() < THREE_DAYS_MS;
  };

  const navigateTo = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSearch("");
    setSelectedItem(null);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await api.createExplorerFolder({ name: newFolderName.trim(), parentId: currentFolderId });
      setNewFolderOpen(false);
      setNewFolderName("");
      refresh();
      setSuccessDialog({ title: "Folder berhasil dibuat" });
    } catch { toast.error("Gagal membuat folder"); }
  };

  const handleUploadFiles = async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;
    let count = 0;
    for (const file of arr) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        if (currentFolderId) fd.append("folderId", currentFolderId);
        await api.uploadExplorerFile(fd);
        count++;
      } catch {}
    }
    refresh();
    toast.success(`${count} file berhasil diunggah`);
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files;
    if (!fl) return;
    await handleUploadFiles(fl);
    e.target.value = "";
  };

  const handleRename = async () => {
    if (!renameDialog || !renameDialog.name.trim()) return;
    try {
      if (renameDialog.type === "folder") {
        await api.updateExplorerFolder(renameDialog.id, { name: renameDialog.name.trim() } as any);
      } else {
        await api.renameExplorerFile(renameDialog.id, renameDialog.name.trim());
      }
      setRenameDialog(null);
      refresh();
    } catch { toast.error("Gagal mengubah nama"); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === "folder") {
        await api.deleteExplorerFolder(deleteConfirm.id);
      } else {
        await api.deleteExplorerFile(deleteConfirm.id);
      }
      setDeleteConfirm(null);
      refresh();
      setSuccessDialog({ title: `${deleteConfirm.type === "folder" ? "Folder" : "File"} berhasil dihapus` });
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus");
    }
  };

  const handleShare = async () => {
    if (!shareDialog) return;
    try {
      await api.shareExplorerFolder(shareDialog.id, shareAccessType, shareAccessIds, sharePermissions);
      setShareDialog(null);
      refresh();
      toast.success("Hak akses folder diperbarui");
    } catch { toast.error("Gagal mengubah akses"); }
  };

  const handleZip = async (folderId: string, folderName: string) => {
    try {
      toast.info("Memproses ZIP...");
      const blob = await api.downloadExplorerZip(folderId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = folderName + ".zip"; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Gagal membuat ZIP"); }
  };

  const handleLinkPartner = async () => {
    if (!linkPartnerDialog) return;
    try {
      await api.linkExplorerFolderToPartner(linkPartnerDialog.id, linkPartnerId);
      setLinkPartnerDialog(null);
      setLinkPartnerId("");
      refresh();
      toast.success("Folder berhasil disambungkan ke mitra");
    } catch { toast.error("Gagal menyambungkan"); }
  };

  const handleTogglePin = async (type: "folder" | "file", id: string) => {
    try {
      await api.toggleExplorerPin(type, id);
      refresh();
    } catch { toast.error("Gagal"); }
  };

  const handleToggleLock = async (type: "folder" | "file", id: string) => {
    try {
      await api.toggleExplorerLock(type, id);
      refresh();
    } catch { toast.error("Gagal"); }
  };

  const handleContextMenu = (e: React.MouseEvent, type: "folder" | "file", item: any) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type, item });
    setSelectedItem({ type, id: item.id });
  };

  // Drag & Drop internal
  const handleDragStart = (e: React.DragEvent, type: "folder" | "file", id: string) => {
    setDragItem({ type, id });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragItem && dragItem.type === "folder" && dragItem.id === folderId) return;
    setDragOverFolder(folderId);
  };

  const handleDropOnFolder = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);

    if (e.dataTransfer.files.length > 0 && !dragItem) {
      const arr = Array.from(e.dataTransfer.files);
      for (const file of arr) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folderId", targetFolderId);
        try { await api.uploadExplorerFile(fd); } catch {}
      }
      refresh();
      toast.success("File diunggah ke folder");
      return;
    }

    if (!dragItem || !canManage) return;
    if (dragItem.type === "folder" && dragItem.id === targetFolderId) return;
    try {
      await api.moveExplorerItem(dragItem.id, dragItem.type, targetFolderId);
      setDragItem(null);
      refresh();
      toast.success("Berhasil dipindahkan");
    } catch (err: any) {
      toast.error(err.message || "Gagal memindahkan");
    }
  };

  const handleExternalDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setIsDraggingExternal(true);
    }
  };
  const handleExternalDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target || !contentRef.current?.contains(e.relatedTarget as Node)) {
      setIsDraggingExternal(false);
    }
  };
  const handleExternalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingExternal(false);
    if (!canManage) return;
    if (e.dataTransfer.files.length > 0) {
      await handleUploadFiles(e.dataTransfer.files);
    }
  };

  const accessLabel = (folder: ExplorerFolder) => {
    if (folder.accessType === "all") return "Semua";
    if (folder.accessType === "team") return "Tim tertentu";
    if (folder.accessType === "specific") return "Karyawan tertentu";
    if (folder.accessType === "partner") return "Mitra";
    return folder.accessType;
  };

  // Permission helpers for share dialog
  const getPermission = (userId: string): "view" | "edit" => {
    return sharePermissions.find(p => p.userId === userId)?.permission || "view";
  };

  const setPermission = (userId: string, permission: "view" | "edit") => {
    setSharePermissions(prev => {
      const filtered = prev.filter(p => p.userId !== userId);
      return [...filtered, { userId, permission }];
    });
  };

  // Open share dialog with existing data
  const openShareDialog = (folder: ExplorerFolder) => {
    setShareDialog(folder);
    setShareAccessType(folder.accessType);
    setShareAccessIds(folder.accessIds || []);
    setSharePermissions(folder.accessPermissions || []);
  };

  // Check delete protection
  const isDeleteProtected = (type: "folder" | "file", item: any): string | null => {
    if (item.pinned) return "Lepas pin terlebih dahulu sebelum menghapus";
    if (type === "folder" && item.linkedPartnerId) return "Putuskan sambungan mitra terlebih dahulu sebelum menghapus";
    return null;
  };

  // Context menu items builder
  const renderContextMenuItems = (type: "folder" | "file", item: any) => {
    const items: JSX.Element[] = [];
    if (type === "folder") {
      items.push(
        <button key="open" className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-md" onClick={() => { navigateTo(item.id); setContextMenu(null); }}>
          <FolderOpen className="w-3.5 h-3.5" /> Buka
        </button>
      );
    } else {
      // File: Buka (preview)
      items.push(
        <button key="preview" className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-md" onClick={() => { setPreviewFile(item); setContextMenu(null); }}>
          <Eye className="w-3.5 h-3.5" /> Buka
        </button>
      );
      items.push(
        <a key="newtab" href={getUploadUrl(item.fileUrl)} target="_blank" rel="noreferrer" className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-md" onClick={() => setContextMenu(null)}>
          <ExternalLink className="w-3.5 h-3.5" /> Buka di Tab Baru
        </a>
      );
      items.push(
        <a key="download" href={getUploadUrl(item.fileUrl)} download target="_blank" rel="noreferrer" className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-md" onClick={() => setContextMenu(null)}>
          <Download className="w-3.5 h-3.5" /> Unduh
        </a>
      );
    }
    if (canManage) {
      items.push(
        <button key="pin" className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-md" onClick={() => { handleTogglePin(type, item.id); setContextMenu(null); }}>
          {item.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />} {item.pinned ? "Lepas Pin" : "Sematkan"}
        </button>
      );
      items.push(
        <button key="lock" className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-md" onClick={() => { handleToggleLock(type, item.id); setContextMenu(null); }}>
          {item.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />} {item.locked ? "Buka Kunci" : "Kunci"}
        </button>
      );
      items.push(
        <button key="copy" className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-md" onClick={() => { setClipboard({ type, item, action: "copy" }); setContextMenu(null); toast.info("Disalin"); }}>
          <Copy className="w-3.5 h-3.5" /> Copy
        </button>
      );
      items.push(
        <button key="cut" className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-md" onClick={() => { setClipboard({ type, item, action: "cut" }); setContextMenu(null); toast.info("Dipotong"); }}>
          <Scissors className="w-3.5 h-3.5" /> Cut
        </button>
      );
      items.push(
        <button key="rename" className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-md" onClick={() => { setRenameDialog({ type, id: item.id, name: item.name }); setContextMenu(null); }}>
          <Edit3 className="w-3.5 h-3.5" /> Ubah Nama
        </button>
      );
      if (type === "folder") {
        items.push(
          <button key="share" className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-md" onClick={() => { openShareDialog(item); setContextMenu(null); }}>
            <Share2 className="w-3.5 h-3.5" /> Atur Akses
          </button>
        );
        items.push(
          <button key="link" className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-md" onClick={() => { setLinkPartnerDialog(item); setLinkPartnerId(item.linkedPartnerId || ""); setContextMenu(null); }}>
            <Handshake className="w-3.5 h-3.5" /> Sambungkan ke Mitra
          </button>
        );
        items.push(
          <button key="zip" className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-md" onClick={() => { handleZip(item.id, item.name); setContextMenu(null); }}>
            <Archive className="w-3.5 h-3.5" /> Unduh ZIP
          </button>
        );
      }

      const deleteProtection = isDeleteProtected(type, item);
      if (deleteProtection) {
        items.push(
          <Tooltip key="delete">
            <TooltipTrigger asChild>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground rounded-md cursor-not-allowed opacity-50" disabled>
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs max-w-[200px]">{deleteProtection}</TooltipContent>
          </Tooltip>
        );
      } else if (canDeleteItem(item.createdAt) && !item.locked) {
        items.push(
          <button key="delete" className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-md" onClick={() => { setDeleteConfirm({ type, id: item.id, name: item.name }); setContextMenu(null); }}>
            <Trash2 className="w-3.5 h-3.5" /> Hapus
          </button>
        );
      }
    }
    return items;
  };

  // Preview renderer
  const renderPreview = (file: ExplorerFile) => {
    const url = getUploadUrl(file.fileUrl);
    if (file.mimeType.startsWith("image/")) {
      return <img src={url} alt={file.name} className="max-w-full max-h-[70vh] object-contain mx-auto rounded-lg" />;
    }
    if (file.mimeType.includes("pdf")) {
      return <iframe src={url} className="w-full h-[70vh] rounded-lg border" title={file.name} />;
    }
    if (file.mimeType.startsWith("video/")) {
      return <video src={url} controls className="max-w-full max-h-[70vh] mx-auto rounded-lg"><track kind="captions" /></video>;
    }
    if (file.mimeType.startsWith("audio/")) {
      return (
        <div className="flex flex-col items-center gap-4 py-10">
          <Music className="w-16 h-16 text-muted-foreground" />
          <p className="text-sm font-medium">{file.name}</p>
          <audio src={url} controls className="w-full max-w-md"><track kind="captions" /></audio>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <File className="w-16 h-16 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Preview tidak tersedia untuk tipe file ini</p>
        <a href={url} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline" className="gap-2 text-xs"><Download className="w-4 h-4" /> Unduh File</Button>
        </a>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-8xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5"><FolderOpen className="w-6 h-6" /> Explorer</h1>
          <p className="text-xs text-muted-foreground mt-1">Kelola dokumen dan file perusahaan secara terstruktur.</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            {clipboard && (
              <Button size="sm" variant="outline" className="gap-2 text-xs h-9" onClick={async () => {
                try {
                  if (clipboard.action === "copy" && clipboard.type === "file") {
                    await api.copyExplorerFile(clipboard.item.id, currentFolderId);
                    toast.success("File berhasil disalin");
                  } else {
                    await api.moveExplorerItem(clipboard.item.id, clipboard.type, currentFolderId);
                    toast.success("Berhasil dipindahkan");
                    setClipboard(null);
                  }
                  refresh();
                } catch (err: any) { toast.error(err.message || "Gagal"); }
              }}>
                <Clipboard className="w-4 h-4" /> Paste
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-2 text-xs h-9" onClick={() => setNewFolderOpen(true)}>
              <FolderPlus className="w-4 h-4" /> Folder Baru
            </Button>
            <Button size="sm" className="gap-2 text-xs h-9" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4" /> Unggah File
            </Button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleUploadFile} multiple />
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs flex-wrap bg-card border border-border rounded-lg px-3 py-2 shadow-sm">
        <button onClick={() => navigateTo(null)} className="flex items-center gap-1 hover:underline font-medium"><Home className="w-3.5 h-3.5" /> Beranda</button>
        {breadcrumb.map((crumb) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <button onClick={() => navigateTo(crumb.id)} className="hover:underline font-medium">{crumb.name}</button>
          </span>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari file atau folder..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs bg-card" />
        </div>
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          <button onClick={() => setViewMode("grid")} className={`p-2 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}><Grid3X3 className="w-4 h-4" /></button>
          <button onClick={() => setViewMode("list")} className={`p-2 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}><List className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        onDragOver={handleExternalDragOver}
        onDragLeave={handleExternalDragLeave}
        onDrop={handleExternalDrop}
        className={`relative min-h-[200px] ${isDraggingExternal ? "ring-2 ring-primary ring-dashed rounded-xl bg-primary/5" : ""}`}
      >
        {isDraggingExternal && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/5 rounded-xl pointer-events-none">
            <div className="text-center">
              <Upload className="w-10 h-10 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold text-primary">Lepaskan file di sini untuk mengunggah</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : sortedFolders.length === 0 && sortedFiles.length === 0 ? (
          <EmptyState icon={FolderOpen} title="Folder ini kosong" description={canManage ? "Buat folder baru, unggah file, atau seret file ke sini." : "Belum ada file di folder ini."} />
        ) : viewMode === "grid" ? (
          <div className="space-y-5">
            {sortedFolders.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Folder · {sortedFolders.length}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {sortedFolders.map((folder) => (
                    <div
                      key={folder.id}
                      draggable={canManage && !folder.locked}
                      onDragStart={(e) => handleDragStart(e, "folder", folder.id)}
                      onDragEnd={() => setDragItem(null)}
                      onDragOver={(e) => handleDragOverFolder(e, folder.id)}
                      onDragLeave={() => setDragOverFolder(null)}
                      onDrop={(e) => handleDropOnFolder(e, folder.id)}
                      className={`group bg-card border rounded-xl p-4 cursor-pointer hover:bg-muted/40 transition-all relative ${
                        selectedItem?.type === "folder" && selectedItem.id === folder.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      } ${dragOverFolder === folder.id ? "ring-2 ring-primary bg-primary/10" : ""} ${
                        clipboard?.action === "cut" && clipboard.type === "folder" && clipboard.item.id === folder.id ? "opacity-40" : ""
                      }`}
                      onClick={(e) => { e.stopPropagation(); setSelectedItem({ type: "folder", id: folder.id }); }}
                      onDoubleClick={() => navigateTo(folder.id)}
                      onContextMenu={(e) => handleContextMenu(e, "folder", folder)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="relative">
                          <Folder className="w-10 h-10 fill-primary/10" />
                          {folder.pinned && <Pin className="w-3 h-3 text-primary absolute -top-1 -right-1" />}
                          {folder.locked && <Lock className="w-3 h-3 text-warning absolute -bottom-1 -right-1" />}
                        </div>
                        {canManage && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-1" align="end" onClick={(e) => e.stopPropagation()}>
                              {renderContextMenuItems("folder", folder)}
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-foreground line-clamp-1">{folder.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[8px] bg-background">{accessLabel(folder)}</Badge>
                        {folder.linkedPartnerId && <Badge variant="outline" className="text-[8px] bg-primary/5 border-primary/20"><Handshake className="w-2.5 h-2.5 mr-0.5" />Mitra</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sortedFiles.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">File · {sortedFiles.length}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {sortedFiles.map((file) => {
                    const FileIcon = getFileIcon(file.mimeType);
                    const isImage = file.mimeType.startsWith("image/");
                    return (
                      <div
                        key={file.id}
                        draggable={canManage && !file.locked}
                        onDragStart={(e) => handleDragStart(e, "file", file.id)}
                        onDragEnd={() => setDragItem(null)}
                        className={`group bg-card border rounded-xl overflow-hidden cursor-pointer hover:bg-muted/40 transition-all relative ${
                          selectedItem?.type === "file" && selectedItem.id === file.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                        } ${clipboard?.action === "cut" && clipboard.type === "file" && clipboard.item.id === file.id ? "opacity-40" : ""}`}
                        onClick={(e) => { e.stopPropagation(); setSelectedItem({ type: "file", id: file.id }); }}
                        onDoubleClick={() => setPreviewFile(file)}
                        onContextMenu={(e) => handleContextMenu(e, "file", file)}
                      >
                        <div className="h-24 bg-muted/30 flex items-center justify-center relative overflow-hidden">
                          {isImage ? (
                            <img src={getUploadUrl(file.fileUrl)} alt={file.name} className="w-full h-full object-cover" />
                          ) : (
                            <FileIcon className="w-10 h-10 text-muted-foreground/50" />
                          )}
                          <div className="absolute top-1 left-1 flex gap-1">
                            {file.pinned && <Pin className="w-3 h-3 text-primary" />}
                            {file.locked && <Lock className="w-3 h-3 text-warning" />}
                          </div>
                          {canManage && (
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="p-1 rounded bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-1" align="end" onClick={(e) => e.stopPropagation()}>
                                  {renderContextMenuItems("file", file)}
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-[11px] font-semibold text-foreground line-clamp-1">{file.name}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">{formatSize(file.fileSize)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30 text-muted-foreground border-b border-border">
                  <th className="text-left p-3 font-semibold">Nama</th>
                  <th className="text-left p-3 font-semibold w-24">Ukuran</th>
                  <th className="text-left p-3 font-semibold w-32">Diubah</th>
                  <th className="text-left p-3 font-semibold w-28">Pembuat</th>
                  <th className="text-right p-3 font-semibold w-20">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sortedFolders.map((folder) => (
                  <tr
                    key={folder.id}
                    draggable={canManage && !folder.locked}
                    onDragStart={(e) => handleDragStart(e, "folder", folder.id)}
                    onDragEnd={() => setDragItem(null)}
                    onDragOver={(e) => handleDragOverFolder(e, folder.id)}
                    onDragLeave={() => setDragOverFolder(null)}
                    onDrop={(e) => handleDropOnFolder(e, folder.id)}
                    className={`border-b border-border/50 cursor-pointer transition-colors ${
                      dragOverFolder === folder.id ? "bg-primary/10" : "hover:bg-muted/20"
                    } ${selectedItem?.type === "folder" && selectedItem.id === folder.id ? "bg-primary/5" : ""}`}
                    onClick={(e) => { e.stopPropagation(); setSelectedItem({ type: "folder", id: folder.id }); }}
                    onDoubleClick={() => navigateTo(folder.id)}
                    onContextMenu={(e) => handleContextMenu(e, "folder", folder)}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Folder className="w-5 h-5 fill-primary/10 shrink-0" />
                        <span className="font-semibold text-foreground">{folder.name}</span>
                        {folder.pinned && <Pin className="w-3 h-3 text-primary" />}
                        {folder.locked && <Lock className="w-3 h-3 text-warning" />}
                        <Badge variant="outline" className="text-[8px] ml-1">{accessLabel(folder)}</Badge>
                        {folder.linkedPartnerId && <Badge variant="outline" className="text-[8px] bg-primary/5 border-primary/20"><Handshake className="w-2.5 h-2.5" /></Badge>}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">—</td>
                    <td className="p-3 text-muted-foreground">{format(new Date(folder.updatedAt || folder.createdAt), "dd MMM yyyy", { locale: localeID })}</td>
                    <td className="p-3 text-muted-foreground">{getUserName(folder.createdBy)}</td>
                    <td className="p-3 text-right">
                      {canManage && (
                        <Popover>
                          <PopoverTrigger asChild><button onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-muted"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button></PopoverTrigger>
                          <PopoverContent className="w-48 p-1" align="end" onClick={(e) => e.stopPropagation()}>{renderContextMenuItems("folder", folder)}</PopoverContent>
                        </Popover>
                      )}
                    </td>
                  </tr>
                ))}
                {sortedFiles.map((file) => {
                  const FileIcon = getFileIcon(file.mimeType);
                  return (
                    <tr
                      key={file.id}
                      draggable={canManage && !file.locked}
                      onDragStart={(e) => handleDragStart(e, "file", file.id)}
                      onDragEnd={() => setDragItem(null)}
                      className={`border-b border-border/50 transition-colors hover:bg-muted/20 ${selectedItem?.type === "file" && selectedItem.id === file.id ? "bg-primary/5" : ""}`}
                      onClick={(e) => { e.stopPropagation(); setSelectedItem({ type: "file", id: file.id }); }}
                      onDoubleClick={() => setPreviewFile(file)}
                      onContextMenu={(e) => handleContextMenu(e, "file", file)}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <FileIcon className="w-5 h-5 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground">{file.name}</span>
                          {file.pinned && <Pin className="w-3 h-3 text-primary" />}
                          {file.locked && <Lock className="w-3 h-3 text-warning" />}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{formatSize(file.fileSize)}</td>
                      <td className="p-3 text-muted-foreground">{format(new Date(file.updatedAt || file.createdAt), "dd MMM yyyy", { locale: localeID })}</td>
                      <td className="p-3 text-muted-foreground">{getUserName(file.createdBy)}</td>
                      <td className="p-3 text-right">
                        {canManage && (
                          <Popover>
                            <PopoverTrigger asChild><button className="p-1 rounded hover:bg-muted"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button></PopoverTrigger>
                            <PopoverContent className="w-48 p-1" align="end">{renderContextMenuItems("file", file)}</PopoverContent>
                          </Popover>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg p-1 min-w-[180px]" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
          {renderContextMenuItems(contextMenu.type, contextMenu.item)}
        </div>
      )}

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(o) => { if (!o) setPreviewFile(null); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2 pr-10">
              <Eye className="w-4 h-4 shrink-0" />
              <span className="truncate">{previewFile?.name}</span>
              {previewFile && (
                <a href={getUploadUrl(previewFile.fileUrl)} target="_blank" rel="noreferrer" className="ml-auto shrink-0">
                  <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-7">
                    <ExternalLink className="w-3.5 h-3.5" /> Tab Baru
                  </Button>
                </a>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {previewFile && renderPreview(previewFile)}
          </div>
          {previewFile && (
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 pt-2 border-t">
              <span>{formatSize(previewFile.fileSize)} · {previewFile.mimeType}</span>
              <a href={getUploadUrl(previewFile.fileUrl)} download target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7"><Download className="w-3 h-3" /> Unduh</Button>
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-sm flex items-center gap-2"><FolderPlus className="w-4 h-4" /> Folder Baru</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Folder</Label>
              <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Nama folder..." className="text-xs" onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); }} autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setNewFolderOpen(false)} className="text-xs">Batal</Button>
              <Button size="sm" onClick={handleCreateFolder} className="text-xs">Buat</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameDialog} onOpenChange={(o) => { if (!o) setRenameDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-sm flex items-center gap-2"><Edit3 className="w-4 h-4" /> Ubah Nama</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={renameDialog?.name || ""} onChange={(e) => setRenameDialog((prev) => prev ? { ...prev, name: e.target.value } : null)} className="text-xs" onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }} autoFocus />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setRenameDialog(null)} className="text-xs">Batal</Button>
              <Button size="sm" onClick={handleRename} className="text-xs">Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog — Redesigned with granular permissions */}
      <Dialog open={!!shareDialog} onOpenChange={(o) => { if (!o) setShareDialog(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-sm flex items-center gap-2"><Share2 className="w-4 h-4" /> Atur Akses — {shareDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipe Akses</Label>
              <Select value={shareAccessType} onValueChange={(v) => { setShareAccessType(v); setShareAccessIds([]); setSharePermissions([]); }}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Semua Karyawan</SelectItem>
                  <SelectItem value="team" className="text-xs">Tim Tertentu</SelectItem>
                  <SelectItem value="specific" className="text-xs">Karyawan Tertentu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Specific employees — Table with View/Edit radio */}
            {shareAccessType === "specific" && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="text-left p-2.5 font-semibold">Karyawan</th>
                      <th className="text-center p-2.5 font-semibold w-20">View</th>
                      <th className="text-center p-2.5 font-semibold w-20">Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter((u) => u.id !== user?.id).map((u) => {
                      const isSelected = shareAccessIds.includes(u.id);
                      const perm = getPermission(u.id);
                      return (
                        <tr key={u.id} className={`border-b last:border-0 transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/20"}`}>
                          <td className="p-2.5">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(c) => {
                                  if (c) {
                                    setShareAccessIds(prev => [...prev, u.id]);
                                    if (!sharePermissions.find(p => p.userId === u.id)) {
                                      setSharePermissions(prev => [...prev, { userId: u.id, permission: "view" }]);
                                    }
                                  } else {
                                    setShareAccessIds(prev => prev.filter(x => x !== u.id));
                                    setSharePermissions(prev => prev.filter(p => p.userId !== u.id));
                                  }
                                }}
                              />
                              <span className="font-medium">{u.name}</span>
                            </label>
                          </td>
                          <td className="p-2.5 text-center">
                            <RadioGroup value={isSelected ? perm : ""} onValueChange={(v) => setPermission(u.id, v as "view" | "edit")} className="flex justify-center">
                              <RadioGroupItem value="view" disabled={!isSelected} className="mx-auto" />
                            </RadioGroup>
                          </td>
                          <td className="p-2.5 text-center">
                            <RadioGroup value={isSelected ? perm : ""} onValueChange={(v) => setPermission(u.id, v as "view" | "edit")} className="flex justify-center">
                              <RadioGroupItem value="edit" disabled={!isSelected} className="mx-auto" />
                            </RadioGroup>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Team — Accordion with member permissions */}
            {shareAccessType === "team" && (
              <div className="space-y-2">
                {teams.map((t) => {
                  const isTeamSelected = shareAccessIds.includes(t.id);
                  const teamMembers = users.filter(u => t.memberIds?.includes(u.id));
                  return (
                    <div key={t.id} className="border rounded-lg overflow-hidden">
                      <label className="flex items-center gap-2 p-2.5 text-xs cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors">
                        <Checkbox
                          checked={isTeamSelected}
                          onCheckedChange={(c) => {
                            if (c) {
                              setShareAccessIds(prev => [...prev, t.id]);
                              // Add all members with default "view"
                              const newPerms = teamMembers
                                .filter(m => !sharePermissions.find(p => p.userId === m.id))
                                .map(m => ({ userId: m.id, permission: "view" as const }));
                              setSharePermissions(prev => [...prev, ...newPerms]);
                            } else {
                              setShareAccessIds(prev => prev.filter(x => x !== t.id));
                              // Remove team member permissions
                              const memberIds = teamMembers.map(m => m.id);
                              setSharePermissions(prev => prev.filter(p => !memberIds.includes(p.userId)));
                            }
                          }}
                        />
                        <span className="font-semibold">{t.name}</span>
                        <Badge variant="outline" className="text-[8px] ml-auto">{teamMembers.length} anggota</Badge>
                      </label>
                      {isTeamSelected && teamMembers.length > 0 && (
                        <Accordion type="single" collapsible defaultValue="members">
                          <AccordionItem value="members" className="border-0">
                            <AccordionTrigger className="px-2.5 py-1.5 text-[10px] text-muted-foreground hover:no-underline">
                              Atur hak akses anggota
                            </AccordionTrigger>
                            <AccordionContent>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-muted/20 border-t border-b">
                                    <th className="text-left p-2 font-semibold">Anggota</th>
                                    <th className="text-center p-2 font-semibold w-20">View</th>
                                    <th className="text-center p-2 font-semibold w-20">Edit</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {teamMembers.map((m) => {
                                    const perm = getPermission(m.id);
                                    return (
                                      <tr key={m.id} className="border-b last:border-0">
                                        <td className="p-2 font-medium">{m.name}</td>
                                        <td className="p-2 text-center">
                                          <RadioGroup value={perm} onValueChange={(v) => setPermission(m.id, v as "view" | "edit")} className="flex justify-center">
                                            <RadioGroupItem value="view" className="mx-auto" />
                                          </RadioGroup>
                                        </td>
                                        <td className="p-2 text-center">
                                          <RadioGroup value={perm} onValueChange={(v) => setPermission(m.id, v as "view" | "edit")} className="flex justify-center">
                                            <RadioGroupItem value="edit" className="mx-auto" />
                                          </RadioGroup>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShareDialog(null)} className="text-xs">Batal</Button>
              <Button size="sm" onClick={handleShare} className="text-xs">Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link to Partner Dialog */}
      <Dialog open={!!linkPartnerDialog} onOpenChange={(o) => { if (!o) { setLinkPartnerDialog(null); setLinkPartnerId(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-sm flex items-center gap-2"><Handshake className="w-4 h-4" /> Sambungkan ke Mitra</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">File dalam folder "<span className="font-semibold">{linkPartnerDialog?.name}</span>" akan tampil di tab Laporan mitra yang dipilih.</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Pilih Mitra</Label>
              <Select value={linkPartnerId} onValueChange={setLinkPartnerId}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Pilih mitra..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">— Tidak disambungkan —</SelectItem>
                  {partners.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.company || p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => { setLinkPartnerDialog(null); setLinkPartnerId(""); }} className="text-xs">Batal</Button>
              <Button size="sm" onClick={handleLinkPartner} className="text-xs">Sambungkan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(o) => { if (!o) setDeleteConfirm(null); }}
        title={`Hapus ${deleteConfirm?.type === "folder" ? "Folder" : "File"}`}
        description={`Anda yakin ingin menghapus "${deleteConfirm?.name}"? ${deleteConfirm?.type === "folder" ? "Semua isi folder juga akan dihapus." : ""}`}
        confirmText="Hapus"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <SuccessDialog open={!!successDialog} onOpenChange={(o) => { if (!o) setSuccessDialog(null); }} title={successDialog?.title || ""} />
    </motion.div>
  );
};

export default Explorer;
