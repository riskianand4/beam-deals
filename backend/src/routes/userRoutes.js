const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/userController");
const { auth, adminOnly } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.get("/", auth, ctrl.getAll);
router.get("/reviewers", auth, ctrl.getReviewers);
router.get("/approvers", auth, ctrl.getApprovers);
router.post("/avatar", auth, ctrl.prepareAvatarUpload, upload.single("avatar"), ctrl.uploadAvatar);
router.get("/:id", auth, ctrl.getById);
router.post("/", auth, adminOnly, ctrl.create);
router.put("/profile", auth, ctrl.updateProfile);
router.put("/:id", auth, adminOnly, ctrl.update);
router.delete("/:id", auth, adminOnly, ctrl.remove);

// Admin: upload avatar for a specific user
router.post("/:id/avatar", auth, adminOnly, ctrl.prepareAdminAvatarUpload, upload.single("avatar"), ctrl.uploadAvatarForUser);

module.exports = router;
