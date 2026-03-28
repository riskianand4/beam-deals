const contractService = require("../services/contractService");

exports.getByUserId = async (req, res, next) => {
  try { res.json(await contractService.getByUserId(req.params.userId)); } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try { res.status(201).json(await contractService.create(req.body)); } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try { res.json(await contractService.update(req.params.id, req.body)); } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try { res.json(await contractService.remove(req.params.id)); } catch (err) { next(err); }
};
