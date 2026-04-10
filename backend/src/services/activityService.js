const Activity = require("../models/Activity");

exports.getAll = async (query = {}) => {
  const filter = {};
  if (query.userId) filter.userId = query.userId;
  return Activity.find(filter).sort({ timestamp: -1 }).limit(query.limit || 20);
};

exports.create = async (data) => {
  return Activity.create(data);
};
