import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMenuSettings } from "@/contexts/MenuSettingsContext";
import api from "@/lib/api";
import type { User, UserDocument, Role, TeamGroup } from "@/types";
import { calculateProfileCompletion, getCompletionColor, getCompletionBgColor, formatDocumentType, getMissingFields } from "@/lib/profileUtils";
import { motion } from "framer-motion";
import {
  UserPlus, Users, Mail, Briefcase, Building, Shield, Trash2, Edit2, Search, Eye, EyeOff, Calendar, KeyRound, RefreshCw, AlertCircle, Download, FileText, ClipboardList, Upload, Save, Camera, Phone, MapPin, Heart, CreditCard, Check, X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import ConfirmDialog from "@/components/ConfirmDialog";
import StatsCard from "@/components/StatsCard";
import { TableSkeleton, StatsSkeleton } from "@/components/PageSkeleton";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { toast } from "sonner";
import { z } from "zod";
import Cropper from "react-easy-crop";
import getCroppedImg, { type CroppedArea } from "@/lib/cropImage";

const RELIGIONS = ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu", "Lainnya"];
const BANKS = ["BCA", "BNI", "BRI", "Mandiri", "CIMB Niaga", "BTN", "BSI", "Lainnya"];

const accountSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  email: z.string().trim().email("Email tidak valid").max(255),
  password: z.string().min(6, "Password minimal 6 karakter").max(50),
  position: z.string().trim().min(2, "Jabatan minimal 2 karakter").max(100),
  department: z.string().trim().min(2, "Department minimal 2 karakter").max(100),
  role: z.enum(["admin", "employee"]),
});

const passwordSchema = z.string().min(6, "Password minimal 6 karakter").max(50);

type ProfileFilter = "all" | "complete" | "incomplete";

const Accounts = () => {
  const navigate = useNavigate();
  const { users, refreshUsers, isAdmin } = useAuth();
  const { hasAccess } = useMenuSettings();
  const canManageAccounts = isAdmin || hasAccess("accounts");
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [teams, setTeams] = useState<TeamGroup[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [positions, setPositions] = useState<{ id: string; position: string; description: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [detailSheetUser, setDetailSheetUser] = useState<User | null>(null);

  // Profile editor sheet
  const [editorUser, setEditorUser] = useState<User | null>(null);
  const [editorData, setEditorData] = useState<Partial<User>>({});
  const [editorSaving, setEditorSaving] = useState(false);

  // Admin avatar crop for editor
  const [editorCropOpen, setEditorCropOpen] = useState(false);
  const [editorCropImage, setEditorCropImage] = useState<string | null>(null);
  const [editorCrop, setEditorCrop] = useState({ x: 0, y: 0 });
  const [editorZoom, setEditorZoom] = useState(1);
  const [editorCroppedArea, setEditorCroppedArea] = useState<CroppedArea | null>(null);

  // Reset password dialog
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetPasswordErrors, setResetPasswordErrors] = useState<string>("");

  // Form fields
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formPosition, setFormPosition] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formRole, setFormRole] = useState<Role>("employee");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch supplementary data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [docs, teamsData, tasksData, posData] = await Promise.all([
        api.getAllDocuments(),
        api.getTeams(),
        api.getTasks(),
        api.getPositions().catch(() => []),
      ]);
      setDocuments(docs);
      setTeams(teamsData);
      setTasks(tasksData);
      setPositions(posData);
    } catch (err) {
      console.error("Failed to load accounts data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getUserCompletion = (user: User): number => {
    return calculateProfileCompletion(user, documents);
  };

  // If employee with access, filter out admin accounts
  const visibleUsers = isAdmin ? users : users.filter((u) => u.role !== "admin");

  const filteredUsers = visibleUsers.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (profileFilter === "all") return true;
    const completion = getUserCompletion(u);
    if (profileFilter === "complete") return completion >= 80;
    if (profileFilter === "incomplete") return completion < 80;
    return true;
  });

  const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

  const resetForm = () => {
    setFormName(""); setFormEmail(""); setFormPassword(""); setFormPosition("");
    setFormDepartment(""); setFormRole("employee"); setEditUserId(null);
    setFormErrors({}); setShowPassword(false);
  };

  const resetPasswordForm = () => {
    setNewPassword(""); setConfirmPassword(""); setShowNewPassword(false);
    setResetPasswordErrors(""); setResetPasswordUserId(null);
  };

  const openEditUser = (user: User) => {
    setEditUserId(user.id); setFormName(user.name); setFormEmail(user.email);
    setFormPassword(""); setFormPosition(user.position); setFormDepartment(user.department);
    setFormRole(user.role); setDialogOpen(true);
  };

  const openResetPassword = (user: User) => {
    setResetPasswordUserId(user.id); setResetPasswordDialogOpen(true);
  };

  const handleSubmit = async () => {
    setFormErrors({});
    const data = { name: formName, email: formEmail, password: formPassword, position: formPosition, department: formDepartment, role: formRole };
    const schema = editUserId ? accountSchema.extend({ password: z.string().max(50).optional().or(z.literal("")) }) : accountSchema;
    const result = schema.safeParse(data);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((e) => { if (e.path[0]) errors[e.path[0] as string] = e.message; });
      setFormErrors(errors);
      return;
    }
    const emailExists = users.some((u) => u.email.toLowerCase() === formEmail.toLowerCase() && u.id !== editUserId);
    if (emailExists) { setFormErrors({ email: "Email sudah terdaftar" }); return; }

    try {
      if (editUserId) {
        await api.updateUser(editUserId, {
          name: formName.trim(), email: formEmail.trim(), position: formPosition.trim(),
          department: formDepartment.trim(), role: formRole,
        });
        toast.success("Akun berhasil diperbarui");
      } else {
        await api.createUser({
          name: formName.trim(), email: formEmail.trim(), password: formPassword,
          position: formPosition.trim(), department: formDepartment.trim(), role: formRole,
          joinDate: new Date().toISOString().split("T")[0],
        });
        toast.success("Akun berhasil dibuat");
      }
      await refreshUsers();
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan akun");
    }
  };

  const handleResetPassword = async () => {
    setResetPasswordErrors("");
    const passwordResult = passwordSchema.safeParse(newPassword);
    if (!passwordResult.success) { setResetPasswordErrors(passwordResult.error.errors[0].message); return; }
    if (newPassword !== confirmPassword) { setResetPasswordErrors("Password tidak cocok"); return; }

    try {
      await api.resetPassword(resetPasswordUserId!, newPassword);
      const user = users.find((u) => u.id === resetPasswordUserId);
      toast.success(`Password untuk ${user?.name} berhasil direset`);
      setResetPasswordDialogOpen(false);
      resetPasswordForm();
    } catch {
      toast.error("Gagal mereset password");
    }
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) { password += chars.charAt(Math.floor(Math.random() * chars.length)); }
    setNewPassword(password); setConfirmPassword(password); setShowNewPassword(true);
  };

  const deleteUser = async (id: string) => {
    try {
      await api.deleteUser(id);
      await refreshUsers();
      setConfirmDeleteId(null);
      toast.success("Akun berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus akun");
    }
  };

  const adminCount = users.filter((u) => u.role === "admin").length;
  const employeeCount = users.filter((u) => u.role === "employee").length;
  const incompleteCount = users.filter((u) => getUserCompletion(u) < 80).length;
  const resetPasswordUser = resetPasswordUserId ? users.find((u) => u.id === resetPasswordUserId) : null;

  // Detail sheet data
  const detailUserDocs = detailSheetUser ? documents.filter((d) => d.userId === detailSheetUser.id) : [];
  const detailUserTasks = detailSheetUser ? tasks.filter((t: any) => t.assigneeId === detailSheetUser.id) : [];
  const detailUserTeams = detailSheetUser ? teams.filter((t) => t.memberIds.includes(detailSheetUser.id)) : [];
  const detailCompletion = detailSheetUser ? calculateProfileCompletion(detailSheetUser, documents) : 0;
  const detailMissing = detailSheetUser ? getMissingFields(detailSheetUser, documents) : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Users className="w-4 h-4 text-primary" /> Kelola Akun
        </h1>
        <Button size="sm" className="gap-1 text-xs" onClick={() => { resetForm(); setDialogOpen(true); }}>
          <UserPlus className="w-3 h-3" /> Tambah Akun
        </Button>
      </div>

      {loading ? <StatsSkeleton count={4} /> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <StatsCard label="Total Akun" value={users.length} icon={Users} color="text-primary" bgColor="bg-muted" delay={0} />
          <StatsCard label="Admin" value={adminCount} icon={Shield} color="text-warning" bgColor="bg-warning/10" delay={1} />
          <StatsCard label="Karyawan" value={employeeCount} icon={Briefcase} color="text-success" bgColor="bg-success/10" delay={2} />
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-sm">Daftar Akun</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Cari akun..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 text-xs" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <TableSkeleton rows={4} cols={5} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nama</TableHead>
                  <TableHead className="text-xs">Jabatan</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Department</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Role</TableHead>
                  <TableHead className="text-xs text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const completion = getUserCompletion(user);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className={`text-[9px] font-medium ${user.role === "admin" ? "bg-warning/10 text-warning" : "bg-primary "}`}>
                              {initials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-medium text-foreground">{user.name}</p>
                            <p className="text-[10px] text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{user.position}</TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{user.department}</TableCell>

                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-[9px]">
                          {user.role === "admin" ? "Admin" : "Karyawan"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setDetailSheetUser(user)}><Eye className="w-3.5 h-3.5 " /></Button></TooltipTrigger><TooltipContent side="top" className="text-xs">Lihat Detail</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => openResetPassword(user)}><KeyRound className="w-3.5 h-3.5 text-warning" /></Button></TooltipTrigger><TooltipContent side="top" className="text-xs">Reset Password</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => openEditUser(user)}><Edit2 className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent side="top" className="text-xs">Edit</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="w-7 h-7 text-destructive" onClick={() => setConfirmDeleteId(user.id)}><Trash2 className="w-3.5 h-3.5" /></Button></TooltipTrigger><TooltipContent side="top" className="text-xs">Hapus</TooltipContent></Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Tidak ada akun ditemukan</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" />{editUserId ? "Edit Akun" : "Tambah Akun Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label className="text-xs">Nama Lengkap</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="cth. Budi Santoso" className="text-xs" />{formErrors.name && <p className="text-[10px] text-destructive">{formErrors.name}</p>}</div>
            <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="cth. budi@perusahaan.com" className="text-xs" />{formErrors.email && <p className="text-[10px] text-destructive">{formErrors.email}</p>}</div>
            <div className="space-y-1">
              <Label className="text-xs">Password {editUserId && <span className="text-muted-foreground">(kosongkan jika tidak diubah)</span>}</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder={editUserId ? "••••••" : "Minimal 6 karakter"} className="text-xs pr-9" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full w-9 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                </Button>
              </div>
              {formErrors.password && <p className="text-[10px] text-destructive">{formErrors.password}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Jabatan</Label>
                {positions.length > 0 ? (
                  <Select value={formPosition} onValueChange={setFormPosition}>
                    <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Pilih jabatan..." /></SelectTrigger>
                    <SelectContent>
                      {positions.map((p) => <SelectItem key={p.id} value={p.position} className="text-xs">{p.position}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={formPosition} onChange={(e) => setFormPosition(e.target.value)} placeholder="cth. Engineer" className="text-xs" />
                )}
                {formErrors.position && <p className="text-[10px] text-destructive">{formErrors.position}</p>}
              </div>
              <div className="space-y-1"><Label className="text-xs">Department</Label><Input value={formDepartment} onChange={(e) => setFormDepartment(e.target.value)} placeholder="cth. IT" className="text-xs" />{formErrors.department && <p className="text-[10px] text-destructive">{formErrors.department}</p>}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as Role)}>
                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee" className="text-xs">Karyawan</SelectItem>
                  <SelectItem value="admin" className="text-xs">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmit} className="w-full text-xs">{editUserId ? "Simpan Perubahan" : "Buat Akun"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={(o) => { setResetPasswordDialogOpen(o); if (!o) resetPasswordForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2"><KeyRound className="w-4 h-4 text-warning" /> Reset Password</DialogTitle>
            <DialogDescription className="text-xs">Reset password untuk <span className="font-semibold text-foreground">{resetPasswordUser?.name}</span></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Password Baru</Label>
              <div className="relative">
                <Input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" className="text-xs pr-9" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full w-9 hover:bg-transparent" onClick={() => setShowNewPassword(!showNewPassword)}>
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Konfirmasi Password</Label>
              <Input type={showNewPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ketik ulang password" className="text-xs" />
            </div>
            {resetPasswordErrors && <p className="text-[10px] text-destructive">{resetPasswordErrors}</p>}
            <Button type="button" variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={generateRandomPassword}>
              <RefreshCw className="w-3 h-3" /> Generate Password Otomatis
            </Button>
            <Button onClick={handleResetPassword} className="w-full text-xs">Reset Password</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee Detail Sheet */}
      <Sheet open={!!detailSheetUser} onOpenChange={(o) => !o && setDetailSheetUser(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-sm flex items-center gap-2">Detail Karyawan</SheetTitle>
            <SheetDescription className="sr-only">Detail informasi karyawan</SheetDescription>
          </SheetHeader>
          
          {detailSheetUser && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-primary font-semibold">{initials(detailSheetUser.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{detailSheetUser.name}</p>
                  <p className="text-xs text-muted-foreground">{detailSheetUser.position} • {detailSheetUser.department}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={detailCompletion} className="w-20 h-1.5" />
                    <span className={`text-[10px] font-medium ${getCompletionColor(detailCompletion)}`}>{detailCompletion}%</span>
                  </div>
                </div>
              </div>

              {detailMissing.length > 0 && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-warning/10 border border-warning/20">
                  <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground"><span className="text-warning font-medium">Belum lengkap:</span> {detailMissing.join(", ")}</p>
                </div>
              )}

              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="personal" className="flex-1 text-xs">Data Pribadi</TabsTrigger>
                  <TabsTrigger value="documents" className="flex-1 text-xs">Dokumen</TabsTrigger>
                  <TabsTrigger value="work" className="flex-1 text-xs">Info Kerja</TabsTrigger>
                </TabsList>
                <TabsContent value="personal" className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-muted-foreground">Email</p><p className="font-medium text-foreground">{detailSheetUser.email}</p></div>
                    <div><p className="text-muted-foreground">No. Telepon</p><p className="font-medium text-foreground">{detailSheetUser.phone || "-"}</p></div>
                    <div><p className="text-muted-foreground">Tempat Lahir</p><p className="font-medium text-foreground">{detailSheetUser.birthPlace || "-"}</p></div>
                    <div><p className="text-muted-foreground">Tanggal Lahir</p><p className="font-medium text-foreground">{detailSheetUser.birthDate ? format(new Date(detailSheetUser.birthDate), "d MMM yyyy", { locale: localeID }) : "-"}</p></div>
                    <div><p className="text-muted-foreground">Jenis Kelamin</p><p className="font-medium text-foreground">{detailSheetUser.gender === "male" ? "Laki-laki" : detailSheetUser.gender === "female" ? "Perempuan" : "-"}</p></div>
                    <div><p className="text-muted-foreground">Agama</p><p className="font-medium text-foreground">{detailSheetUser.religion || "-"}</p></div>
                    <div><p className="text-muted-foreground">Status</p><p className="font-medium text-foreground">{detailSheetUser.maritalStatus === "single" ? "Belum Menikah" : detailSheetUser.maritalStatus === "married" ? "Menikah" : detailSheetUser.maritalStatus === "divorced" ? "Cerai" : detailSheetUser.maritalStatus === "widowed" ? "Duda/Janda" : "-"}</p></div>
                    <div><p className="text-muted-foreground">Kontak Darurat</p><p className="font-medium text-foreground">{detailSheetUser.emergencyContact || "-"}</p></div>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-xs"><div><p className="text-muted-foreground">Alamat</p><p className="font-medium text-foreground">{detailSheetUser.address || "-"}</p></div></div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div><p className="text-muted-foreground">NPWP</p><p className="font-medium text-foreground">{detailSheetUser.npwp || "-"}</p></div>
                    <div><p className="text-muted-foreground">BPJS Kesehatan</p><p className="font-medium text-foreground">{detailSheetUser.bpjsKesehatan || "-"}</p></div>
                    <div><p className="text-muted-foreground">BPJS TK</p><p className="font-medium text-foreground">{detailSheetUser.bpjsKetenagakerjaan || "-"}</p></div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div><p className="text-muted-foreground">Bank</p><p className="font-medium text-foreground">{detailSheetUser.bankName || "-"}</p></div>
                    <div><p className="text-muted-foreground">No. Rekening</p><p className="font-medium text-foreground">{detailSheetUser.bankAccountNumber || "-"}</p></div>
                    <div><p className="text-muted-foreground">Atas Nama</p><p className="font-medium text-foreground">{detailSheetUser.bankAccountName || "-"}</p></div>
                  </div>
                </TabsContent>
                <TabsContent value="documents" className="mt-4">
                  <div className="grid grid-cols-3 gap-3">
                    {(["ktp", "kk", "foto", "sim", "ijazah"] as const).map((type) => {
                      const doc = detailUserDocs.find((d) => d.type === type);
                      return (
                        <div key={type} className="flex flex-col items-center p-3 rounded-lg border border-border bg-card">
                          <p className="text-xs font-medium text-foreground mb-2">{formatDocumentType(type)}</p>
                          {doc ? (
                            <>
                              <div className="w-16 h-16 rounded bg-muted flex items-center justify-center mb-2"><FileText className="w-6 h-6 text-muted-foreground" /></div>
                              <p className="text-[9px] text-muted-foreground truncate max-w-full">{doc.fileName}</p>
                            </>
                          ) : (
                            <div className="flex flex-col items-center">
                              <div className="w-16 h-16 rounded bg-muted flex items-center justify-center mb-2"><FileText className="w-6 h-6 text-muted-foreground" /></div>
                              <p className="text-[10px] text-muted-foreground">Belum diupload</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
                <TabsContent value="work" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-muted-foreground">Jabatan</p><p className="font-medium text-foreground">{detailSheetUser.position}</p></div>
                    <div><p className="text-muted-foreground">Department</p><p className="font-medium text-foreground">{detailSheetUser.department}</p></div>
                    <div><p className="text-muted-foreground">Tipe Kontrak</p><p className="font-medium text-foreground">{detailSheetUser.contractType || "-"}</p></div>
                    <div><p className="text-muted-foreground">Bergabung</p><p className="font-medium text-foreground">{format(new Date(detailSheetUser.joinDate), "d MMM yyyy", { locale: localeID })}</p></div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Tim</p>
                    {detailUserTeams.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Belum masuk tim</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">{detailUserTeams.map((t) => (<Badge key={t.id} variant="secondary" className="text-[10px]">{t.name}</Badge>))}</div>
                    )}
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1">
                      <ClipboardList className="w-3 h-3" /> Tugas Aktif ({detailUserTasks.filter((t: any) => t.status !== "completed").length})
                    </p>
                    {detailUserTasks.filter((t: any) => t.status !== "completed").length === 0 ? (
                      <p className="text-xs text-muted-foreground">Tidak ada tugas aktif</p>
                    ) : (
                      <div className="space-y-2">
                        {detailUserTasks.filter((t: any) => t.status !== "completed").slice(0, 5).map((task: any) => (
                          <div key={task.id} className="flex items-center justify-between p-2 rounded-lg border border-border text-xs">
                            <span className="text-foreground truncate max-w-[200px]">{task.title}</span>
                            <Badge variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "secondary"} className="text-[9px]">{task.priority}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog open={!!confirmDeleteId} onOpenChange={(o) => { if (!o) setConfirmDeleteId(null); }} title="Hapus akun ini?" description="Akun akan dihapus secara permanen dan tidak dapat dikembalikan." variant="destructive" confirmText="Hapus" onConfirm={() => confirmDeleteId && deleteUser(confirmDeleteId)} />
    </motion.div>
  );
};

export default Accounts;
