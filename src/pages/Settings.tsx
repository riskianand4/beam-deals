import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/contexts/TaskContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useMenuSettings } from "@/contexts/MenuSettingsContext";
import api from "@/lib/api";
import { motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  Briefcase,
  ChevronDown,
  Globe,
  KeyRound,
  Menu,
  Moon,
  Plus,
  Settings as SettingsIcon,
  Shield,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";

const AVATAR_COLORS = [
  "bg-primary",
  "bg-rose-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-cyan-500",
];

const MENU_ITEMS = [
  { key: "notes", label: "Catatan" },
  { key: "attendance", label: "Kehadiran" },
  { key: "finance", label: "Keuangan" },
  { key: "payslip", label: "Slip Gaji" },
  { key: "vault", label: "Tautan" },
  { key: "messages", label: "Pesan" },
  { key: "team", label: "Tim" },
  { key: "accounts", label: "Kelola Akun" },
  { key: "review", label: "Tinjau Tugas" },
  { key: "approve", label: "Approval" },
  { key: "viewApproval", label: "Lihat Persetujuan" },
] as const;

const DEFAULT_NOTIFICATION_SETTINGS = {
  taskAssignments: true,
  deadlineReminders: true,
  teamUpdates: false,
};

const SettingsPage = () => {
  const { user, isAdmin, updateProfile, users: allUsers } = useAuth();
  const { tasks } = useTasks();
  const { theme, toggleTheme } = useTheme();
  const { menuSettings, updateMenuSettings } = useMenuSettings();
  const [name, setName] = useState(user?.name ?? "");
  const [avatarColor, setAvatarColor] = useState("bg-primary");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [notifTasks, setNotifTasks] = useState(
    user?.notificationSettings?.taskAssignments ??
      DEFAULT_NOTIFICATION_SETTINGS.taskAssignments,
  );
  const [notifDeadlines, setNotifDeadlines] = useState(
    user?.notificationSettings?.deadlineReminders ??
      DEFAULT_NOTIFICATION_SETTINGS.deadlineReminders,
  );
  const [notifTeam, setNotifTeam] = useState(
    user?.notificationSettings?.teamUpdates ??
      DEFAULT_NOTIFICATION_SETTINGS.teamUpdates,
  );
  const [dateFormat, setDateFormat] = useState("d MMMM yyyy");
  const [language, setLanguage] = useState("id");
  const [localMenuSettings, setLocalMenuSettings] = useState(menuSettings);
  const [positionAccess, setPositionAccess] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [positionAccessLoading, setPositionAccessLoading] = useState(false);
  const [dialogJabatan, setDialogJabatan] = useState(false);
  const [dynamicPositions, setDynamicPositions] = useState<
    {
      id: string;
      position: string;
      description: string;
      menus: Record<string, boolean>;
    }[]
  >([]);
  const [newPositionName, setNewPositionName] = useState("");
  const [newPositionDesc, setNewPositionDesc] = useState("");
  // Tambahkan state ini:
  const [activeTab, setActiveTab] = useState("general");
  useEffect(() => {
    setLocalMenuSettings(menuSettings);
  }, [menuSettings]);

  useEffect(() => {
    setName(user?.name ?? "");
    setNotifTasks(
      user?.notificationSettings?.taskAssignments ??
        DEFAULT_NOTIFICATION_SETTINGS.taskAssignments,
    );
    setNotifDeadlines(
      user?.notificationSettings?.deadlineReminders ??
        DEFAULT_NOTIFICATION_SETTINGS.deadlineReminders,
    );
    setNotifTeam(
      user?.notificationSettings?.teamUpdates ??
        DEFAULT_NOTIFICATION_SETTINGS.teamUpdates,
    );
  }, [user]);

  const initials = name.split(" ").map((n) => n[0]).join("") || "?";

  const myTasks = user
    ? tasks.filter((t) => {
      if (user.role === "admin") return true;
      return t.assigneeId === user.id;
    })
    : [];
  const completedTasks = myTasks.filter((t) => t.status === "completed").length;
  const activeTasks = myTasks.filter((t) => t.status !== "completed").length;
  const completionRate = myTasks.length > 0
    ? Math.round((completedTasks / myTasks.length) * 100)
    : 0;

  // Load position access
  useEffect(() => {
    if (isAdmin) {
      setPositionAccessLoading(true);
      Promise.all([
        api.getPositionAccess(),
        api.getPositions().catch(() => []),
      ]).then(([accessData, posData]) => {
        setPositionAccess(accessData);
        setDynamicPositions(posData);
      }).catch(() => {}).finally(() => setPositionAccessLoading(false));
    }
  }, [isAdmin]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Nama tidak boleh kosong");
      return;
    }
    if (trimmed.length > 100) {
      toast.error("Nama terlalu panjang (maks 100 karakter)");
      return;
    }

    // Handle password change
    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        toast.error("Isi kedua field kata sandi");
        return;
      }
      if (newPassword.length < 6) {
        toast.error("Kata sandi baru minimal 6 karakter");
        return;
      }
      try {
        await api.changePassword(currentPassword, newPassword);
        toast.success("Kata sandi berhasil diubah");
        setCurrentPassword("");
        setNewPassword("");
      } catch (err: any) {
        toast.error(err.message || "Gagal mengubah kata sandi");
        return; // Don't proceed if password change failed
      }
    }

    await updateProfile({
      name: trimmed,
      notificationSettings: {
        taskAssignments: notifTasks,
        deadlineReminders: notifDeadlines,
        teamUpdates: notifTeam,
      },
    });
    toast.success("Pengaturan berhasil disimpan");
  };

  const handleMenuToggle = async (key: string, checked: boolean) => {
    const updated = { ...localMenuSettings, [key]: checked };
    setLocalMenuSettings(updated as typeof menuSettings);
    await updateMenuSettings(updated as typeof menuSettings);
    toast.success(`Menu ${checked ? "diaktifkan" : "dinonaktifkan"}`);
  };

  const settingsContent = (
    <div className="space-y-4">
      {/* Profil */}
      <div className="ms-card p-4 space-y-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <User className="w-3.5 h-3.5 text-primary" /> Profil
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Nama Lengkap</Label>
            <Input value={name} disabled className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Surel</Label>
            <Input value={user?.email ?? ""} disabled className="bg-muted" />
          </div>
        </div>
      </div>

      <div className="ms-card p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Bell className="w-3.5 h-3.5 text-primary" /> Notifikasi
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground">Penugasan Tugas</p>
            <Switch checked={notifTasks} onCheckedChange={setNotifTasks} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground">Pengingat Tenggat</p>
            <Switch
              checked={notifDeadlines}
              onCheckedChange={setNotifDeadlines}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground">Pembaruan Tim</p>
            <Switch checked={notifTeam} onCheckedChange={setNotifTeam} />
          </div>
        </div>
      </div>

      {/* Preferensi */}
      <div className="ms-card p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Globe className="w-3.5 h-3.5 text-primary" /> Preferensi
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === "dark"
              ? <Moon className="w-4 h-4 text-primary" />
              : <Sun className="w-4 h-4 text-warning" />}
            <p className="text-sm text-foreground">Mode Gelap</p>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
        </div>
        <Separator />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Bahasa</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id">Bahasa Indonesia</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Format Tanggal</Label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="d MMMM yyyy">23 Februari 2026</SelectItem>
                <SelectItem value="dd/MM/yyyy">23/02/2026</SelectItem>
                <SelectItem value="yyyy-MM-dd">2026-02-23</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Akun */}
      <div className="ms-card p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Shield className="w-3.5 h-3.5 text-primary" /> Akun
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Kata Sandi Saat Ini</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Kata Sandi Baru</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Simpan */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="px-8">Simpan Perubahan</Button>
      </div>

      {/* Zona Berbahaya */}
      <div className="border border-destructive/30 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
          <Trash2 className="w-3.5 h-3.5" /> Zona Berbahaya
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">Hapus Akun</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Apakah Anda benar-benar yakin?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini tidak dapat dibatalkan. Semua data Anda akan
                dihapus secara permanen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  toast.info("Penghapusan akun dinonaktifkan dalam mode demo")}
              >
                Hapus Akun
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );

  const menuContent = (
    <div className="space-y-4">
      <div className="ms-card p-4 space-y-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Menu className="w-3.5 h-3.5 text-primary" /> Kontrol Menu Sidebar
        </div>
        <p className="text-xs text-muted-foreground">
          Menu yang dinonaktifkan akan tersembunyi dari sidebar untuk semua
          pengguna (termasuk karyawan). Menu Dasbor, Tugas, Profil, dan
          Pengaturan selalu aktif.
        </p>
        <div className="space-y-1">
          {MENU_ITEMS.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <p className="text-sm text-foreground">{item.label}</p>
              <Switch
                checked={(localMenuSettings as any)[item.key] ?? false}
                onCheckedChange={(checked) =>
                  handleMenuToggle(item.key, checked)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const uniquePositions: string[] = dynamicPositions.map((p) => p.position);

  const handleAddPosition = async () => {
    if (!newPositionName.trim()) {
      toast.error("Nama jabatan wajib diisi");
      return;
    }
    try {
      const result = await api.createPosition(
        newPositionName.trim(),
        newPositionDesc.trim(),
      );
      setDynamicPositions((prev) => [...prev, result]);
      setPositionAccess((prev) => ({
        ...prev,
        [result.position]: result.menus,
      }));
      setNewPositionName("");
      setNewPositionDesc("");
      setDialogJabatan(false);
      toast.success("Jabatan berhasil ditambahkan");
    } catch (err: any) {
      toast.error(err.message || "Gagal menambah jabatan");
    }
  };

  const handlePositionMenuToggle = async (
    position: string,
    menuKey: string,
    checked: boolean,
  ) => {
    const current = positionAccess[position] || {};
    const updated = { ...current, [menuKey]: checked };
    setPositionAccess((prev) => ({ ...prev, [position]: updated }));
    try {
      await api.updatePositionAccess(position, updated);
      toast.success(`Akses ${checked ? "diberikan" : "dicabut"}`);
    } catch {
      toast.error("Gagal menyimpan hak akses");
    }
  };
  const handleJabatanClick = () => {
    setDialogJabatan(true);
  };

  const accessContent = (
    <div className="space-y-4">
      <div className="ms-card p-4 space-y-4">
        <div className="flex items-center justify-between gap-1.5 text-xs font-semibold text-foreground">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <KeyRound className="w-3.5 h-3.5 " /> Hak Akses Menu per Jabatan
          </span>
          <Button onClick={handleJabatanClick} className="shadow-md gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Tambah Jabatan
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Atur menu mana saja yang bisa diakses oleh setiap jabatan. Menu global
          harus diaktifkan terlebih dahulu di tab Menu.
        </p>
        {uniquePositions.length === 0
          ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Belum ada jabatan yang terdaftar pada karyawan.
            </p>
          )
          : (
            <div className="space-y-2">
              {uniquePositions.map((pos) => {
                const menus = positionAccess[pos] || {};
                return (
                  <Collapsible key={pos}>
                    <CollapsibleTrigger className="w-full flex items-center justify-between py-3 px-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5" /> {pos}
                      </h3>
                      <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down px-3 pb-3 pt-2">
                      <div className="grid grid-cols-2 gap-2">
                        {MENU_ITEMS.map((item) => (
                          <div
                            key={item.key}
                            className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
                          >
                            <p className="text-xs text-foreground">
                              {item.label}
                            </p>
                            <Switch
                              checked={menus[item.key] ?? false}
                              onCheckedChange={(checked) =>
                                handlePositionMenuToggle(
                                  pos,
                                  item.key,
                                  checked,
                                )}
                            />
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 max-w-8xl"
    >
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        <SettingsIcon className="w-4 h-4 text-primary" /> Pengaturan
      </h1>

      {isAdmin
        ? (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="relative">
              <TabsTrigger
                value="general"
                className="relative text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                {activeTab === "general" && (
                  <motion.div
                    layoutId="settings-tab-indicator"
                    className="absolute inset-0 rounded-sm bg-background shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">Umum</span>
              </TabsTrigger>

              <TabsTrigger
                value="menu"
                className="relative text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                {activeTab === "menu" && (
                  <motion.div
                    layoutId="settings-tab-indicator"
                    className="absolute inset-0 rounded-sm bg-background shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">Menu</span>
              </TabsTrigger>

              <TabsTrigger
                value="access"
                className="relative text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                {activeTab === "access" && (
                  <motion.div
                    layoutId="settings-tab-indicator"
                    className="absolute inset-0 rounded-sm bg-background shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">Hak Akses</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-4">
              {settingsContent}
            </TabsContent>
            <TabsContent value="menu" className="mt-4">
              {menuContent}
            </TabsContent>
            <TabsContent value="access" className="mt-4">
              {accessContent}
            </TabsContent>
          </Tabs>
        )
        : settingsContent}

      {/* Dialog Tambah Jabatan */}
      <Dialog open={dialogJabatan} onOpenChange={setDialogJabatan}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" /> Tambah Jabatan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Nama Jabatan</Label>
              <Input
                value={newPositionName}
                onChange={(e) => setNewPositionName(e.target.value)}
                placeholder="cth. Manager"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Deskripsi</Label>
              <Input
                value={newPositionDesc}
                onChange={(e) => setNewPositionDesc(e.target.value)}
                placeholder="cth. Mengelola tim dan proyek"
                className="text-xs"
              />
            </div>
            <Button onClick={handleAddPosition} className="w-full text-xs">
              Tambah Jabatan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default SettingsPage;
