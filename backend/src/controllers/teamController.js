const teamService = require("../services/teamService");

exports.getAll = async (req, res, next) => {
  try { res.json(await teamService.getAll()); } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try { res.json(await teamService.getById(req.params.id)); } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try { res.status(201).json(await teamService.create(req.body)); } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try { res.json(await teamService.update(req.params.id, req.body)); } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try { res.json(await teamService.remove(req.params.id)); } catch (err) { next(err); }
};
