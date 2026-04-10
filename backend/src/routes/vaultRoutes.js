const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/vaultController");
const { auth, adminOrAccess } = require("../middleware/auth");

// Company links
router.get("/links", auth, ctrl.getCompanyLinks);
router.post("/links", auth, adminOrAccess("vault"), ctrl.createCompanyLink);
router.put("/links/:id", auth, adminOrAccess("vault"), ctrl.updateCompanyLink);
router.delete("/links/:id", auth, adminOrAccess("vault"), ctrl.deleteCompanyLink);

// Personal credentials
router.get("/credentials", auth, ctrl.getCredentials);
router.post("/credentials", auth, ctrl.createCredential);
router.put("/credentials/:id", auth, ctrl.updateCredential);
router.delete("/credentials/:id", auth, ctrl.deleteCredential);

module.exports = router;
