const svc = require("../services/partnerService");

exports.getPartners = async (req, res, next) => {
  try { res.json(await svc.getPartners()); } catch (err) { next(err); }
};
exports.getPartner = async (req, res, next) => {
  try { res.json(await svc.getPartner(req.params.id)); } catch (err) { next(err); }
};
exports.createPartner = async (req, res, next) => {
  try { res.status(201).json(await svc.createPartner(req.body)); } catch (err) { next(err); }
};
exports.updatePartner = async (req, res, next) => {
  try { res.json(await svc.updatePartner(req.params.id, req.body)); } catch (err) { next(err); }
};
exports.deletePartner = async (req, res, next) => {
  try { res.json(await svc.deletePartner(req.params.id)); } catch (err) { next(err); }
};

exports.getProjects = async (req, res, next) => {
  try { res.json(await svc.getProjects(req.query)); } catch (err) { next(err); }
};
exports.createProject = async (req, res, next) => {
  try { res.status(201).json(await svc.createProject(req.body)); } catch (err) { next(err); }
};
exports.updateProject = async (req, res, next) => {
  try { res.json(await svc.updateProject(req.params.id, req.body)); } catch (err) { next(err); }
};
exports.deleteProject = async (req, res, next) => {
  try { res.json(await svc.deleteProject(req.params.id)); } catch (err) { next(err); }
};

exports.getReports = async (req, res, next) => {
  try { res.json(await svc.getReports(req.query)); } catch (err) { next(err); }
};
exports.createReport = async (req, res, next) => {
  try { res.status(201).json(await svc.createReport(req.body)); } catch (err) { next(err); }
};
exports.deleteReport = async (req, res, next) => {
  try { res.json(await svc.deleteReport(req.params.id)); } catch (err) { next(err); }
};

exports.getContracts = async (req, res, next) => {
  try { res.json(await svc.getContracts(req.query)); } catch (err) { next(err); }
};
exports.createContract = async (req, res, next) => {
  try { res.status(201).json(await svc.createContract(req.body)); } catch (err) { next(err); }
};
exports.updateContract = async (req, res, next) => {
  try { res.json(await svc.updateContract(req.params.id, req.body)); } catch (err) { next(err); }
};
exports.deleteContract = async (req, res, next) => {
  try { res.json(await svc.deleteContract(req.params.id)); } catch (err) { next(err); }
};
