import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMenuSettings } from "@/contexts/MenuSettingsContext";
import { useVault } from "@/contexts/VaultContext";
import { CATEGORY_COLORS } from "@/types";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  LayoutGrid,
  Link as LinkIcon,
  Link2,
  List,
  Lock,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCircle,
  Users,
  User,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmployeeGrid, { EmployeeHeader } from "@/components/EmployeeGrid";
import defaultFavicon from "@/assets/iconDefault.ico";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
const LinkFavicon = (
  { url, className = "" }: { url: string; className?: string },
) => {
  const [failed, setFailed] = useState(false);
  const domain = useMemo(() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  }, [url]);

  if (failed || !domain) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <img
            src={defaultFavicon}
            alt="Default Icon"
            className={`w-9 h-9 rounded cursor-help object-cover  ${className}`}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs break-all">
          {url}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
          alt={domain}
          className={`w-9 h-9 rounded cursor-help object-cover ${className}`}
          onError={(e) => {
            console.log("HORE! onError berhasil terpanggil!", e.type);
            console.log("Detail event:", e);
          }}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-xs break-all">
        {url}
      </TooltipContent>
    </Tooltip>
  );
};

const getPasswordStrength = (
  pw: string,
): { label: string; color: string; pct: number } => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: "Lemah", color: "bg-destructive", pct: 30 };
  if (score <= 3) return { label: "Sedang", color: "bg-warning", pct: 60 };
  return { label: "Kuat", color: "bg-success", pct: 100 };
};

const Vault = () => {
  const { employeeId, linkId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, users } = useAuth();
  const { hasAccess } = useMenuSettings();
  const canManage = isAdmin || hasAccess("vault");
  const {
    companyLinks,
    credentials,
    addCompanyLink,
    removeCompanyLink,
    updateCompanyLink,
    addCredential,
    removeCredential,
    updateCredential,
  } = useVault();

  const isAddMode = location.pathname.endsWith("/add");
  const isEditMode = !!linkId;

  // Shared states
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(
    new Set(),
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [linkSearch, setLinkSearch] = useState("");
  const [credSearch, setCredSearch] = useState("");
  const [expandedLink, setExpandedLink] = useState<string | null>(null);
  const [confirmDeleteLink, setConfirmDeleteLink] = useState<string | null>(
    null,
  );
  const [confirmDeleteCred, setConfirmDeleteCred] = useState<string | null>(
    null,
  );

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Add/Edit link form states
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkCategory, setLinkCategory] = useState("Alat Pengembang");
  const [linkUsername, setLinkUsername] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const [linkDescription, setLinkDescription] = useState("");
  const [linkAssignMode, setLinkAssignMode] = useState<
    "personal" | "team" | "all"
  >(
    "all",
  );
  const [empSearchInAssign, setEmpSearchInAssign] = useState("");

  // Edit link form states (hoisted to avoid conditional hooks)
  const [eTitle, setETitle] = useState("");
  const [eUrl, setEUrl] = useState("");
  const [eCat, setECat] = useState("");
  const [eUser, setEUser] = useState("");
  const [ePass, setEPass] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eAssignMode, setEAssignMode] = useState<"personal" | "team" | "all">(
    "all",
  );
  const [editInitialized, setEditInitialized] = useState<string | null>(null);

  // Credential states (employee only)
  const [credSystem, setCredSystem] = useState("");
  const [credUrl, setCredUrl] = useState("");
  const [credUser, setCredUser] = useState("");
  const [credPass, setCredPass] = useState("");
  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [editCredId, setEditCredId] = useState<string | null>(null);
  const [editSystem, setEditSystem] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editUser, setEditUser] = useState("");
  const [editPass, setEditPass] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [vaultTab, setVaultTab] = useState<"pribadi" | "tim">("pribadi");
  const [vaultViewMode, setVaultViewMode] = useState<"grid" | "table">("table");

  const togglePassword = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Berhasil disalin");
    setTimeout(() => setCopiedId(null), 1500);
  };
  const decryptPassword = (pw: string) => {
    try {
      return atob(pw);
    } catch {
      return pw;
    }
  };

  // Employee computed values (must be before early returns)
  const myCredentials = credentials.filter((c) => c.userId === user?.id);
  const visibleLinks = useMemo(() => {
    const links = companyLinks.filter((l) => {
      if (!l.assignedTo || l.assignedTo === "all") return true;
      const ids = l.assignedTo.split(",");
      return ids.includes(user?.id || "");
    });
    if (!linkSearch) return links;
    const q = linkSearch.toLowerCase();
    return links.filter((l) =>
      l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q)
    );
  }, [companyLinks, linkSearch, user?.id]);

  const filteredCreds = useMemo(() => {
    if (!credSearch) return myCredentials;
    const q = credSearch.toLowerCase();
    return myCredentials.filter((c) =>
      c.systemName.toLowerCase().includes(q) ||
      c.username.toLowerCase().includes(q)
    );
  }, [myCredentials, credSearch]);

  if (canManage && !employeeId) {
    const allEmployees = users.filter((u) => u.role === "employee");
    const filtered = linkSearch
      ? companyLinks.filter((l) =>
        l.title.toLowerCase().includes(linkSearch.toLowerCase()) ||
        l.url.toLowerCase().includes(linkSearch.toLowerCase())
      )
      : companyLinks;

    const getAssignLabel = (assignedTo?: string) => {
      if (!assignedTo || assignedTo === "all") return "Semua Karyawan";
      const ids = assignedTo.split(",");
      const names = ids.map((id) => users.find((u) => u.id === id)?.name || id);
      return names.length > 2
        ? `${names.slice(0, 2).join(", ")} +${names.length - 2}`
        : names.join(", ");
    };

    const handleAddSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!linkTitle || !linkUrl) return;
      addCompanyLink({
        title: linkTitle,
        url: linkUrl,
        icon: "Link",
        category: linkCategory,
        username: linkUsername,
        password: linkPassword,
        description: linkDescription,
        assignedTo: linkAssignMode === "all"
          ? "all"
          : linkAssignMode === "personal"
          ? (user?.id || "")
          : selectedEmployees.join(","),
      });
      toast.success("Tautan ditambahkan");
      setShowAddDialog(false);
      setLinkTitle("");
      setLinkUrl("");
      setLinkCategory("Alat Pengembang");
      setLinkUsername("");
      setLinkPassword("");
      setLinkDescription("");
      setSelectedEmployees([]);
      setLinkAssignMode("all");
    };

    const handleEditSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingLinkId || !eTitle || !eUrl) return;
      updateCompanyLink(editingLinkId, {
        title: eTitle,
        url: eUrl,
        category: eCat,
        username: eUser,
        password: ePass,
        description: eDesc,
        assignedTo: eAssignMode === "all"
          ? "all"
          : eAssignMode === "personal"
          ? (user?.id || "")
          : selectedEmployees.join(","),
      });
      toast.success("Tautan diperbarui");
      setShowEditDialog(false);
      setEditingLinkId(null);
    };

    const openEdit = (link: typeof companyLinks[number]) => {
      setEditingLinkId(link.id);
      setETitle(link.title || "");
      setEUrl(link.url || "");
      setECat(link.category || "");
      setEUser(link.username || "");
      setEPass(link.password || "");
      setEDesc(link.description || "");
      if (link.assignedTo === "all" || !link.assignedTo) {
        setEAssignMode("all");
        setSelectedEmployees([]);
      } else if (link.assignedTo === user?.id) {
        setEAssignMode("personal");
        setSelectedEmployees([]);
      } else {
        setEAssignMode("team");
        setSelectedEmployees(link.assignedTo.split(","));
      }
      setShowEditDialog(true);
    };

    const renderAssignField = (
      mode: "personal" | "team" | "all",
      setMode: (m: "personal" | "team" | "all") => void,
    ) => (
      <div className="space-y-1">
        <Label className="text-xs">Tujuan</Label>
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="text-xs w-[180px]">
            <SelectValue placeholder="Pilih mode..." />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="personal" className="text-xs">
              Pribadi
            </SelectItem>

            <SelectItem value="team" className="text-xs">
              Pilih Karyawan
            </SelectItem>

            <SelectItem value="all" className="text-xs">
              Semua Karyawan
            </SelectItem>
          </SelectContent>
        </Select>
        {mode === "team" && (
          <div className="border border-border rounded-md p-2 max-h-40 overflow-y-auto space-y-1 mt-2">
            <Input
              placeholder="Cari karyawan..."
              value={empSearchInAssign}
              onChange={(e) => setEmpSearchInAssign(e.target.value)}
              className="h-7 text-xs mb-1"
            />
            {allEmployees.filter((emp) =>
              !empSearchInAssign ||
              emp.name.toLowerCase().includes(empSearchInAssign.toLowerCase())
            ).map((emp) => (
              <label
                key={emp.id}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedEmployees.includes(emp.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEmployees((prev) => [...prev, emp.id]);
                    } else {setSelectedEmployees((prev) =>
                        prev.filter((id) => id !== emp.id)
                      );}
                  }}
                  className="accent-primary"
                />
                {emp.name}
              </label>
            ))}
          </div>
        )}
      </div>
    );

    const teamLinks = filtered.filter((l) =>
      l.assignedTo && l.assignedTo !== "all" && l.assignedTo !== user?.id
    );
    const personalLinks = filtered.filter((l) =>
      !l.assignedTo || l.assignedTo === "all" || l.assignedTo === user?.id
    );

    const renderLinkCard = (link: typeof companyLinks[number], i: number) => {
      const catColor = CATEGORY_COLORS[link.category] ||
        "bg-muted text-muted-foreground";
      const isExpanded = expandedLink === link.id;
      const hasCredentials = link.username || link.password;
      return (
        <motion.div
          key={link.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="ms-card-hover group"
        >
          <div className="p-3 flex items-center justify-between">
            <div
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
              onClick={() => setExpandedLink(isExpanded ? null : link.id)}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                <LinkFavicon url={link.url} className="w-8 h-8" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-medium text-foreground truncate">
                    {link.title}
                  </p>
                  <Badge
                    variant="secondary"
                    className={`text-[9px] px-1 py-0 ${catColor}`}
                  >
                    {link.category}
                  </Badge>
                  {hasCredentials && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 gap-0.5"
                    >
                      <Lock className="w-2.5 h-2.5" />
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 gap-0.5"
                  >
                    <Users className="w-2.5 h-2.5" />{" "}
                    {getAssignLabel(link.assignedTo)}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {link.url}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-6 h-6"
                    onClick={() => copyToClipboard(link.url, `link-${link.id}`)}
                  >
                    {copiedId === `link-${link.id}`
                      ? <Check className="w-3 h-3 text-success" />
                      : <Copy className="w-3 h-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Salin URL</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-6 h-6"
                    onClick={() => window.open(link.url, "_blank")}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Buka</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-6 h-6 opacity-0 group-hover:opacity-100"
                    onClick={() => openEdit(link)}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-6 h-6 text-destructive opacity-0 group-hover:opacity-100"
                    onClick={() => setConfirmDeleteLink(link.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Hapus</TooltipContent>
              </Tooltip>
            </div>
          </div>
          {isExpanded && hasCredentials && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="border-t border-border px-4 py-3 bg-muted/20 space-y-2"
            >
              {link.description && (
                <p className="text-xs text-muted-foreground">
                  {link.description}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {link.username && (
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <UserCircle className="w-3 h-3" /> Username
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-foreground text-xs font-mono">
                        {link.username}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-5 h-5"
                        onClick={() =>
                          copyToClipboard(
                            link.username!,
                            `linkuser-${link.id}`,
                          )}
                      >
                        {copiedId === `linkuser-${link.id}`
                          ? <Check className="w-3 h-3 text-success" />
                          : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                )}
                {link.password && (
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Password
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-foreground text-xs font-mono">
                        {visiblePasswords.has(`linkpw-${link.id}`)
                          ? link.password
                          : "••••••••"}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-5 h-5"
                        onClick={() => togglePassword(`linkpw-${link.id}`)}
                      >
                        {visiblePasswords.has(`linkpw-${link.id}`)
                          ? <EyeOff className="w-3 h-3" />
                          : <Eye className="w-3 h-3" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-5 h-5"
                        onClick={() =>
                          copyToClipboard(link.password!, `linkpw-${link.id}`)}
                      >
                        {copiedId === `linkpw-${link.id}`
                          ? <Check className="w-3 h-3 text-success" />
                          : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      );
    };

    const renderLinkTable = (links: typeof companyLinks) => (
      <div className="ms-card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-2 font-medium text-muted-foreground">
                Judul
              </th>
              <th className="text-left p-2 font-medium text-muted-foreground">
                URL
              </th>
              <th className="text-left p-2 font-medium text-muted-foreground">
                Kategori
              </th>
              <th className="text-left p-2 font-medium text-muted-foreground">
                Tujuan
              </th>
              <th className="text-right p-2 font-medium text-muted-foreground">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr
                key={link.id}
                className="border-b border-border last:border-0 hover:bg-muted/30 group"
              >
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <LinkFavicon url={link.url} className="w-5 h-5" />
                    <span className="font-medium text-foreground">
                      {link.title}
                    </span>
                    {(link.username || link.password) && (
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                </td>
                <td className="p-2 text-muted-foreground max-w-[200px] truncate">
                  {link.url}
                </td>
                <td className="p-2">
                  <Badge
                    variant="secondary"
                    className={`text-[9px] px-1 py-0 ${
                      CATEGORY_COLORS[link.category] || ""
                    }`}
                  >
                    {link.category}
                  </Badge>
                </td>
                <td className="p-2 text-muted-foreground">
                  {getAssignLabel(link.assignedTo)}
                </td>
                <td className="p-2">
                  <div className="flex items-center justify-end gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-6 h-6"
                          onClick={() =>
                            copyToClipboard(link.url, `link-${link.id}`)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Salin</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-6 h-6"
                          onClick={() => window.open(link.url, "_blank")}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Buka</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-6 h-6"
                          onClick={() => openEdit(link)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-6 h-6 text-destructive"
                          onClick={() => setConfirmDeleteLink(link.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Hapus</TooltipContent>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    const renderLinks = (links: typeof companyLinks) => {
      if (links.length === 0) {
        return (
          <EmptyState
            icon={LinkIcon}
            title="Belum ada tautan"
            description="Tambahkan tautan untuk karyawan."
            compact
          />
        );
      }
      return vaultViewMode === "table"
        ? renderLinkTable(links)
        : (
          <div className="grid grid-cols-1 gap-2">
            {links.map((l, i) => renderLinkCard(l, i))}
          </div>
        );
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Link2 className="w-4 h-4" /> Tautan
          </h1>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center border border-border rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`p-1.5 rounded-l-md ${
                      vaultViewMode === "grid" ? "bg-muted" : ""
                    }`}
                    onClick={() => setVaultViewMode("grid")}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Grid</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={`p-1.5 rounded-r-md ${
                      vaultViewMode === "table" ? "bg-muted" : ""
                    }`}
                    onClick={() => setVaultViewMode("table")}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Tabel</TooltipContent>
              </Tooltip>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="w-7 h-7"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tambah Tautan</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Tabs
          value={vaultTab}
          onValueChange={(v) => setVaultTab(v as "pribadi" | "tim")}
          className="w-full"
        >
          <div className="flex items-center gap-3">
            <TabsList className="grid w-full max-w-[200px] grid-cols-2">
              <TabsTrigger value="pribadi" className="px-3 h-7 gap-1.5">
                <User className="w-3.5 h-3.5" /><span className="text-xs">Pribadi</span>
              </TabsTrigger>
              <TabsTrigger value="tim" className="px-3 h-7 gap-1.5">
                <Users className="w-3.5 h-3.5" /><span className="text-xs">Team</span>
              </TabsTrigger>
            </TabsList>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari tautan..."
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                className="pl-9 h-8 text-xs"
              />
            </div>
          </div>
          <TabsContent value="pribadi" className="mt-3">
            {renderLinks(personalLinks)}
          </TabsContent>
          <TabsContent value="tim" className="mt-3">
            {renderLinks(teamLinks)}
          </TabsContent>
        </Tabs>

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm">Tambah Tautan Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Judul</Label>
                  <Input
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    placeholder="cth. Portal SDM"
                    required
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">URL</Label>
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    type="url"
                    placeholder="https://..."
                    required
                    className="text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Kategori</Label>
                  <Input
                    value={linkCategory}
                    onChange={(e) => setLinkCategory(e.target.value)}
                    placeholder="cth. SDM, Operasional"
                    className="text-xs"
                  />
                </div>
                {renderAssignField(linkAssignMode, setLinkAssignMode)}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Keterangan</Label>
                <Textarea
                  value={linkDescription}
                  onChange={(e) => setLinkDescription(e.target.value)}
                  placeholder="Catatan..."
                  rows={2}
                  className="text-xs"
                />
              </div>
              <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/30">
                <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-primary" /> Kredensial Akses
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Username / Email</Label>
                    <Input
                      value={linkUsername}
                      onChange={(e) => setLinkUsername(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Password</Label>
                    <Input
                      value={linkPassword}
                      onChange={(e) => setLinkPassword(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full text-xs">
                Tambah Tautan
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog
          open={showEditDialog}
          onOpenChange={(o) => {
            if (!o) {
              setShowEditDialog(false);
              setEditingLinkId(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm">Edit Tautan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Judul</Label>
                  <Input
                    value={eTitle}
                    onChange={(e) => setETitle(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">URL</Label>
                  <Input
                    value={eUrl}
                    onChange={(e) => setEUrl(e.target.value)}
                    type="url"
                    required
                    className="text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Kategori</Label>
                  <Input
                    value={eCat}
                    onChange={(e) => setECat(e.target.value)}
                    className="text-xs"
                  />
                </div>
                {renderAssignField(eAssignMode, setEAssignMode)}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Keterangan</Label>
                <Textarea
                  value={eDesc}
                  onChange={(e) => setEDesc(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
              <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/30">
                <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-primary" /> Kredensial
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Username</Label>
                    <Input
                      value={eUser}
                      onChange={(e) => setEUser(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Password</Label>
                    <Input
                      value={ePass}
                      onChange={(e) => setEPass(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full text-xs">
                Simpan Perubahan
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={!!confirmDeleteLink}
          onOpenChange={(o) => {
            if (!o) setConfirmDeleteLink(null);
          }}
          title="Hapus tautan ini?"
          description="Tautan akan dihapus permanen."
          variant="destructive"
          confirmText="Hapus"
          onConfirm={() => {
            if (confirmDeleteLink) {
              removeCompanyLink(confirmDeleteLink);
              setConfirmDeleteLink(null);
              toast.success("Tautan dihapus");
            }
          }}
        />
      </motion.div>
    );
  }

  // ===== ADMIN: Add Link Form (full page) =====
  if (canManage && employeeId && isAddMode) {
    const handleAdd = (e: React.FormEvent) => {
      e.preventDefault();
      if (!linkTitle || !linkUrl) return;
      addCompanyLink({
        id: `cl-${Date.now()}`,
        title: linkTitle,
        url: linkUrl,
        icon: "Link",
        category: linkCategory,
        username: linkUsername,
        password: linkPassword,
        description: linkDescription,
        assignedTo: linkAssignMode === "all" ? "all" : employeeId,
      });
      toast.success("Tautan ditambahkan");
      navigate(`/vault/${employeeId}`);
    };

    return (
      <div className="space-y-4 max-w-8xl">
        <EmployeeHeader
          employeeId={employeeId}
          backPath={`/vault/${employeeId}`}
        />
        <h2 className="text-sm font-semibold text-foreground">
          Tambah Tautan Baru
        </h2>
        <form onSubmit={handleAdd} className="ms-card p-5 space-y-3">
          <div className="space-y-1">
            <Label className="text-sm">Judul</Label>
            <Input
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="cth. Portal SDM"
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">URL</Label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              type="url"
              placeholder="https://..."
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Kategori</Label>
            <Input
              value={linkCategory}
              onChange={(e) => setLinkCategory(e.target.value)}
              placeholder="cth. SDM, Operasional"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Tujuan</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="assignMode"
                  checked={linkAssignMode === "personal"}
                  onChange={() => setLinkAssignMode("personal")}
                  className="accent-primary"
                />
                Karyawan Ini
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="assignMode"
                  checked={linkAssignMode === "all"}
                  onChange={() => setLinkAssignMode("all")}
                  className="accent-primary"
                />
                <Users className="w-3 h-3" /> Semua Karyawan
              </label>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Keterangan</Label>
            <Textarea
              value={linkDescription}
              onChange={(e) => setLinkDescription(e.target.value)}
              placeholder="Catatan untuk karyawan..."
              rows={2}
            />
          </div>
          <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/30">
            <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-primary" /> Kredensial Akses
            </p>
            <div className="space-y-1">
              <Label className="text-xs">Username / Email</Label>
              <Input
                value={linkUsername}
                onChange={(e) => setLinkUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Password</Label>
              <Input
                value={linkPassword}
                onChange={(e) => setLinkPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate(`/vault/${employeeId}`)}
            >
              Batal
            </Button>
            <Button type="submit" className="flex-1">Tambah Tautan</Button>
          </div>
        </form>
      </div>
    );
  }

  // ===== ADMIN: Edit Link Form (full page) =====
  if (canManage && employeeId && isEditMode) {
    const link = companyLinks.find((l) => l.id === linkId);
    // Initialize edit fields from link data (only once per link)
    if (link && editInitialized !== linkId) {
      setETitle(link.title || "");
      setEUrl(link.url || "");
      setECat(link.category || "");
      setEUser(link.username || "");
      setEPass(link.password || "");
      setEDesc(link.description || "");
      setEAssignMode(link.assignedTo === "all" ? "all" : "personal");
      setEditInitialized(linkId!);
    }

    const handleEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!linkId || !eTitle || !eUrl) return;
      updateCompanyLink(linkId, {
        title: eTitle,
        url: eUrl,
        category: eCat,
        username: eUser,
        password: ePass,
        description: eDesc,
        assignedTo: eAssignMode === "all" ? "all" : employeeId,
      });
      toast.success("Tautan diperbarui");
      navigate(`/vault/${employeeId}`);
    };

    return (
      <div className="space-y-4 max-w-8xl">
        <EmployeeHeader
          employeeId={employeeId}
          backPath={`/vault/${employeeId}`}
        />
        <h2 className="text-sm font-semibold text-foreground">Edit Tautan</h2>
        <form onSubmit={handleEdit} className="ms-card p-5 space-y-3">
          <div className="space-y-1">
            <Label className="text-sm">Judul</Label>
            <Input
              value={eTitle}
              onChange={(e) => setETitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">URL</Label>
            <Input
              value={eUrl}
              onChange={(e) => setEUrl(e.target.value)}
              type="url"
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Kategori</Label>
            <Input value={eCat} onChange={(e) => setECat(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Tujuan</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="editAssignMode"
                  checked={eAssignMode === "personal"}
                  onChange={() => setEAssignMode("personal")}
                  className="accent-primary"
                />
                Karyawan Ini
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="editAssignMode"
                  checked={eAssignMode === "all"}
                  onChange={() => setEAssignMode("all")}
                  className="accent-primary"
                />
                <Users className="w-3 h-3" /> Semua Karyawan
              </label>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Keterangan</Label>
            <Textarea
              value={eDesc}
              onChange={(e) => setEDesc(e.target.value)}
              rows={2}
            />
          </div>
          <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/30">
            <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-primary" /> Kredensial
            </p>
            <div className="space-y-1">
              <Label className="text-xs">Username</Label>
              <Input value={eUser} onChange={(e) => setEUser(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Password</Label>
              <Input value={ePass} onChange={(e) => setEPass(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate(`/vault/${employeeId}`)}
            >
              Batal
            </Button>
            <Button type="submit" className="flex-1">Simpan Perubahan</Button>
          </div>
        </form>
      </div>
    );
  }

  // ===== ADMIN: Employee Link List =====
  if (canManage && employeeId) {
    const empLinks = companyLinks.filter((l) =>
      l.assignedTo === employeeId || l.assignedTo === "all"
    );
    const filtered = linkSearch
      ? empLinks.filter((l) =>
        l.title.toLowerCase().includes(linkSearch.toLowerCase()) ||
        l.url.toLowerCase().includes(linkSearch.toLowerCase())
      )
      : empLinks;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-3"
      >
        <EmployeeHeader employeeId={employeeId} backPath="/vault" />
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari tautan..."
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs"
            onClick={() => navigate(`/vault/${employeeId}/add`)}
          >
            <Plus className="w-3 h-3" /> Tambah Tautan
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {filtered.map((link, i) => {
            const catColor = CATEGORY_COLORS[link.category] ||
              "bg-muted text-muted-foreground";
            const isExpanded = expandedLink === link.id;
            const hasCredentials = link.username || link.password;
            return (
              <motion.div
                key={link.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="ms-card-hover group"
              >
                <div className="p-4 flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    onClick={() => setExpandedLink(isExpanded ? null : link.id)}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
                      <LinkFavicon url={link.url} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground truncate">
                          {link.title}
                        </p>
                        <Badge
                          variant="secondary"
                          className={`text-[9px] px-1.5 py-0 ${catColor}`}
                        >
                          {link.category}
                        </Badge>
                        {hasCredentials && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 gap-0.5"
                          >
                            <Lock className="w-2.5 h-2.5" /> Ada Akses
                          </Badge>
                        )}
                        {link.assignedTo === "all" && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 gap-0.5"
                          >
                            <Users className="w-2.5 h-2.5" /> Semua
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {link.url}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7"
                      onClick={() =>
                        copyToClipboard(link.url, `link-${link.id}`)}
                    >
                      {copiedId === `link-${link.id}`
                        ? <Check className="w-3.5 h-3.5 text-success" />
                        : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7"
                      onClick={() => window.open(link.url, "_blank")}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 opacity-0 group-hover:opacity-100"
                      onClick={() =>
                        navigate(`/vault/${employeeId}/edit/${link.id}`)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 text-destructive opacity-0 group-hover:opacity-100"
                      onClick={() => setConfirmDeleteLink(link.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {isExpanded && hasCredentials && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="border-t border-border px-4 py-3 bg-muted/20 space-y-2"
                  >
                    {link.description && (
                      <p className="text-xs text-muted-foreground">
                        {link.description}
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {link.username && (
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <UserCircle className="w-3 h-3" /> Username
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className="text-foreground text-xs font-mono">
                              {link.username}
                            </p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-6 h-6"
                              onClick={() =>
                                copyToClipboard(
                                  link.username!,
                                  `linkuser-${link.id}`,
                                )}
                            >
                              {copiedId === `linkuser-${link.id}`
                                ? <Check className="w-3 h-3 text-success" />
                                : <Copy className="w-3 h-3" />}
                            </Button>
                          </div>
                        </div>
                      )}
                      {link.password && (
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Password
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className="text-foreground text-xs font-mono">
                              {visiblePasswords.has(`linkpw-${link.id}`)
                                ? link.password
                                : "••••••••"}
                            </p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-6 h-6"
                              onClick={() =>
                                togglePassword(`linkpw-${link.id}`)}
                            >
                              {visiblePasswords.has(`linkpw-${link.id}`)
                                ? <EyeOff className="w-3 h-3" />
                                : <Eye className="w-3 h-3" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-6 h-6"
                              onClick={() =>
                                copyToClipboard(
                                  link.password!,
                                  `linkpw-${link.id}`,
                                )}
                            >
                              {copiedId === `linkpw-${link.id}`
                                ? <Check className="w-3 h-3 text-success" />
                                : <Copy className="w-3 h-3" />}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        <ConfirmDialog
          open={!!confirmDeleteLink}
          onOpenChange={(o) => {
            if (!o) setConfirmDeleteLink(null);
          }}
          title="Hapus tautan ini?"
          description="Tautan akan dihapus permanen."
          variant="destructive"
          confirmText="Hapus"
          onConfirm={() => {
            if (confirmDeleteLink) {
              removeCompanyLink(confirmDeleteLink);
              setConfirmDeleteLink(null);
              toast.success("Tautan dihapus");
            }
          }}
        />
      </motion.div>
    );
  }

  // ===== EMPLOYEE VIEW =====

  const handleAddCred = (e: React.FormEvent) => {
    e.preventDefault();
    if (!credSystem || !credUrl || !credUser || !credPass || !user) return;
    addCredential({
      id: `cred-${Date.now()}`,
      userId: user.id,
      systemName: credSystem,
      url: credUrl,
      username: credUser,
      password: btoa(credPass),
    });
    setCredSystem("");
    setCredUrl("");
    setCredUser("");
    setCredPass("");
    setCredDialogOpen(false);
    toast.success("Kredensial tersimpan (terenkripsi)");
  };

  const openEditCred = (cred: typeof credentials[0]) => {
    setEditCredId(cred.id);
    setEditSystem(cred.systemName);
    setEditUrl(cred.url);
    setEditUser(cred.username);
    setEditPass(cred.password);
    setEditDialogOpen(true);
  };

  const handleEditCred = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCredId || !editSystem || !editUrl || !editUser || !editPass) {
      return;
    }
    updateCredential(editCredId, {
      systemName: editSystem,
      url: editUrl,
      username: editUser,
      password: editPass,
    });
    setEditDialogOpen(false);
    toast.success("Kredensial diperbarui");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        <Link2 className="w-4 h-4 text-primary" /> Tautan
      </h1>

      <Tabs defaultValue="links" className="w-full">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="links" className="gap-1.5">
            <LinkIcon className="w-3.5 h-3.5" /> Tautan Perusahaan
          </TabsTrigger>
          <TabsTrigger value="creds" className="gap-1.5">
            <KeyRound className="w-3.5 h-3.5" /> Kredensial Saya
          </TabsTrigger>
        </TabsList>

        <TabsContent value="links" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari tautan..."
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {visibleLinks.map((link, i) => {
              const catColor = CATEGORY_COLORS[link.category] ||
                "bg-muted text-muted-foreground";
              const isExpanded = expandedLink === link.id;
              const hasCredentials = link.username || link.password;
              return (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="ms-card-hover group"
                >
                  <div className="p-4 flex items-center justify-between">
                    <div
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      onClick={() =>
                        setExpandedLink(isExpanded ? null : link.id)}
                    >
                      <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                        <LinkFavicon url={link.url} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground truncate">
                            {link.title}
                          </p>
                          <Badge
                            variant="secondary"
                            className={`text-[9px] px-1.5 py-0 ${catColor}`}
                          >
                            {link.category}
                          </Badge>
                          {hasCredentials && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 gap-0.5"
                            >
                              <Lock className="w-2.5 h-2.5" /> Ada Akses
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {link.url}
                        </p>
                        {link.description && (
                          <p className="text-xs text-muted-foreground/80 mt-0.5 line-clamp-1">
                            {link.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7"
                        onClick={() =>
                          copyToClipboard(link.url, `link-${link.id}`)}
                      >
                        {copiedId === `link-${link.id}`
                          ? <Check className="w-3.5 h-3.5 text-success" />
                          : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7"
                        onClick={() => window.open(link.url, "_blank")}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {isExpanded && hasCredentials && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="border-t border-border px-4 py-3 bg-muted/20 space-y-2"
                    >
                      {link.description && (
                        <p className="text-xs text-muted-foreground">
                          {link.description}
                        </p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {link.username && (
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                              <UserCircle className="w-3 h-3" /> Username
                            </span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <p className="text-foreground text-xs font-mono">
                                {link.username}
                              </p>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="w-6 h-6"
                                onClick={() =>
                                  copyToClipboard(
                                    link.username!,
                                    `linkuser-${link.id}`,
                                  )}
                              >
                                {copiedId === `linkuser-${link.id}`
                                  ? <Check className="w-3 h-3 text-success" />
                                  : <Copy className="w-3 h-3" />}
                              </Button>
                            </div>
                          </div>
                        )}
                        {link.password && (
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Password
                            </span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <p className="text-foreground text-xs font-mono">
                                {visiblePasswords.has(`linkpw-${link.id}`)
                                  ? link.password
                                  : "••••••••"}
                              </p>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="w-6 h-6"
                                onClick={() =>
                                  togglePassword(`linkpw-${link.id}`)}
                              >
                                {visiblePasswords.has(`linkpw-${link.id}`)
                                  ? <EyeOff className="w-3 h-3" />
                                  : <Eye className="w-3 h-3" />}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="w-6 h-6"
                                onClick={() =>
                                  copyToClipboard(
                                    link.password!,
                                    `linkpw-${link.id}`,
                                  )}
                              >
                                {copiedId === `linkpw-${link.id}`
                                  ? <Check className="w-3 h-3 text-success" />
                                  : <Copy className="w-3 h-3" />}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="creds" className="space-y-4 mt-4">
          <div className="p-3 rounded-lg bg-warning/5 border border-warning/20 text-xs text-warning flex items-center gap-2 max-w-[500px]">
            <Lock className="w-4 h-4 shrink-0" />
            <span>
              Ruang ini bersifat pribadi dan terenkripsi. Admin tidak dapat
              melihat data ini.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari kredensial..."
                value={credSearch}
                onChange={(e) => setCredSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Dialog open={credDialogOpen} onOpenChange={setCredDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1 text-xs">
                  <Plus className="w-3 h-3" /> Tambah
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Simpan Kredensial Baru</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddCred} className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Nama Sistem</Label>
                    <Input
                      value={credSystem}
                      onChange={(e) => setCredSystem(e.target.value)}
                      placeholder="cth. Instagram"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">URL</Label>
                    <Input
                      value={credUrl}
                      onChange={(e) => setCredUrl(e.target.value)}
                      type="url"
                      placeholder="https://..."
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Username</Label>
                    <Input
                      value={credUser}
                      onChange={(e) => setCredUser(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Password</Label>
                    <Input
                      value={credPass}
                      onChange={(e) => setCredPass(e.target.value)}
                      required
                    />
                    {credPass && (() => {
                      const s = getPasswordStrength(credPass);
                      return (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${s.color} rounded-full transition-all`}
                              style={{ width: `${s.pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {s.label}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  <Button type="submit" className="w-full">
                    Simpan (Terenkripsi)
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Kredensial</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditCred} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm">Nama Sistem</Label>
                  <Input
                    value={editSystem}
                    onChange={(e) => setEditSystem(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">URL</Label>
                  <Input
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    type="url"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Username</Label>
                  <Input
                    value={editUser}
                    onChange={(e) => setEditUser(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Password</Label>
                  <Input
                    value={editPass}
                    onChange={(e) => setEditPass(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Simpan</Button>
              </form>
            </DialogContent>
          </Dialog>

          <div className="grid grid-cols-1 gap-3">
            {filteredCreds.length === 0
              ? (
                <EmptyState
                  icon={KeyRound}
                  title="Belum ada kredensial tersimpan"
                  description="Simpan username dan password Anda di sini dengan aman."
                  compact
                />
              )
              : filteredCreds.map((cred, i) => {
                const pw = decryptPassword(cred.password);
                const strength = getPasswordStrength(pw);
                return (
                  <motion.div
                    key={cred.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="ms-card p-4 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                          <KeyRound className="w-4 h-4 text-accent-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {cred.systemName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {cred.url}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] text-muted-foreground">
                              {cred.username}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {visiblePasswords.has(cred.id) ? pw : "••••••••"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${strength.color} rounded-full`}
                                style={{ width: `${strength.pct}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-muted-foreground">
                              {strength.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7"
                          onClick={() => togglePassword(cred.id)}
                        >
                          {visiblePasswords.has(cred.id)
                            ? <EyeOff className="w-3.5 h-3.5" />
                            : <Eye className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7"
                          onClick={() => copyToClipboard(pw, `cred-${cred.id}`)}
                        >
                          {copiedId === `cred-${cred.id}`
                            ? <Check className="w-3.5 h-3.5 text-success" />
                            : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 opacity-0 group-hover:opacity-100"
                          onClick={() => openEditCred(cred)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 text-destructive opacity-0 group-hover:opacity-100"
                          onClick={() => setConfirmDeleteCred(cred.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!confirmDeleteCred}
        onOpenChange={(o) => {
          if (!o) setConfirmDeleteCred(null);
        }}
        title="Hapus kredensial ini?"
        description="Data kredensial akan dihapus permanen."
        variant="destructive"
        confirmText="Hapus"
        onConfirm={() => {
          if (confirmDeleteCred) {
            removeCredential(confirmDeleteCred);
            setConfirmDeleteCred(null);
            toast.success("Kredensial dihapus");
          }
        }}
      />
    </motion.div>
  );
};

export default Vault;
