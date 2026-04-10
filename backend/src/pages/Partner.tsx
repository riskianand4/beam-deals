import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMenuSettings } from "@/contexts/MenuSettingsContext";
import api, { getUploadUrl } from "@/lib/api";
import type {
  PartnerData,
  PartnerProject,
  PartnerReport,
  PartnerContract,
  ExplorerFile,
} from "@/types";
import { motion } from "framer-motion";
import {
  Building2,
  FileText,
  FolderOpen,
  Handshake,
  Plus,
  Search,
  Trash2,
  Edit2,
  BarChart3,
  FileSignature,
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  ArrowUpRight,
  Download,
  File,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";

const PROJECT_STATUS_BADGE: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  completed: "bg-primary/10  border-primary/20",
  "on-hold": "bg-warning/10 text-warning border-warning/20",
};
const PROJECT_STATUS_LABEL: Record<string, string> = {
  active: "Aktif",
  completed: "Selesai",
  "on-hold": "Ditunda",
};
const CONTRACT_STATUS_BADGE: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
  draft: "bg-muted text-muted-foreground border-border",
};

const Partner = () => {
  const { isAdmin } = useAuth();
  const { hasAccess } = useMenuSettings();
  const canManage = isAdmin || hasAccess("mitra");

  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [projects, setProjects] = useState<PartnerProject[]>([]);
  const [reports, setReports] = useState<PartnerReport[]>([]);
  const [contracts, setContracts] = useState<PartnerContract[]>([]);
  const [search, setSearch] = useState("");

  // Dialogs
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<{
    type: string;
    id: string;
  } | null>(null);

  // Edit mode
  const [editPartnerId, setEditPartnerId] = useState<string | null>(null);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [editContractId, setEditContractId] = useState<string | null>(null);

  // Forms
  const [pName, setPName] = useState("");
  const [pCompany, setPCompany] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pPhone, setPPhone] = useState("");

  const [prTitle, setPrTitle] = useState("");
  const [prDesc, setPrDesc] = useState("");
  const [prPartnerId, setPrPartnerId] = useState("");
  const [prStatus, setPrStatus] = useState<"active" | "completed" | "on-hold">(
    "active",
  );
  const [prProgress, setPrProgress] = useState(0);

  const [cTitle, setCTitle] = useState("");
  const [cPartnerId, setCPartnerId] = useState("");
  const [cStartDate, setCStartDate] = useState("");
  const [cEndDate, setCEndDate] = useState("");
  const [cStatus, setCStatus] = useState<"active" | "expired" | "draft">(
    "draft",
  );

  // Laporan from Explorer linked files
  const [linkedFiles, setLinkedFiles] = useState<
    Record<string, (ExplorerFile & { folderName?: string })[]>
  >({});

  useEffect(() => {
    api
      .getPartners()
      .then(setPartners)
      .catch(() => {});
    api
      .getPartnerProjects()
      .then(setProjects)
      .catch(() => {});
    api
      .getPartnerReports()
      .then(setReports)
      .catch(() => {});
    api
      .getPartnerContracts()
      .then(setContracts)
      .catch(() => {});
  }, []);

  // Fetch linked explorer files for all partners
  useEffect(() => {
    if (partners.length === 0) return;
    Promise.all(
      partners.map((p) =>
        api
          .getExplorerPartnerFiles(p.id)
          .then((files) => ({ id: p.id, files }))
          .catch(() => ({ id: p.id, files: [] as any[] })),
      ),
    ).then((results) => {
      const map: Record<string, any[]> = {};
      results.forEach((r) => {
        if (r.files.length > 0) map[r.id] = r.files;
      });
      setLinkedFiles(map);
    });
  }, [partners]);

  const allLinkedFiles = useMemo(() => {
    const all: (ExplorerFile & {
      folderName?: string;
      partnerName?: string;
    })[] = [];
    Object.entries(linkedFiles).forEach(([pid, files]) => {
      const pName = partners.find((p) => p.id === pid)?.name || "";
      files.forEach((f) => all.push({ ...f, partnerName: pName }));
    });
    return all;
  }, [linkedFiles, partners]);

  const filteredPartners = useMemo(() => {
    if (!search) return partners;
    const q = search.toLowerCase();
    return partners.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.company.toLowerCase().includes(q),
    );
  }, [partners, search]);

  // Edit helpers
  const openEditPartner = (p: PartnerData) => {
    setEditPartnerId(p.id);
    setPName(p.name);
    setPCompany(p.company || "");
    setPEmail(p.email || "");
    setPPhone(p.phone || "");
    setPartnerOpen(true);
  };
  const openEditProject = (p: PartnerProject) => {
    setEditProjectId(p.id);
    setPrTitle(p.title);
    setPrDesc(p.description || "");
    setPrPartnerId(p.partnerId);
    setPrStatus(p.status as any);
    setPrProgress(p.progress || 0);
    setProjectOpen(true);
  };
  const openEditContract = (c: PartnerContract) => {
    setEditContractId(c.id);
    setCTitle(c.title);
    setCPartnerId(c.partnerId);
    setCStartDate(c.startDate || "");
    setCEndDate(c.endDate || "");
    setCStatus(c.status as any);
    setContractOpen(true);
  };

  const resetPartnerForm = () => {
    setPName("");
    setPCompany("");
    setPEmail("");
    setPPhone("");
    setEditPartnerId(null);
  };
  const resetProjectForm = () => {
    setPrTitle("");
    setPrDesc("");
    setPrPartnerId("");
    setPrStatus("active");
    setPrProgress(0);
    setEditProjectId(null);
  };
  const resetContractForm = () => {
    setCTitle("");
    setCPartnerId("");
    setCStartDate("");
    setCEndDate("");
    setCStatus("draft");
    setEditContractId(null);
  };

  const handleSavePartner = async () => {
    if (!pName.trim()) return;
    try {
      if (editPartnerId) {
        const updated = await api.updatePartner(editPartnerId, {
          name: pName,
          company: pCompany,
          email: pEmail,
          phone: pPhone,
        });
        setPartners(
          partners.map((p) => (p.id === editPartnerId ? updated : p)),
        );
        toast.success("Mitra berhasil diperbarui");
      } else {
        const p = await api.createPartner({
          name: pName,
          company: pCompany,
          email: pEmail,
          phone: pPhone,
        });
        setPartners([p, ...partners]);
        toast.success("Mitra berhasil ditambahkan");
      }
      setPartnerOpen(false);
      resetPartnerForm();
    } catch {
      toast.error("Gagal menyimpan mitra");
    }
  };

  const handleSaveProject = async () => {
    if (!prTitle.trim() || !prPartnerId) return;
    try {
      if (editProjectId) {
        const updated = await api.updatePartnerProject(editProjectId, {
          title: prTitle,
          description: prDesc,
          partnerId: prPartnerId,
          status: prStatus,
          progress: prProgress,
        });
        setProjects(
          projects.map((p) => (p.id === editProjectId ? updated : p)),
        );
        toast.success("Proyek berhasil diperbarui");
      } else {
        const p = await api.createPartnerProject({
          title: prTitle,
          description: prDesc,
          partnerId: prPartnerId,
          status: prStatus,
          progress: prProgress,
        });
        setProjects([p, ...projects]);
        toast.success("Proyek berhasil ditambahkan");
      }
      setProjectOpen(false);
      resetProjectForm();
    } catch {
      toast.error("Gagal menyimpan proyek");
    }
  };

  const handleSaveContract = async () => {
    if (!cTitle.trim() || !cPartnerId) return;
    try {
      if (editContractId) {
        const updated = await api.updatePartnerContract(editContractId, {
          title: cTitle,
          partnerId: cPartnerId,
          startDate: cStartDate,
          endDate: cEndDate,
          status: cStatus,
        });
        setContracts(
          contracts.map((c) => (c.id === editContractId ? updated : c)),
        );
        toast.success("Kontrak berhasil diperbarui");
      } else {
        const c = await api.createPartnerContract({
          title: cTitle,
          partnerId: cPartnerId,
          startDate: cStartDate,
          endDate: cEndDate,
          status: cStatus,
        });
        setContracts([c, ...contracts]);
        toast.success("Kontrak berhasil ditambahkan");
      }
      setContractOpen(false);
      resetContractForm();
    } catch {
      toast.error("Gagal menyimpan kontrak");
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      if (confirmDeleteId.type === "partner") {
        await api.deletePartner(confirmDeleteId.id);
        setPartners(partners.filter((p) => p.id !== confirmDeleteId.id));
      } else if (confirmDeleteId.type === "project") {
        await api.deletePartnerProject(confirmDeleteId.id);
        setProjects(projects.filter((p) => p.id !== confirmDeleteId.id));
      } else if (confirmDeleteId.type === "contract") {
        await api.deletePartnerContract(confirmDeleteId.id);
        setContracts(contracts.filter((c) => c.id !== confirmDeleteId.id));
      }
      setConfirmDeleteId(null);
      toast.success("Berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  const getPartnerName = (id: string) =>
    partners.find((p) => p.id === id)?.name || "Mitra Tidak Diketahui";
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 max-w-8xl mx-auto pb-10"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
            <Handshake className="w-6 h-6 " /> Manajemen Mitra Kerja Sama
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Kelola data mitra, proyek kolaborasi, dan dokumen kontrak dalam satu
            tempat.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 " />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Total Mitra
            </p>
            <p className="text-2xl font-bold text-foreground">
              {partners.length}
            </p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center shrink-0">
            <FolderOpen className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Proyek Aktif
            </p>
            <p className="text-2xl font-bold text-foreground">
              {projects.filter((p) => p.status === "active").length}
            </p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
            <FileSignature className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Kontrak Aktif
            </p>
            <p className="text-2xl font-bold text-foreground">
              {contracts.filter((c) => c.status === "active").length}
            </p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
            <BarChart3 className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Laporan Terkumpul
            </p>
            <p className="text-2xl font-bold text-foreground">
              {allLinkedFiles.length + reports.length}
            </p>
          </div>
        </div>
      </div>

      <TooltipProvider>
        <Tabs defaultValue="partners" className="w-full space-y-4">
          <TabsList className="bg-transparent justify-start rounded-none p-0 h-auto space-x-6">
            <TabsTrigger
              value="partners"
              className="px-0 py-3 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none"
            >
              <span className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4" /> Daftar Mitra
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="px-0 py-3 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none"
            >
              <span className="flex items-center gap-2 text-sm">
                <FolderOpen className="w-4 h-4" /> Proyek
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="contracts"
              className="px-0 py-3 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none"
            >
              <span className="flex items-center gap-2 text-sm">
                <FileSignature className="w-4 h-4" /> Kontrak
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="px-0 py-3 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none"
            >
              <span className="flex items-center gap-2 text-sm">
                <BarChart3 className="w-4 h-4" /> Laporan
              </span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: MITRA */}
          <TabsContent value="partners" className="mt-4">
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama mitra atau perusahaan..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs bg-muted/30"
                  />
                </div>
                {canManage && (
                  <Button
                    size="sm"
                    className="gap-2 text-xs h-9 shrink-0"
                    onClick={() => {
                      resetPartnerForm();
                      setPartnerOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4" /> Tambah Mitra
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[40%]">Informasi Mitra</TableHead>
                      <TableHead className="w-[30%]">Kontak</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right w-[80px]">
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPartners.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10">
                          <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            Mitra tidak ditemukan.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPartners.map((p) => (
                        <TableRow
                          key={p.id}
                          className="group hover:bg-muted/40 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10 border shadow-sm rounded-lg">
                                <AvatarFallback className="bg-primary/10  text-xs font-bold rounded-lg">
                                  {getInitials(p.company || p.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-sm text-foreground">
                                  {p.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {p.company || "Personal / Independen"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Mail className="w-3.5 h-3.5" />{" "}
                                {p.email || "-"}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Phone className="w-3.5 h-3.5" />{" "}
                                {p.phone || "-"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                p.status === "active" ? "default" : "secondary"
                              }
                              className="text-[10px] font-medium"
                            >
                              {p.status === "active" ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {canManage ? (
                              <div onClick={(e) => e.stopPropagation()}>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-40 p-1"
                                    align="end"
                                  >
                                    <button
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-md transition-colors"
                                      onClick={() => openEditPartner(p)}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" /> Edit
                                      Mitra
                                    </button>
                                    <button
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                      onClick={() =>
                                        setConfirmDeleteId({
                                          type: "partner",
                                          id: p.id,
                                        })
                                      }
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                                      Mitra
                                    </button>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: PROYEK */}
          <TabsContent value="projects" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Proyek Kerja Sama Berjalan
              </h2>
              {canManage && (
                <Button
                  size="sm"
                  className="gap-2 text-xs h-9 shadow-sm"
                  onClick={() => {
                    resetProjectForm();
                    setProjectOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" /> Tambah Proyek
                </Button>
              )}
            </div>
            {projects.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="Belum ada proyek"
                description="Tambahkan proyek kolaborasi dengan mitra Anda."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] border-transparent font-medium ${PROJECT_STATUS_BADGE[p.status]}`}
                      >
                        {PROJECT_STATUS_LABEL[p.status]}
                      </Badge>
                      {canManage && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-7 h-7 -mt-1 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-1" align="end">
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-md transition-colors"
                              onClick={() => openEditProject(p)}
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit Proyek
                            </button>
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                              onClick={() =>
                                setConfirmDeleteId({
                                  type: "project",
                                  id: p.id,
                                })
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus Proyek
                            </button>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-foreground line-clamp-1 mb-1">
                      {p.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px] mb-4">
                      {p.description ||
                        "Tidak ada deskripsi rinci untuk proyek ini."}
                    </p>
                    <div className="mt-auto space-y-4">
                      <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg border border-border/50">
                        <Avatar className="w-6 h-6 rounded border shadow-sm">
                          <AvatarFallback className="bg-primary/20  text-[8px] font-bold rounded">
                            {getInitials(getPartnerName(p.partnerId))}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-foreground truncate">
                          {getPartnerName(p.partnerId)}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                          <span>Progress Pencapaian</span>
                          <span
                            className={
                              p.progress === 100
                                ? "text-success"
                                : "text-foreground"
                            }
                          >
                            {p.progress}%
                          </span>
                        </div>
                        <Progress
                          value={p.progress}
                          className={`h-1.5 ${p.progress === 100 ? "bg-success/20 [&>div]:bg-success" : ""}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: KONTRAK */}
          <TabsContent value="contracts" className="mt-4">
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-foreground">
                  Dokumen Kontrak
                </h2>
                {canManage && (
                  <Button
                    size="sm"
                    className="gap-2 text-xs h-9 shrink-0"
                    onClick={() => {
                      resetContractForm();
                      setContractOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4" /> Buat Kontrak
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[30%]">Judul Kontrak</TableHead>
                      <TableHead className="w-[25%]">Mitra Terkait</TableHead>
                      <TableHead className="w-[20%]">Masa Berlaku</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right w-[80px]">
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10">
                          <FileSignature className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            Belum ada dokumen kontrak.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      contracts.map((c) => (
                        <TableRow
                          key={c.id}
                          className="group hover:bg-muted/40 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <span className="font-semibold text-sm text-foreground">
                                {c.title}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground font-medium">
                              {getPartnerName(c.partnerId)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {c.startDate || "-"} s/d {c.endDate || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-medium border-transparent ${CONTRACT_STATUS_BADGE[c.status]}`}
                            >
                              {c.status === "active"
                                ? "Aktif Berjalan"
                                : c.status === "expired"
                                  ? "Kadaluarsa"
                                  : "Draft"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {canManage ? (
                              <div onClick={(e) => e.stopPropagation()}>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-40 p-1"
                                    align="end"
                                  >
                                    <button
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted rounded-md transition-colors"
                                      onClick={() => openEditContract(c)}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" /> Edit
                                      Kontrak
                                    </button>
                                    <button
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                      onClick={() =>
                                        setConfirmDeleteId({
                                          type: "contract",
                                          id: c.id,
                                        })
                                      }
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                                      Kontrak
                                    </button>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: LAPORAN */}
          <TabsContent value="reports" className="mt-4">
            <div className="bg-card border border-border rounded-xl shadow-sm p-5">
              <h2 className="text-sm font-semibold text-foreground mb-1">
                Laporan & Dokumentasi Rekanan
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                File yang ditampilkan di sini berasal dari folder Explorer yang
                sudah disambungkan ke mitra.
              </p>
              {allLinkedFiles.length === 0 && reports.length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="Belum ada laporan masuk"
                  description="Sambungkan folder di Explorer ke mitra untuk menampilkan file di sini."
                  compact
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allLinkedFiles.map((f, idx) => (
                    <div
                      key={f.id || idx}
                      className="flex items-start gap-4 p-4 rounded-xl border border-border bg-muted/10 hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-background border border-border shadow-sm flex items-center justify-center shrink-0">
                        <File className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="text-sm font-bold text-foreground line-clamp-1">
                          {f.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{f.partnerName}</span>
                          <span>·</span>
                          <span>{f.folderName}</span>
                          <span>·</span>
                          <span>{formatSize(f.fileSize)}</span>
                        </div>
                        <a
                          href={getUploadUrl(f.fileUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] font-semibold hover:underline mt-1"
                        >
                          <Download className="w-3 h-3" /> Unduh
                        </a>
                      </div>
                    </div>
                  ))}
                  {reports.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-start gap-4 p-4 rounded-xl border border-border bg-muted/10 hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-background border border-border shadow-sm flex items-center justify-center shrink-0">
                        <BarChart3 className="w-5 h-5 " />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-bold text-foreground line-clamp-1">
                          {r.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {r.content || "Laporan tidak memiliki rincian teks."}
                        </p>
                        {r.fileUrl && (
                          <a
                            href={r.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[10px] font-semibold  hover:underline mt-2"
                          >
                            <ArrowUpRight className="w-3 h-3" /> Buka Dokumen
                            Lampiran
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </TooltipProvider>

      {/* DIALOGS */}

      {/* Partner Dialog (Add/Edit) */}
      <Dialog
        open={partnerOpen}
        onOpenChange={(o) => {
          setPartnerOpen(o);
          if (!o) resetPartnerForm();
        }}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-border bg-muted/20">
            <DialogTitle className="text-base flex items-center gap-2">
              <Building2 className="w-5 h-5 " />{" "}
              {editPartnerId ? "Edit Mitra" : "Tambah Mitra Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                PIC <span className="text-destructive">*</span>
              </Label>
              <Input
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                className="text-xs h-10"
                placeholder="cth. Budi Santoso"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Mitra</Label>
              <Input
                value={pCompany}
                onChange={(e) => setPCompany(e.target.value)}
                className="text-xs h-10"
                placeholder="cth. PT Teknologi Nusantara"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email</Label>
                <Input
                  type="email"
                  value={pEmail}
                  onChange={(e) => setPEmail(e.target.value)}
                  className="text-xs h-10"
                  placeholder="budi@contoh.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nomor Telepon</Label>
                <Input
                  value={pPhone}
                  onChange={(e) => setPPhone(e.target.value)}
                  className="text-xs h-10"
                  placeholder="0812..."
                />
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-border bg-muted/10 flex justify-end gap-2">
            <Button
              variant="ghost"
              className="h-9 text-xs"
              onClick={() => setPartnerOpen(false)}
            >
              Batal
            </Button>
            <Button
              className="h-9 text-xs"
              onClick={handleSavePartner}
              disabled={!pName.trim()}
            >
              {editPartnerId ? "Perbarui" : "Simpan Mitra"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Project Dialog (Add/Edit) */}
      <Dialog
        open={projectOpen}
        onOpenChange={(o) => {
          setProjectOpen(o);
          if (!o) resetProjectForm();
        }}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-border bg-muted/20">
            <DialogTitle className="text-base flex items-center gap-2">
              <FolderOpen className="w-5 h-5 " />{" "}
              {editProjectId ? "Edit Proyek" : "Tambah Proyek"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Judul Proyek <span className="text-destructive">*</span>
              </Label>
              <Input
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                className="text-xs h-10"
                placeholder="Nama proyek..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Deskripsi</Label>
              <Textarea
                value={prDesc}
                onChange={(e) => setPrDesc(e.target.value)}
                className="text-xs min-h-[100px] resize-none"
                placeholder="Rincian proyek kolaborasi..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Mitra Terkait <span className="text-destructive">*</span>
                </Label>
                <Select value={prPartnerId} onValueChange={setPrPartnerId}>
                  <SelectTrigger className="text-xs h-10">
                    <SelectValue placeholder="Pilih mitra..." />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.company || p.name}
                      </SelectItem>
                    ))}
                    {partners.length === 0 && (
                      <p className="text-[10px] text-muted-foreground p-2">
                        Buat mitra terlebih dahulu.
                      </p>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <Select
                  value={prStatus}
                  onValueChange={(v) => setPrStatus(v as any)}
                >
                  <SelectTrigger className="text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-xs">
                      Aktif
                    </SelectItem>
                    <SelectItem value="on-hold" className="text-xs">
                      Ditunda
                    </SelectItem>
                    <SelectItem value="completed" className="text-xs">
                      Selesai
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Progress Pencapaian
                </Label>
                <span className="text-xs font-bold text-foreground">
                  {prProgress}%
                </span>
              </div>
              <Slider
                value={[prProgress]}
                onValueChange={(v) => setPrProgress(v[0])}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          </div>
          <div className="p-4 border-t border-border bg-muted/10 flex justify-end gap-2">
            <Button
              variant="ghost"
              className="h-9 text-xs"
              onClick={() => setProjectOpen(false)}
            >
              Batal
            </Button>
            <Button
              className="h-9 text-xs"
              onClick={handleSaveProject}
              disabled={!prTitle.trim() || !prPartnerId}
            >
              {editProjectId ? "Perbarui" : "Simpan Proyek"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contract Dialog (Add/Edit) */}
      <Dialog
        open={contractOpen}
        onOpenChange={(o) => {
          setContractOpen(o);
          if (!o) resetContractForm();
        }}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-border bg-muted/20">
            <DialogTitle className="text-base flex items-center gap-2">
              <FileSignature className="w-5 h-5 " />{" "}
              {editContractId ? "Edit Kontrak" : "Tambah Dokumen Kontrak"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Judul / Referensi Kontrak{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                value={cTitle}
                onChange={(e) => setCTitle(e.target.value)}
                className="text-xs h-10"
                placeholder="cth. SPK-2024-001..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Mitra Terkait <span className="text-destructive">*</span>
              </Label>
              <Select value={cPartnerId} onValueChange={setCPartnerId}>
                <SelectTrigger className="text-xs h-10">
                  <SelectValue placeholder="Pilih mitra..." />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.company || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Tgl Mulai Berlaku
                </Label>
                <Input
                  type="date"
                  value={cStartDate}
                  onChange={(e) => setCStartDate(e.target.value)}
                  className="text-xs h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tgl Berakhir</Label>
                <Input
                  type="date"
                  value={cEndDate}
                  onChange={(e) => setCEndDate(e.target.value)}
                  className="text-xs h-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status Dokumen</Label>
              <Select
                value={cStatus}
                onValueChange={(v) => setCStatus(v as any)}
              >
                <SelectTrigger className="text-xs h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft" className="text-xs">
                    Draft
                  </SelectItem>
                  <SelectItem value="active" className="text-xs">
                    Aktif Berjalan
                  </SelectItem>
                  <SelectItem value="expired" className="text-xs">
                    Kadaluarsa / Berakhir
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="p-4 border-t border-border bg-muted/10 flex justify-end gap-2">
            <Button
              variant="ghost"
              className="h-9 text-xs"
              onClick={() => setContractOpen(false)}
            >
              Batal
            </Button>
            <Button
              className="h-9 text-xs"
              onClick={handleSaveContract}
              disabled={!cTitle.trim() || !cPartnerId}
            >
              {editContractId ? "Perbarui" : "Simpan Kontrak"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(o) => {
          if (!o) setConfirmDeleteId(null);
        }}
        title="Hapus data ini secara permanen?"
        description="Data yang dihapus tidak dapat dikembalikan."
        variant="destructive"
        confirmText="Hapus Permanen"
        onConfirm={handleDelete}
      />
    </motion.div>
  );
};

export default Partner;
