const vaultService = require("../services/vaultService");

exports.getCompanyLinks = async (req, res, next) => {
  try { res.json(await vaultService.getCompanyLinks()); } catch (err) { next(err); }
};

exports.createCompanyLink = async (req, res, next) => {
  try { res.status(201).json(await vaultService.createCompanyLink(req.body)); } catch (err) { next(err); }
};

exports.updateCompanyLink = async (req, res, next) => {
  try { res.json(await vaultService.updateCompanyLink(req.params.id, req.body)); } catch (err) { next(err); }
};

exports.deleteCompanyLink = async (req, res, next) => {
  try { res.json(await vaultService.deleteCompanyLink(req.params.id)); } catch (err) { next(err); }
};

exports.getCredentials = async (req, res, next) => {
  try { res.json(await vaultService.getCredentials(req.userId)); } catch (err) { next(err); }
};

exports.createCredential = async (req, res, next) => {
  try { res.status(201).json(await vaultService.createCredential({ ...req.body, userId: req.userId })); } catch (err) { next(err); }
};

exports.updateCredential = async (req, res, next) => {
  try { res.json(await vaultService.updateCredential(req.params.id, req.body)); } catch (err) { next(err); }
};

exports.deleteCredential = async (req, res, next) => {
  try { res.json(await vaultService.deleteCredential(req.params.id)); } catch (err) { next(err); }
};
