import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api, { getUploadUrl } from "@/lib/api";
import type {
  ContractHistory,
  Gender,
  MaritalStatus,
  User,
  UserDocument,
  WarningLetter,
  WorkReport,
} from "@/types";
import {
  calculateProfileCompletion,
  formatDocumentType,
  getCompletionBgColor,
  getCompletionColor,
  getMissingFields,
} from "@/lib/profileUtils";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  Camera,
  Check,
  CreditCard,
  ClipboardList,
  Download,
  Edit2,
  Eye,
  FileText,
  Heart,
  MapPin,
  Paperclip,
  Phone,
  Plus,
  Save,
  Shield,
  Trash2,
  Upload,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProfileSkeleton } from "@/components/PageSkeleton";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { id as localeID } from "date-fns/locale";
import Cropper from "react-easy-crop";
import { Slider } from "@/components/ui/slider";
import getCroppedImg, { type CroppedArea } from "@/lib/cropImage";

const RELIGIONS = ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu", "Lainnya"];
const BANKS = ["BCA", "BNI", "BRI", "Mandiri", "CIMB Niaga", "BTN", "BSI", "Lainnya"];

const Profile = () => {
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const { user: currentUser, updateProfile, isAdmin } = useAuth();

  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [contracts, setContracts] = useState<ContractHistory[]>([]);
  const [warnings, setWarnings] = useState<WarningLetter[]>([]);
  const [workReports, setWorkReports] = useState<WorkReport[]>([]);
  const [loading, setLoading] = useState(true);

  const [profileData, setProfileData] = useState<Partial<User>>({});
  const [editing, setEditing] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<UserDocument | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // SP form (admin only)
  const [spDialogOpen, setSpDialogOpen] = useState(false);
  const [spLevel, setSpLevel] = useState<WarningLetter["level"]>("SP1");
  const [spReason, setSpReason] = useState("");
  const [spDocument, setSpDocument] = useState("");

  // Work Report form
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);

  // Crop state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedArea | null>(null);

  const isOwnProfile = !paramUserId || paramUserId === currentUser?.id;
  const user = isOwnProfile ? currentUser : targetUser;

  useEffect(() => {
    if (user && isOwnProfile) {
      setProfileData({
        phone: user.phone || "",
        emergencyContact: user.emergencyContact || "",
        address: user.address || "",
        birthPlace: user.birthPlace || "",
        birthDate: user.birthDate || "",
        gender: user.gender || undefined,
        religion: user.religion || "",
        maritalStatus: user.maritalStatus || undefined,
        npwp: user.npwp || "",
        bpjsKesehatan: user.bpjsKesehatan || "",
        bpjsKetenagakerjaan: user.bpjsKetenagakerjaan || "",
        bankName: user.bankName || "",
        bankAccountNumber: user.bankAccountNumber || "",
        bankAccountName: user.bankAccountName || "",
      });
    }
  }, [user, isOwnProfile]);

  const fetchData = useCallback(async () => {
    const uid = paramUserId || currentUser?.id;
    if (!uid) return;
    try {
      setLoading(true);
      const promises: Promise<any>[] = [
        api.getUserDocuments(uid),
        api.getContracts(uid),
        api.getWarnings(uid),
        api.getWorkReports(uid),
      ];
      if (!isOwnProfile) promises.push(api.getUser(uid));
      const results = await Promise.all(promises);
      setDocuments(results[0]);
      setContracts(results[1]);
      setWarnings(results[2]);
      setWorkReports(results[3]);
      if (!isOwnProfile && results[4]) setTargetUser(results[4]);
    } catch (err) {
      console.error("Failed to load profile data:", err);
    } finally {
      setLoading(false);
    }
  }, [paramUserId, currentUser?.id, isOwnProfile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const initials = user?.name?.split(" ").map((n) => n[0]).join("") || "?";
  const activeWarnings = warnings.filter((w) => w.status === "active");
  const hasActiveSP = activeWarnings.length > 0;

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Ukuran foto maksimal 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropComplete = async () => {
    if (!cropImage || !croppedAreaPixels) return;
    try {
      setUploadingAvatar(true);
      const croppedBlob = await getCroppedImg(cropImage, croppedAreaPixels);
      // Convert blob to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          if (isOwnProfile) {
            const result = await api.uploadAvatar({ avatar: base64 });
            await updateProfile({ avatar: result.avatar });
          } else if (paramUserId) {
            await api.uploadAvatarForUser(paramUserId, { avatar: base64 });
            setTargetUser((prev) => prev ? { ...prev, avatar: base64 } : prev);
          }
          toast.success("Foto profil berhasil diperbarui");
          setCropDialogOpen(false);
          setCropImage(null);
        } catch {
          toast.error("Gagal mengupload foto");
        } finally {
          setUploadingAvatar(false);
        }
      };
      reader.readAsDataURL(croppedBlob);
    } catch {
      toast.error("Gagal memproses foto");
      setUploadingAvatar(false);
    }
  };

  const userDocs = documents.filter((d) => d.userId === user?.id);
  const mergedUser = { ...user, ...profileData } as User;
  const completionPercentage = calculateProfileCompletion(mergedUser, documents);

  const handleSave = async () => {
    try {
      await updateProfile(profileData);
      setEditing(false);
      toast.success("Profil berhasil diperbarui");
    } catch {
      toast.error("Gagal memperbarui profil");
    }
  };

  const handleFileUpload = async (type: UserDocument["type"], e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Ukuran file maksimal 5MB"); return; }
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      formData.append("userId", user.id);
      const newDoc = await api.uploadDocument(formData);
      setDocuments((prev) => [...prev.filter((d) => !(d.userId === user.id && d.type === type)), newDoc]);
      toast.success(`${formatDocumentType(type)} berhasil diupload`);
    } catch {
      toast.error("Gagal mengupload dokumen");
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await api.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast.success("Dokumen berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus dokumen");
    }
  };

  const handleCreateSP = async () => {
    if (!user || !spReason.trim()) { toast.error("Alasan wajib diisi"); return; }
    try {
      const newSP = await api.createWarning({
        userId: user.id,
        level: spLevel,
        reason: spReason,
        documentBase64: spDocument,
      });
      setWarnings((prev) => [newSP, ...prev]);
      setSpDialogOpen(false);
      setSpReason("");
      setSpDocument("");
      toast.success("Surat Peringatan berhasil diterbitkan");
    } catch {
      toast.error("Gagal menerbitkan SP");
    }
  };

  const handleDeleteSP = async (id: string) => {
    try {
      await api.deleteWarning(id);
      setWarnings((prev) => prev.filter((w) => w.id !== id));
      toast.success("SP berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus SP");
    }
  };

  const handleSPDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Ukuran file maksimal 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setSpDocument(reader.result as string);
    reader.readAsDataURL(file);
  };

  const getDocByType = (type: UserDocument["type"]) => userDocs.find((d) => d.type === type);

  const canEdit = isOwnProfile;
  const canManageSP = isAdmin && !isOwnProfile;

  const handleCreateReport = async () => {
    if (!reportTitle.trim()) { toast.error("Judul laporan wajib diisi"); return; }
    try {
      const formData = new FormData();
      formData.append("title", reportTitle);
      formData.append("description", reportDesc);
      if (reportFile) formData.append("file", reportFile);
      const newReport = await api.createWorkReport(formData);
      setWorkReports((prev) => [newReport, ...prev]);
      setReportDialogOpen(false);
      setReportTitle("");
      setReportDesc("");
      setReportFile(null);
      toast.success("Laporan berhasil dikirim");
    } catch {
      toast.error("Gagal mengirim laporan");
    }
  };

  const handleDeleteReport = async (id: string) => {
    try {
      await api.deleteWorkReport(id);
      setWorkReports((prev) => prev.filter((r) => r.id !== id));
      toast.success("Laporan berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus laporan");
    }
  };

  const ReadOnlyDocBox = ({ type, label }: { type: UserDocument["type"]; label: string }) => {
    const doc = getDocByType(type);
    const isRequired = ["ktp", "kk", "foto"].includes(type);
    return (
      <div className="flex flex-col items-center p-3 border border-border rounded-lg bg-card">
        <p className="text-xs font-medium text-foreground mb-1">{label}</p>
        {isRequired && <Badge variant="outline" className="text-[8px] mb-2">Wajib</Badge>}
        {doc ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded flex items-center justify-center">
              <Check className="w-5 h-5 text-success" />
            </div>
            <p className="text-[10px] text-muted-foreground truncate max-w-[80px]">{doc.fileName}</p>
            {doc.fileUrl && (
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPreviewDoc(doc)}>
                <Eye className="w-3 h-3" />
              </Button>
            )}
          </div>
        ) : canEdit ? (
          <label className="cursor-pointer flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded flex items-center justify-center">
              <Upload className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-[10px]">Upload</span>
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileUpload(type, e)} />
          </label>
        ) : (
          <div className="w-10 h-10 rounded flex items-center justify-center">
            <X className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>
    );
  };

  if (loading) return <ProfileSkeleton />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <h1 className="text-lg font-semibold text-foreground">
        {isOwnProfile ? "Profil Saya" : `Profil ${user?.name}`}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Left column */}
      <div className="space-y-5">
      {/* Header with avatar */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative group">
              <Avatar className={`w-16 h-16 ${hasActiveSP ? "ring-2 ring-destructive animate-pulse" : ""}`}>
                {user?.avatar && <AvatarImage src={user.avatar} alt={user?.name} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              {(canEdit || (isAdmin && !isOwnProfile)) && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  {uploadingAvatar ? <span className="text-white text-[10px]">...</span> : <Camera className="w-5 h-5 text-white" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} disabled={uploadingAvatar} />
                </label>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-foreground">{user?.name}</h2>
              <p className="text-xs text-muted-foreground">{user?.position} • {user?.department}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              {hasActiveSP && (
                <Badge variant="destructive" className="text-[9px] mt-1 gap-1">
                  <AlertTriangle className="w-3 h-3" /> SP Aktif
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Surat Peringatan Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-destructive" /> Surat Peringatan
            </CardTitle>
            {canManageSP && (
              <Button size="sm" variant="destructive" className="text-xs gap-1" onClick={() => setSpDialogOpen(true)}>
                <AlertTriangle className="w-3 h-3" /> Terbitkan SP
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {warnings.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Tidak ada surat peringatan</p>
          ) : (
            warnings.map((w) => {
              const daysLeft = w.status === "active" ? Math.max(0, differenceInDays(new Date(w.expiresAt), new Date())) : 0;
              return (
                <div key={w.id} className={`p-3 rounded-lg border ${w.status === "active" ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={w.status === "active" ? "destructive" : "secondary"} className="text-[9px]">
                        {w.level}
                      </Badge>
                      <Badge variant={w.status === "active" ? "outline" : "secondary"} className="text-[9px]">
                        {w.status === "active" ? `Sisa ${daysLeft} hari` : "Kedaluwarsa"}
                      </Badge>
                    </div>
                    {canManageSP && (
                      <Button size="icon" variant="ghost" className="w-6 h-6 text-destructive" onClick={() => handleDeleteSP(w.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-foreground">{w.reason}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Diterbitkan: {format(new Date(w.issuedDate), "d MMM yyyy", { locale: localeID })}
                  </p>
                  {w.documentBase64 && (
                    <Button size="sm" variant="outline" className="text-[10px] mt-2 gap-1 h-6" onClick={() => {
                      const link = document.createElement("a");
                      link.href = w.documentBase64!;
                      link.download = `SP_${w.level}.pdf`;
                      link.click();
                    }}>
                      <FileText className="w-3 h-3" /> Lihat Dokumen
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
      </div>{/* End left column */}

      {/* Right column - Laporan Kerja */}
      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-primary" /> Laporan Kerja
              </CardTitle>
              {isOwnProfile && (
                <Button size="sm" className="text-xs gap-1" onClick={() => setReportDialogOpen(true)}>
                  <Plus className="w-3 h-3" /> Tambah
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {workReports.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Belum ada laporan kerja</p>
            ) : (
              workReports.map((r) => (
                <div key={r.id} className="p-3 rounded-lg border border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground">{r.title}</p>
                    {(isOwnProfile || isAdmin) && (
                      <Button size="icon" variant="ghost" className="w-6 h-6 text-destructive" onClick={() => handleDeleteReport(r.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  {r.description && <p className="text-[11px] text-muted-foreground">{r.description}</p>}
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {r.fileUrl && (
                      <a href={getUploadUrl(r.fileUrl)} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary flex items-center gap-0.5 hover:underline">
                        <Download className="w-3 h-3" /> File
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>{/* End right column */}
      </div>{/* End grid */}

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-sm">Atur Foto Profil</DialogTitle></DialogHeader>
          <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden">
            {cropImage && (
              <Cropper image={cropImage} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, area) => setCroppedAreaPixels(area)} />
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Zoom</span>
            <Slider value={[zoom]} onValueChange={([v]) => setZoom(v)} min={1} max={3} step={0.1} className="flex-1" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setCropDialogOpen(false)}>Batal</Button>
            <Button size="sm" onClick={handleCropComplete} disabled={uploadingAvatar}>
              {uploadingAvatar ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SP Create Dialog */}
      <Dialog open={spDialogOpen} onOpenChange={setSpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" /> Terbitkan Surat Peringatan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Level SP</Label>
              <Select value={spLevel} onValueChange={(v) => setSpLevel(v as WarningLetter["level"])}>
                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SP1" className="text-xs">SP 1</SelectItem>
                  <SelectItem value="SP2" className="text-xs">SP 2</SelectItem>
                  <SelectItem value="SP3" className="text-xs">SP 3</SelectItem>
                  <SelectItem value="pemecatan" className="text-xs">Pemecatan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Alasan</Label>
              <Textarea value={spReason} onChange={(e) => setSpReason(e.target.value)} placeholder="Jelaskan alasan SP..." className="text-xs min-h-[80px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Dokumen SP (opsional)</Label>
              <Input type="file" accept="image/*,.pdf" className="text-xs" onChange={handleSPDocUpload} />
            </div>
            <Button onClick={handleCreateSP} variant="destructive" className="w-full text-xs">Terbitkan SP</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Work Report Create Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" /> Tambah Laporan Kerja
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Judul</Label>
              <Input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder="Judul laporan..." className="text-xs h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Deskripsi</Label>
              <Textarea value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} placeholder="Deskripsi aktivitas..." className="text-xs min-h-[80px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">File Bukti (opsional)</Label>
              <Input type="file" className="text-xs" onChange={(e) => setReportFile(e.target.files?.[0] || null)} />
            </div>
            <Button onClick={handleCreateReport} className="w-full text-xs">Kirim Laporan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default Profile;
