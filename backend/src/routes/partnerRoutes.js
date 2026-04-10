const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/partnerController");
const { auth, adminOrAccess } = require("../middleware/auth");

// Partners
router.get("/", auth, ctrl.getPartners);
router.get("/:id", auth, ctrl.getPartner);
router.post("/", auth, adminOrAccess("mitra"), ctrl.createPartner);
router.put("/:id", auth, adminOrAccess("mitra"), ctrl.updatePartner);
router.delete("/:id", auth, adminOrAccess("mitra"), ctrl.deletePartner);

// Projects
router.get("/projects/list", auth, ctrl.getProjects);
router.post("/projects", auth, adminOrAccess("mitra"), ctrl.createProject);
router.put("/projects/:id", auth, adminOrAccess("mitra"), ctrl.updateProject);
router.delete("/projects/:id", auth, adminOrAccess("mitra"), ctrl.deleteProject);

// Reports
router.get("/reports/list", auth, ctrl.getReports);
router.post("/reports", auth, adminOrAccess("mitra"), ctrl.createReport);
router.delete("/reports/:id", auth, adminOrAccess("mitra"), ctrl.deleteReport);

// Contracts
router.get("/contracts/list", auth, ctrl.getContracts);
router.post("/contracts", auth, adminOrAccess("mitra"), ctrl.createContract);
router.put("/contracts/:id", auth, adminOrAccess("mitra"), ctrl.updateContract);
router.delete("/contracts/:id", auth, adminOrAccess("mitra"), ctrl.deleteContract);

module.exports = router;
