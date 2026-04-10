const explorerService = require("../services/explorerService");
const User = require("../models/User");

exports.prepareUpload = async (req, res, next) => {
  try {
    req.uploadContext = "explorer";
    if (req.userId) {
      const user = await User.findById(req.userId);
      if (user) req.uploadUserMeta = { name: user.name };
    }
    next();
  } catch (err) { next(err); }
};

exports.listContents = async (req, res, next) => {
  try {
    const parentId = req.query.parentId || null;
    const result = await explorerService.listContents(parentId, req.userId, req.user.role);
    const breadcrumb = parentId ? await explorerService.getBreadcrumb(parentId) : [];
    res.json({ ...result, breadcrumb });
  } catch (err) { next(err); }
};

exports.createFolder = async (req, res, next) => {
  try {
    const data = {
      name: req.body.name,
      parentId: req.body.parentId || null,
      ownerId: req.body.ownerId || req.userId,
      accessType: req.body.accessType || "all",
      accessIds: req.body.accessIds || [],
      createdBy: req.userId,
    };
    res.status(201).json(await explorerService.createFolder(data));
  } catch (err) { next(err); }
};

exports.updateFolder = async (req, res, next) => {
  try {
    res.json(await explorerService.updateFolder(req.params.id, req.body));
  } catch (err) { next(err); }
};

exports.deleteFolder = async (req, res, next) => {
  try {
    res.json(await explorerService.deleteFolder(req.params.id, req.userId, req.user.role));
  } catch (err) { next(err); }
};

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) throw Object.assign(new Error("File diperlukan"), { statusCode: 400 });
    const data = {
      name: req.file.originalname,
      folderId: req.body.folderId || null,
      fileUrl: "/uploads" + req.file.path.split("uploads")[1],
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      ownerId: req.userId,
      createdBy: req.userId,
    };
    res.status(201).json(await explorerService.uploadFile(data));
  } catch (err) { next(err); }
};

exports.renameFile = async (req, res, next) => {
  try {
    res.json(await explorerService.renameFile(req.params.id, req.body.name));
  } catch (err) { next(err); }
};

exports.deleteFile = async (req, res, next) => {
  try {
    res.json(await explorerService.deleteFile(req.params.id, req.userId, req.user.role));
  } catch (err) { next(err); }
};

exports.shareFolder = async (req, res, next) => {
  try {
    const { accessType, accessIds, accessPermissions } = req.body;
    res.json(await explorerService.shareFolder(req.params.id, accessType, accessIds, accessPermissions));
  } catch (err) { next(err); }
};

exports.zipFolder = async (req, res, next) => {
  try {
    const result = await explorerService.zipFolder(req.params.id);
    res.download(result.path, result.name, (err) => {
      try { require("fs").unlinkSync(result.path); } catch (e) {}
    });
  } catch (err) { next(err); }
};

exports.linkToPartner = async (req, res, next) => {
  try {
    res.json(await explorerService.linkFolderToPartner(req.params.id, req.body.partnerId));
  } catch (err) { next(err); }
};

exports.getLinkedFiles = async (req, res, next) => {
  try {
    res.json(await explorerService.getLinkedFiles(req.params.partnerId));
  } catch (err) { next(err); }
};

exports.moveItem = async (req, res, next) => {
  try {
    const { type, targetId } = req.body;
    if (type === "folder") {
      res.json(await explorerService.moveFolder(req.params.id, targetId));
    } else {
      res.json(await explorerService.moveFile(req.params.id, targetId));
    }
  } catch (err) { next(err); }
};

exports.copyFile = async (req, res, next) => {
  try {
    res.json(await explorerService.copyFile(req.params.id, req.body.targetFolderId));
  } catch (err) { next(err); }
};

exports.togglePin = async (req, res, next) => {
  try {
    res.json(await explorerService.togglePin(req.params.type, req.params.id));
  } catch (err) { next(err); }
};

exports.toggleLock = async (req, res, next) => {
  try {
    res.json(await explorerService.toggleLock(req.params.type, req.params.id));
  } catch (err) { next(err); }
};
