const Partner = require("../models/Partner");
const PartnerProject = require("../models/PartnerProject");
const PartnerReport = require("../models/PartnerReport");
const PartnerContract = require("../models/PartnerContract");

// Partners
exports.getPartners = async () => Partner.find().sort({ createdAt: -1 });
exports.getPartner = async (id) => {
  const p = await Partner.findById(id);
  if (!p) throw Object.assign(new Error("Mitra tidak ditemukan"), { statusCode: 404 });
  return p;
};
exports.createPartner = async (data) => Partner.create(data);
exports.updatePartner = async (id, data) => {
  const p = await Partner.findByIdAndUpdate(id, data, { new: true });
  if (!p) throw Object.assign(new Error("Mitra tidak ditemukan"), { statusCode: 404 });
  return p;
};
exports.deletePartner = async (id) => {
  await Partner.findByIdAndDelete(id);
  return { message: "Mitra berhasil dihapus" };
};

// Projects
exports.getProjects = async (query = {}) => {
  const filter = {};
  if (query.partnerId) filter.partnerId = query.partnerId;
  return PartnerProject.find(filter).sort({ createdAt: -1 });
};
exports.createProject = async (data) => PartnerProject.create(data);
exports.updateProject = async (id, data) => {
  const p = await PartnerProject.findByIdAndUpdate(id, data, { new: true });
  if (!p) throw Object.assign(new Error("Proyek tidak ditemukan"), { statusCode: 404 });
  return p;
};
exports.deleteProject = async (id) => {
  await PartnerProject.findByIdAndDelete(id);
  return { message: "Proyek berhasil dihapus" };
};

// Reports
exports.getReports = async (query = {}) => {
  const filter = {};
  if (query.projectId) filter.projectId = query.projectId;
  if (query.partnerId) filter.partnerId = query.partnerId;
  return PartnerReport.find(filter).sort({ createdAt: -1 });
};
exports.createReport = async (data) => PartnerReport.create(data);
exports.deleteReport = async (id) => {
  await PartnerReport.findByIdAndDelete(id);
  return { message: "Laporan berhasil dihapus" };
};

// Contracts
exports.getContracts = async (query = {}) => {
  const filter = {};
  if (query.partnerId) filter.partnerId = query.partnerId;
  return PartnerContract.find(filter).sort({ createdAt: -1 });
};
exports.createContract = async (data) => PartnerContract.create(data);
exports.updateContract = async (id, data) => {
  const c = await PartnerContract.findByIdAndUpdate(id, data, { new: true });
  if (!c) throw Object.assign(new Error("Kontrak tidak ditemukan"), { statusCode: 404 });
  return c;
};
exports.deleteContract = async (id) => {
  await PartnerContract.findByIdAndDelete(id);
  return { message: "Kontrak berhasil dihapus" };
};
