import { User, UserDocument } from "@/types";

// Required fields for profile completion
const REQUIRED_PERSONAL_FIELDS: (keyof User)[] = [
  "name", "email", "phone", "address",
  "birthPlace", "birthDate", "gender"
];

const REQUIRED_DOCUMENT_TYPES = ["ktp", "kk", "foto"];

export const calculateProfileCompletion = (
  user: User,
  documents: UserDocument[]
): number => {
  let filledCount = 0;
  const totalRequired = REQUIRED_PERSONAL_FIELDS.length + REQUIRED_DOCUMENT_TYPES.length;

  // Check personal fields
  REQUIRED_PERSONAL_FIELDS.forEach((field) => {
    const value = user[field];
    if (value && String(value).trim() !== "") {
      filledCount++;
    }
  });

  // Check documents
  const userDocs = documents.filter((d) => d.userId === user.id);
  REQUIRED_DOCUMENT_TYPES.forEach((type) => {
    if (userDocs.some((d) => d.type === type)) {
      filledCount++;
    }
  });

  return Math.round((filledCount / totalRequired) * 100);
};

export const getCompletionColor = (percentage: number): string => {
  if (percentage >= 80) return "text-success";
  if (percentage >= 50) return "text-warning";
  return "text-destructive";
};

export const getCompletionBgColor = (percentage: number): string => {
  if (percentage >= 80) return "bg-success";
  if (percentage >= 50) return "bg-warning";
  return "bg-destructive";
};

export const getMissingFields = (
  user: User,
  documents: UserDocument[]
): string[] => {
  const missing: string[] = [];
  const fieldLabels: Record<string, string> = {
    name: "Nama Lengkap",
    email: "Email",
    phone: "No. Telepon",
    address: "Alamat",
    birthPlace: "Tempat Lahir",
    birthDate: "Tanggal Lahir",
    gender: "Jenis Kelamin",
  };

  REQUIRED_PERSONAL_FIELDS.forEach((field) => {
    const value = user[field];
    if (!value || String(value).trim() === "") {
      missing.push(fieldLabels[field] || field);
    }
  });

  const userDocs = documents.filter((d) => d.userId === user.id);
  const docLabels: Record<string, string> = {
    ktp: "KTP",
    kk: "Kartu Keluarga",
    foto: "Foto Formal",
  };

  REQUIRED_DOCUMENT_TYPES.forEach((type) => {
    if (!userDocs.some((d) => d.type === type)) {
      missing.push(docLabels[type] || type);
    }
  });

  return missing;
};

export const formatDocumentType = (type: string): string => {
  const labels: Record<string, string> = {
    ktp: "KTP",
    kk: "Kartu Keluarga (KK)",
    sim: "SIM",
    ijazah: "Ijazah",
    foto: "Foto Formal",
    other: "Lainnya",
  };
  return labels[type] || type;
};
