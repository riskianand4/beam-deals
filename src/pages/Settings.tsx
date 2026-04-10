import { useEffect, useState, useRef, useCallback } from "react";
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
  Check,
  ChevronDown,
  Globe,
  KeyRound,
  Loader2,
  LogOut,
  Menu,
  Moon,
  Phone,
  Plus,
  QrCode,
  Settings as SettingsIcon,
  Shield,
  Sun,
  Trash2,
  User,
  Wifi,
  WifiOff,
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
  { key: "notes", label: "Info Center" },
  { key: "attendance", label: "Kehadiran" },
  { key: "finance", label: "Keuangan" },
  { key: "payslip", label: "Slip Gaji" },
  { key: "vault", label: "Tautan" },
  { key: "team", label: "Team" },
  { key: "tasks", label: "Buat Tugas" },
  { key: "approve", label: "Pengajuan" },
  { key: "viewApproval", label: "CC (Tembusan)" },
  { key: "pengumuman", label: "Pengumuman" },
  { key: "mitra", label: "Mitra" },
  { key: "explorer", label: "Explorer" },
] as const;

const DEFAULT_NOTIFICATION_SETTINGS = {
  taskAssignments: true,
  deadlineReminders: true,
  teamUpdates: false,
};

const NOTIF_CATEGORIES = [
  { key: "pengumuman", label: "Pengumuman" },
  { key: "persetujuan", label: "Persetujuan" },
  { key: "tugas", label: "Tugas" },
  { key: "kehadiran", label: "Kehadiran" },
  { key: "pesan", label: "Pesan" },
];

function NotificationChannelsSettings() {
  const [channels, setChannels] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [waStatus, setWaStatus] = useState<{ status: string; phone: string | null }>({ status: "disconnected", phone: null });
  const [waQR, setWaQR] = useState<string | null>(null);
  const [waLoading, setWaLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [waConnecting, setWaConnecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const clearQRRetry = useCallback(() => {
    if (qrRetryRef.current) {
      clearTimeout(qrRetryRef.current);
      qrRetryRef.current = null;
    }
  }, []);

  // Fetch QR helper
  const fetchQR = useCallback(async () => {
    try {
      const qrData = await api.getWhatsAppQR();
      if (qrData.status) {
        setWaStatus((prev) => ({ ...prev, status: qrData.status }));
      }
      if (qrData.qr) {
        setWaQR(qrData.qr);
        setShowQR(true);
        setWaConnecting(false);
        return qrData.qr;
      }

      setWaQR(null);
      if (qrData.status !== "waiting_qr" && !waConnecting) {
        setShowQR(false);
      }
    } catch {}
    return null;
  }, [waConnecting]);

  useEffect(() => {
    api.getNotificationChannels().then(setChannels).catch(() => {});
    api.getWhatsAppStatus().then((st) => {
      setWaStatus(st);
      // If already waiting for QR on mount, fetch it immediately and start polling
      if (st.status === "waiting_qr") {
        fetchQR();
        startPolling();
      }
    }).catch(() => {});
    return () => {
      clearPolling();
      clearQRRetry();
    };
  }, [clearPolling, clearQRRetry, fetchQR]);

  const startPolling = useCallback(() => {
    clearPolling();
    pollRef.current = setInterval(async () => {
      try {
        // Always fetch both status and QR together
        const [st, qrData] = await Promise.all([
          api.getWhatsAppStatus(),
          api.getWhatsAppQR(),
        ]);
        setWaStatus(st);

        if (st.status === "connected") {
          setShowQR(false);
          setWaQR(null);
          setWaConnecting(false);
          clearPolling();
          clearQRRetry();
          toast.success("WhatsApp berhasil terhubung");
        } else if (qrData.qr) {
          setWaQR(qrData.qr);
          setShowQR(true);
        } else {
          setWaQR(null);
          setShowQR(st.status === "waiting_qr" || waConnecting);
        }
      } catch {}
    }, 2000);
  }, [clearPolling, clearQRRetry, waConnecting]);

  const handleWAConnect = async () => {
    setWaLoading(true);
    setWaConnecting(true);
    setWaQR(null);
    setWaStatus({ status: "waiting_qr", phone: null });
    setShowQR(true);
    clearQRRetry();
    try {
      await api.whatsAppConnect();

      // Aggressive polling: try fetching QR every 1s for up to 15s
      let attempts = 0;
      const tryFetchQR = async () => {
        if (attempts >= 15) {
          setWaConnecting(false);
          return;
        }
        attempts++;
        try {
          const qr = await fetchQR();
          if (qr) {
            startPolling(); // Switch to normal polling once QR is obtained
            return;
          }
        } catch {}
        qrRetryRef.current = setTimeout(tryFetchQR, 1000);
      };
      qrRetryRef.current = setTimeout(tryFetchQR, 1000);

      // Also start regular polling as fallback
      startPolling();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghubungkan WhatsApp");
    }
    setWaLoading(false);
  };

  const handleWALogout = async () => {
    setWaLoading(true);
    clearPolling();
    clearQRRetry();
    try {
      await api.whatsAppLogout();
      setWaConnecting(false);
      setWaStatus({ status: "disconnected", phone: null });
      setWaQR(null);
      setShowQR(false);
      toast.success("WhatsApp berhasil logout");
    } catch (err: any) {
      toast.error(err.message || "Gagal logout WhatsApp");
    }
    setWaLoading(false);
  };

  const update = async (path: string, value: any) => {
    if (!channels) return;
    const parts = path.split(".");
    const updated = JSON.parse(JSON.stringify(channels));
    let obj = updated;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = value;
    setChannels(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateNotificationChannels(channels);
      toast.success("Pengaturan integrasi disimpan");
    } catch { toast.error("Gagal menyimpan"); }
    setSaving(false);
  };

  if (!channels) return <div className="text-xs text-muted-foreground p-4">Memuat...</div>;

  return (
    <div className="space-y-4">
      <div className="ms-card p-4 space-y-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Bell className="w-3.5 h-3.5 text-primary" /> Integrasi Notifikasi
        </div>
        <p className="text-xs text-muted-foreground">Konfigurasi channel notifikasi WhatsApp dan Email. Semua notifikasi akan dikirim ke karyawan secara otomatis.</p>

        {/* WhatsApp - Interactive Card */}
        <div className="border border-border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-600" />
              <p className="text-sm font-medium text-foreground">WhatsApp</p>
            </div>
            <Switch checked={channels.whatsapp?.enabled || false} onCheckedChange={(v) => update("whatsapp.enabled", v)} />
          </div>

          {channels.whatsapp?.enabled && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  {waStatus.status === "connected" ? (
                    <>
                      <Wifi className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-foreground">Terhubung</span>
                      {waStatus.phone && (
                        <Badge variant="secondary" className="text-xs">+{waStatus.phone}</Badge>
                      )}
                    </>
                  ) : (waStatus.status === "waiting_qr" || waStatus.status === "connecting" || waConnecting) ? (
                    <>
                      <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        {waStatus.status === "waiting_qr" ? "Menunggu scan QR..." : "Menyiapkan integrasi..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Tidak terhubung</span>
                    </>
                  )}
                </div>

                {waStatus.status === "connected" ? (
                  <Button variant="outline" size="sm" onClick={handleWALogout} disabled={waLoading} className="text-xs">
                    {waLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <LogOut className="w-3 h-3 mr-1" />}
                    Logout
                  </Button>
                ) : (
                  <Button variant="default" size="sm" onClick={handleWAConnect} disabled={waLoading || waConnecting || waStatus.status === "connecting"} className="text-xs">
                    {(waLoading || waConnecting || waStatus.status === "connecting") ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <QrCode className="w-3 h-3 mr-1" />}
                    Hubungkan
                  </Button>
                )}
              </div>

              {showQR && waStatus.status !== "connected" && (
                <div className="border border-border rounded-lg p-6 flex flex-col items-center gap-3 bg-background">
                  <p className="text-xs font-medium text-foreground">Scan QR Code dengan WhatsApp</p>
                  {waQR ? (
                    <img src={waQR} alt="WhatsApp QR Code" className="w-64 h-64 rounded-lg" />
                  ) : (
                    <div className="w-64 h-64 flex flex-col items-center justify-center gap-3 bg-muted rounded-lg p-4 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        Sedang menyiapkan QR WhatsApp...
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    Buka WhatsApp di HP, masuk ke Perangkat Tertaut, lalu scan QR code di atas.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Email - Simple */}
        <div className="border border-border rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Email (SMTP)</p>
            <Switch checked={channels.email?.enabled || false} onCheckedChange={(v) => update("email.enabled", v)} />
          </div>
          {channels.email?.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Provider / SMTP Host</Label><Input value={channels.email?.provider || ""} onChange={e => update("email.provider", e.target.value)} placeholder="cth. gmail, sendgrid, smtp.host.com" className="text-xs" /></div>
              <div className="space-y-1"><Label className="text-xs">Password / API Key</Label><Input type="password" value={channels.email?.apiKey || ""} onChange={e => update("email.apiKey", e.target.value)} placeholder="Password atau API key" className="text-xs" /></div>
              <div className="space-y-1"><Label className="text-xs">Email Pengirim</Label><Input value={channels.email?.from || ""} onChange={e => update("email.from", e.target.value)} placeholder="noreply@domain.com" className="text-xs" /></div>
            </div>
          )}
        </div>
      </div>

      {/* Per-kategori */}
      <div className="ms-card p-4 space-y-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <BarChart3 className="w-3.5 h-3.5 text-primary" /> Channel per Kategori
        </div>
        <p className="text-xs text-muted-foreground">Pilih channel mana yang aktif untuk setiap kategori notifikasi.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-2 px-2">Kategori</th>
              <th className="text-center py-2 px-2">In-App</th>
              <th className="text-center py-2 px-2">Email</th>
              <th className="text-center py-2 px-2">WhatsApp</th>
            </tr></thead>
            <tbody>
              {NOTIF_CATEGORIES.map(cat => (
                <tr key={cat.key} className="border-b border-border/50">
                  <td className="py-2 px-2 font-medium text-foreground">{cat.label}</td>
                  <td className="py-2 px-2 text-center"><Switch checked={channels.categories?.[cat.key]?.inApp ?? true} onCheckedChange={(v) => update(`categories.${cat.key}.inApp`, v)} /></td>
                  <td className="py-2 px-2 text-center"><Switch checked={channels.categories?.[cat.key]?.email ?? false} onCheckedChange={(v) => update(`categories.${cat.key}.email`, v)} disabled={!channels.email?.enabled} /></td>
                  <td className="py-2 px-2 text-center"><Switch checked={channels.categories?.[cat.key]?.whatsapp ?? false} onCheckedChange={(v) => update(`categories.${cat.key}.whatsapp`, v)} disabled={!channels.whatsapp?.enabled} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Integrasi"}</Button>
      </div>
    </div>
  );
}

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

              <TabsTrigger
                value="integrations"
                className="relative text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                {activeTab === "integrations" && (
                  <motion.div
                    layoutId="settings-tab-indicator"
                    className="absolute inset-0 rounded-sm bg-background shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">Integrasi</span>
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
            <TabsContent value="integrations" className="mt-4">
              <NotificationChannelsSettings />
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
