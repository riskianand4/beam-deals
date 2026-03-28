import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import type {
  ContractHistory,
  Gender,
  MaritalStatus,
  User,
  UserDocument,
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
  Building2,
  Calendar,
  Camera,
  Check,
  CreditCard,
  Edit2,
  Eye,
  FileText,
  Heart,
  MapPin,
  Phone,
  Save,
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
import { ProfileSkeleton } from "@/components/PageSkeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import Cropper from "react-easy-crop";
import { Slider } from "@/components/ui/slider";
import getCroppedImg, { type CroppedArea } from "@/lib/cropImage";

const RELIGIONS = [
  "Islam",
  "Kristen",
  "Katolik",
  "Hindu",
  "Buddha",
  "Konghucu",
  "Lainnya",
];
const BANKS = [
  "BCA",
  "BNI",
  "BRI",
  "Mandiri",
  "CIMB Niaga",
  "BTN",
  "BSI",
  "Lainnya",
];

const Profile = () => {
  const { user, updateProfile } = useAuth();

  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [contracts, setContracts] = useState<ContractHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const [profileData, setProfileData] = useState<Partial<User>>({});
  const [editing, setEditing] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<UserDocument | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Crop state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<
    CroppedArea | null
  >(null);

  useEffect(() => {
    if (user) {
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
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [docs, ctrs] = await Promise.all([
        api.getUserDocuments(user.id),
        api.getContracts(user.id),
      ]);
      setDocuments(docs);
      setContracts(ctrs);
    } catch (err) {
      console.error("Failed to load profile data:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const initials = user?.name?.split(" ").map((n) => n[0]).join("") || "?";

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 5MB");
      return;
    }
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
      const formData = new FormData();
      formData.append("avatar", croppedBlob, "avatar.jpg");
      const result = await api.uploadAvatar(formData);
      await updateProfile({ avatar: result.avatar });
      toast.success("Foto profil berhasil diperbarui");
      setCropDialogOpen(false);
      setCropImage(null);
    } catch {
      toast.error("Gagal mengupload foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const userDocs = documents.filter((d) => d.userId === user?.id);
  const mergedUser = { ...user, ...profileData } as User;
  const completionPercentage = calculateProfileCompletion(
    mergedUser,
    documents,
  );
  const missingFields = getMissingFields(mergedUser, documents);

  const handleSave = async () => {
    try {
      await updateProfile(profileData);
      setEditing(false);
      toast.success("Profil berhasil diperbarui");
    } catch {
      toast.error("Gagal memperbarui profil");
    }
  };

  const handleFileUpload = async (
    type: UserDocument["type"],
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      formData.append("userId", user.id);
      const newDoc = await api.uploadDocument(formData);
      setDocuments((
        prev,
      ) => [
        ...prev.filter((d) => !(d.userId === user.id && d.type === type)),
        newDoc,
      ]);
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

  const getDocByType = (type: UserDocument["type"]) =>
    userDocs.find((d) => d.type === type);

  const ReadOnlyDocBox = (
    { type, label }: { type: UserDocument["type"]; label: string },
  ) => {
    const doc = getDocByType(type);
    const isRequired = ["ktp", "kk", "foto"].includes(type);
    return (
      <div className="flex flex-col items-center p-3 border border-border rounded-lg bg-card">
        <p className="text-xs font-medium text-foreground mb-1">{label}</p>
        {isRequired && (
          <Badge variant="outline" className="text-[8px] mb-2">Wajib</Badge>
        )}
        {doc
          ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded flex items-center justify-center">
                <Check className="w-5 h-5 text-success" />
              </div>
              <p className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                {doc.fileName}
              </p>
              {doc.fileUrl && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => setPreviewDoc(doc)}
                >
                  <Eye className="w-3 h-3" />
                </Button>
              )}
            </div>
          )
          : (
            <label className="cursor-pointer flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded flex items-center justify-center">
                <Upload className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-[10px] ">Upload</span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => handleFileUpload(type, e)}
              />
            </label>
          )}
      </div>
    );
  };

  if (loading) return <ProfileSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5 max-w-xl"
    >
      <h1 className="text-lg font-semibold text-foreground">Profil Saya</h1>

      {/* Header with completion */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative group">
              <Avatar className="w-16 h-16">
                {user?.avatar && (
                  <AvatarImage src={user.avatar} alt={user.name} />
                )}
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {uploadingAvatar
                  ? <span className="text-white text-[10px]">...</span>
                  : <Camera className="w-5 h-5 text-white" />}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelect}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-foreground">
                {user?.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {user?.position} • {user?.department}
              </p>
              <div className="grid grid-cols-1 gap-3 text-xs">
                <div className="flex  gap-2 text-muted-foreground">
                  <span>{user?.email}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Profile;
