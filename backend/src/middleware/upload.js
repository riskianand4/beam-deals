const multer = require("multer");
const path = require("path");
const fs = require("fs");
const config = require("../config/env");

const baseUploadDir = path.join(__dirname, "../../", config.uploadDir);
if (!fs.existsSync(baseUploadDir)) fs.mkdirSync(baseUploadDir, { recursive: true });

// Helper: sanitize folder name
const sanitize = (str) => (str || "unknown").replace(/[^a-zA-Z0-9_\-. ]/g, "_").trim();

// Dynamic storage - determines path based on request context
const dynamicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let destDir = baseUploadDir;

    // Task attachments go to uploads/Tugas/
    if (req.baseUrl?.includes("/tasks") || req.uploadContext === "task") {
      destDir = path.join(baseUploadDir, "Tugas");
    }
    // User files go to uploads/{position}/{username}/
    else if (req.uploadContext === "user" && req.uploadUserMeta) {
      const position = sanitize(req.uploadUserMeta.position);
      const name = sanitize(req.uploadUserMeta.name);
      destDir = path.join(baseUploadDir, position, name);
    }

    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    // For avatar uploads, use fixed name
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
  const allowed = /jpeg|jpg|png|gif|pdf|doc|docx/;
  const extname = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowed.test(file.mimetype);
  if (extname && mimetype) return cb(null, true);
  cb(new Error("Tipe file tidak didukung"));
};

const upload = multer({
  storage: dynamicStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = upload;
