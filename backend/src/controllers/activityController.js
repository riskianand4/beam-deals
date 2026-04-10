const activityService = require("../services/activityService");

exports.getAll = async (req, res, next) => {
  try { res.json(await activityService.getAll(req.query)); } catch (err) { next(err); }
};
