const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/explorerController");
const { auth, adminOrAccess } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.get("/", auth, ctrl.listContents);
router.get("/partner-files/:partnerId", auth, ctrl.getLinkedFiles);
router.post("/folders", auth, adminOrAccess("explorer"), ctrl.createFolder);
router.put("/folders/:id", auth, adminOrAccess("explorer"), ctrl.updateFolder);
router.delete("/folders/:id", auth, adminOrAccess("explorer"), ctrl.deleteFolder);
router.post("/files", auth, adminOrAccess("explorer"), ctrl.prepareUpload, upload.single("file"), ctrl.uploadFile);
router.put("/files/:id", auth, adminOrAccess("explorer"), ctrl.renameFile);
router.delete("/files/:id", auth, adminOrAccess("explorer"), ctrl.deleteFile);
router.post("/folders/:id/zip", auth, ctrl.zipFolder);
router.post("/folders/:id/share", auth, adminOrAccess("explorer"), ctrl.shareFolder);
router.post("/folders/:id/link-partner", auth, adminOrAccess("explorer"), ctrl.linkToPartner);
router.put("/move/:id", auth, adminOrAccess("explorer"), ctrl.moveItem);
router.post("/copy/:id", auth, adminOrAccess("explorer"), ctrl.copyFile);
router.put("/pin/:type/:id", auth, adminOrAccess("explorer"), ctrl.togglePin);
router.put("/lock/:type/:id", auth, adminOrAccess("explorer"), ctrl.toggleLock);

module.exports = router;
