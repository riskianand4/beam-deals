const settingsService = require("../services/settingsService");

exports.getMenuSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getMenuSettings();
    res.json(settings);
  } catch (err) {
    next(err);
  }
};

exports.updateMenuSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.updateMenuSettings(req.body);
    res.json(settings);
  } catch (err) {
    next(err);
  }
};

exports.getPositionAccess = async (req, res, next) => {
  try {
    const data = await settingsService.getPositionAccess();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.updatePositionAccess = async (req, res, next) => {
  try {
    const { position, menus } = req.body;
    if (!position) return res.status(400).json({ error: "Position is required" });
    const result = await settingsService.updatePositionAccess(position, menus);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getPositions = async (req, res, next) => {
  try {
    const positions = await settingsService.getPositions();
    res.json(positions);
  } catch (err) {
    next(err);
  }
};

exports.createPosition = async (req, res, next) => {
  try {
    const { position, description } = req.body;
    if (!position || !position.trim()) return res.status(400).json({ error: "Nama jabatan wajib diisi" });
    const result = await settingsService.createPosition(position.trim(), description?.trim() || "");
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.deletePosition = async (req, res, next) => {
  try {
    const result = await settingsService.deletePosition(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getNotificationChannels = async (req, res, next) => {
  try {
    const data = await settingsService.getNotificationChannels();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.updateNotificationChannels = async (req, res, next) => {
  try {
    const data = await settingsService.updateNotificationChannels(req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
