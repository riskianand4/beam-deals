const ExplorerFolder = require("../models/ExplorerFolder");
const ExplorerFile = require("../models/ExplorerFile");
const User = require("../models/User");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const config = require("../config/env");
const notificationService = require("./notificationService");

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const canDelete = (item, userRole) => {
  if (userRole === "admin") return true;
  const age = Date.now() - new Date(item.createdAt).getTime();
  return age < THREE_DAYS_MS;
};

// Check access
const hasAccess = async (folder, userId, userRole, userTeamIds = []) => {
  if (userRole === "admin") return true;
  if (!folder) return true; // root
  if (folder.accessType === "all") return true;
  if (folder.ownerId === userId || folder.createdBy === userId) return true;
  if (folder.accessType === "specific" && folder.accessIds.includes(userId)) return true;
  if (folder.accessType === "team" && folder.accessIds.some(id => userTeamIds.includes(id))) return true;
  return false;
};

exports.listContents = async (parentId, userId, userRole) => {
  const filter = { parentId: parentId || null };
  
  let folders = await ExplorerFolder.find(filter).sort({ name: 1 });
  const files = await ExplorerFile.find(filter ? { folderId: parentId || null } : {}).sort({ name: 1 });
  
  // Filter by access for non-admin
  if (userRole !== "admin") {
    folders = folders.filter(f => {
      if (f.accessType === "all") return true;
      if (f.ownerId === userId || f.createdBy === userId) return true;
      if (f.accessType === "specific" && f.accessIds.includes(userId)) return true;
      return false;
    });
  }
  
  return { folders, files };
};

exports.createFolder = async (data) => {
  return ExplorerFolder.create(data);
};

exports.updateFolder = async (id, data) => {
  const folder = await ExplorerFolder.findById(id);
  if (!folder) throw Object.assign(new Error("Folder tidak ditemukan"), { statusCode: 404 });
  Object.assign(folder, data);
  await folder.save();
  return folder;
};

exports.deleteFolder = async (id, userId, userRole) => {
  const folder = await ExplorerFolder.findById(id);
  if (!folder) throw Object.assign(new Error("Folder tidak ditemukan"), { statusCode: 404 });
  
  if (folder.pinned) {
    throw Object.assign(new Error("Folder sedang disematkan (favorite). Lepas pin terlebih dahulu sebelum menghapus."), { statusCode: 403 });
  }
  if (folder.linkedPartnerId) {
    throw Object.assign(new Error("Folder terhubung dengan mitra. Putuskan sambungan terlebih dahulu sebelum menghapus."), { statusCode: 403 });
  }
  
  if (!canDelete(folder, userRole)) {
    throw Object.assign(new Error("Folder sudah lebih dari 3 hari, hanya admin yang bisa menghapus"), { statusCode: 403 });
  }
  
  // Cascade delete subfolders and files
  const deleteRecursive = async (folderId) => {
    const subFolders = await ExplorerFolder.find({ parentId: folderId });
    for (const sf of subFolders) {
      await deleteRecursive(sf._id.toString());
    }
    await ExplorerFile.deleteMany({ folderId });
    await ExplorerFolder.findByIdAndDelete(folderId);
  };
  
  await deleteRecursive(id);
  return { message: "Folder berhasil dihapus" };
};

exports.uploadFile = async (data, uploaderUser) => {
  const file = await ExplorerFile.create(data);

  // Notify users who have access to this folder (excluding the uploader)
  try {
    const uploaderId = uploaderUser?.id || uploaderUser?._id?.toString() || data.createdBy;
    let recipientIds = [];

    if (data.folderId) {
      const folder = await ExplorerFolder.findById(data.folderId);
      if (folder) {
        if (folder.accessType === "specific" && folder.accessIds?.length > 0) {
          recipientIds = folder.accessIds.filter(id => id !== uploaderId);
        } else if (folder.accessType === "team" && folder.accessIds?.length > 0) {
          const TeamGroup = require("../models/TeamGroup");
          const teams = await TeamGroup.find({ _id: { $in: folder.accessIds } });
          const memberIds = new Set();
          for (const t of teams) {
            (t.memberIds || []).forEach(id => memberIds.add(id));
            if (t.leaderId) memberIds.add(t.leaderId);
          }
          recipientIds = [...memberIds].filter(id => id !== uploaderId);
        }
      }
    }

    if (recipientIds.length > 0) {
      await notificationService.createForUsers(recipientIds, {
        title: "File Baru di Explorer",
        message: `${uploaderUser?.name || "Seseorang"} mengunggah file: ${file.name}`,
        type: "info",
        category: "explorer",
        sender: uploaderUser?.name || "",
        title: file.name,
      });
    }
  } catch (err) {
    console.error("[Explorer] Failed to notify on upload:", err);
  }

  return file;
};

exports.renameFile = async (id, name) => {
  const file = await ExplorerFile.findById(id);
  if (!file) throw Object.assign(new Error("File tidak ditemukan"), { statusCode: 404 });
  file.name = name;
  await file.save();
  return file;
};

exports.deleteFile = async (id, userId, userRole) => {
  const file = await ExplorerFile.findById(id);
  if (!file) throw Object.assign(new Error("File tidak ditemukan"), { statusCode: 404 });
  
  if (file.pinned) {
    throw Object.assign(new Error("File sedang disematkan (favorite). Lepas pin terlebih dahulu sebelum menghapus."), { statusCode: 403 });
  }
  
  if (!canDelete(file, userRole)) {
    throw Object.assign(new Error("File sudah lebih dari 3 hari, hanya admin yang bisa menghapus"), { statusCode: 403 });
  }
  
  // Try to delete physical file
  try {
    const baseDir = path.join(__dirname, "../../", config.uploadDir);
    const filePath = path.join(baseDir, file.fileUrl.replace(/^\/uploads\/?/, ""));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) { /* ignore */ }
  
  await ExplorerFile.findByIdAndDelete(id);
  return { message: "File berhasil dihapus" };
};

exports.shareFolder = async (id, accessType, accessIds, accessPermissions, sharerUser) => {
  const folder = await ExplorerFolder.findById(id);
  if (!folder) throw Object.assign(new Error("Folder tidak ditemukan"), { statusCode: 404 });

  const prevIds = folder.accessIds || [];
  folder.accessType = accessType;
  folder.accessIds = accessIds || [];
  folder.accessPermissions = accessPermissions || [];
  await folder.save();

  // Notify newly added users
  try {
    const sharerId = sharerUser?.id || sharerUser?._id?.toString();
    let newRecipientIds = [];

    if (accessType === "specific") {
      newRecipientIds = (accessIds || []).filter(id => !prevIds.includes(id) && id !== sharerId);
    } else if (accessType === "team") {
      const TeamGroup = require("../models/TeamGroup");
      const teams = await TeamGroup.find({ _id: { $in: accessIds || [] } });
      const memberIds = new Set();
      for (const t of teams) {
        (t.memberIds || []).forEach(id => memberIds.add(id));
        if (t.leaderId) memberIds.add(t.leaderId);
      }
      newRecipientIds = [...memberIds].filter(id => id !== sharerId);
    }

    if (newRecipientIds.length > 0) {
      await notificationService.createForUsers(newRecipientIds, {
        title: "Folder Dibagikan",
        message: `${sharerUser?.name || "Admin"} membagikan folder "${folder.name}" kepada Anda`,
        type: "info",
        category: "explorer",
        sender: sharerUser?.name || "",
      });
    }
  } catch (err) {
    console.error("[Explorer] Failed to notify on share:", err);
  }

  return folder;
};

exports.zipFolder = async (id) => {
  const folder = await ExplorerFolder.findById(id);
  if (!folder) throw Object.assign(new Error("Folder tidak ditemukan"), { statusCode: 404 });
  
  const baseDir = path.join(__dirname, "../../", config.uploadDir);
  const tmpPath = path.join("/tmp", `explorer-${id}-${Date.now()}.zip`);
  
  const output = fs.createWriteStream(tmpPath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  
  return new Promise((resolve, reject) => {
    output.on("close", () => resolve({ path: tmpPath, name: folder.name + ".zip" }));
    archive.on("error", reject);
    archive.pipe(output);
    
    const addFilesRecursive = async (folderId, prefix) => {
      const files = await ExplorerFile.find({ folderId });
      for (const f of files) {
        const filePath = path.join(baseDir, f.fileUrl.replace(/^\/uploads\/?/, ""));
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: prefix + f.name });
        }
      }
      const subFolders = await ExplorerFolder.find({ parentId: folderId });
      for (const sf of subFolders) {
        await addFilesRecursive(sf._id.toString(), prefix + sf.name + "/");
      }
    };
    
    addFilesRecursive(id, "").then(() => archive.finalize()).catch(reject);
  });
};

exports.getFolder = async (id) => {
  return ExplorerFolder.findById(id);
};

exports.getBreadcrumb = async (folderId) => {
  const crumbs = [];
  let currentId = folderId;
  while (currentId) {
    const folder = await ExplorerFolder.findById(currentId);
    if (!folder) break;
    crumbs.unshift({ id: folder._id.toString(), name: folder.name });
    currentId = folder.parentId;
  }
  return crumbs;
};

// Link folder to partner
exports.linkFolderToPartner = async (folderId, partnerId) => {
  const folder = await ExplorerFolder.findById(folderId);
  if (!folder) throw Object.assign(new Error("Folder tidak ditemukan"), { statusCode: 404 });
  folder.linkedPartnerId = partnerId || null;
  await folder.save();
  return folder;
};

// Get files linked to a partner (from linked folders)
exports.getLinkedFiles = async (partnerId) => {
  const folders = await ExplorerFolder.find({ linkedPartnerId: partnerId });
  const allFiles = [];
  for (const folder of folders) {
    const files = await ExplorerFile.find({ folderId: folder._id.toString() });
    allFiles.push(...files.map(f => ({ ...f.toJSON(), folderName: folder.name })));
  }
  return allFiles;
};

// Move file to another folder
exports.moveFile = async (fileId, targetFolderId) => {
  const file = await ExplorerFile.findById(fileId);
  if (!file) throw Object.assign(new Error("File tidak ditemukan"), { statusCode: 404 });
  if (file.locked) throw Object.assign(new Error("File terkunci"), { statusCode: 403 });
  file.folderId = targetFolderId || null;
  await file.save();
  return file;
};

// Move folder to another parent
exports.moveFolder = async (folderId, targetParentId) => {
  const folder = await ExplorerFolder.findById(folderId);
  if (!folder) throw Object.assign(new Error("Folder tidak ditemukan"), { statusCode: 404 });
  if (folder.locked) throw Object.assign(new Error("Folder terkunci"), { statusCode: 403 });
  if (targetParentId === folderId) throw Object.assign(new Error("Tidak bisa pindah ke diri sendiri"), { statusCode: 400 });
  folder.parentId = targetParentId || null;
  await folder.save();
  return folder;
};

// Copy file
exports.copyFile = async (fileId, targetFolderId) => {
  const file = await ExplorerFile.findById(fileId);
  if (!file) throw Object.assign(new Error("File tidak ditemukan"), { statusCode: 404 });
  const copy = await ExplorerFile.create({
    name: file.name,
    folderId: targetFolderId || null,
    fileUrl: file.fileUrl,
    fileSize: file.fileSize,
    mimeType: file.mimeType,
    ownerId: file.ownerId,
    createdBy: file.createdBy,
  });
  return copy;
};

// Toggle pin
exports.togglePin = async (type, id) => {
  const Model = type === "folder" ? ExplorerFolder : ExplorerFile;
  const item = await Model.findById(id);
  if (!item) throw Object.assign(new Error("Item tidak ditemukan"), { statusCode: 404 });
  item.pinned = !item.pinned;
  await item.save();
  return item;
};

// Toggle lock
exports.toggleLock = async (type, id) => {
  const Model = type === "folder" ? ExplorerFolder : ExplorerFile;
  const item = await Model.findById(id);
  if (!item) throw Object.assign(new Error("Item tidak ditemukan"), { statusCode: 404 });
  item.locked = !item.locked;
  await item.save();
  return item;
};
