const multer = require("multer");
const path = require("path");
const fs = require("fs");
const config = require("../config/env");

const baseUploadDir = path.join(__dirname, "../../", config.uploadDir);
if (!fs.existsSync(baseUploadDir)) fs.mkdirSync(baseUploadDir, { recursive: true });

const sanitize = (str) => (str || "unknown").replace(/[^a-zA-Z0-9_\-. ]/g, "_").trim();

const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const CONTEXT_FOLDERS = {
  payslip: "slip-gaji",
  approval: "pengajuan",
  task: "tugas",
  message: "ruang",
  note: "catatan",
  document: "dokumen",
  avatar: "profil",
  user: "dokumen",
  explorer: "explorer",
};

const dynamicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = MONTH_NAMES[now.getMonth()];
    const context = req.uploadContext || "general";
    const folder = CONTEXT_FOLDERS[context] || context;

    let destDir;

    if (context === "avatar") {
      // Avatars: uploads/{year}/{month}/{name}/profil/
      const name = sanitize(req.uploadUserMeta?.name || "unknown");
      destDir = path.join(baseUploadDir, year, month, name, "profil");
    } else if (req.uploadUserMeta?.name) {
      // Structured: uploads/{year}/{month}/{employee-name}/{category}/
      const name = sanitize(req.uploadUserMeta.name);
      destDir = path.join(baseUploadDir, year, month, name, folder);
    } else if (context === "task") {
      destDir = path.join(baseUploadDir, year, month, "tugas");
    } else {
      destDir = path.join(baseUploadDir, year, month, folder);
    }

    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    if (req.uploadContext === "avatar") {
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, "avatar" + ext);
    } else {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|svg|webp|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar|7z|mp4|mp3|wav|ogg|webm|json|xml|heic|heif|bmp|tiff|rtf|odt|ods|odp/;
  const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
  if (allowed.test(ext)) return cb(null, true);
  if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/") || file.mimetype.startsWith("audio/") || file.mimetype.startsWith("text/") || file.mimetype.includes("pdf") || file.mimetype.includes("document") || file.mimetype.includes("sheet") || file.mimetype.includes("presentation") || file.mimetype.includes("zip") || file.mimetype.includes("compressed") || file.mimetype.includes("octet-stream")) {
    return cb(null, true);
  }
  cb(new Error("Tipe file tidak didukung"));
};

const upload = multer({
  storage: dynamicStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = upload;
