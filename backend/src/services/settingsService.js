const MenuSetting = require("../models/MenuSetting");
const PositionAccess = require("../models/PositionAccess");
const NotificationChannel = require("../models/NotificationChannel");

exports.getMenuSettings = async () => {
  let settings = await MenuSetting.findOne();
  if (!settings) {
    settings = await MenuSetting.create({});
  }
  const obj = settings.toObject();
  delete obj._id;
  delete obj.__v;
  delete obj.createdAt;
  delete obj.updatedAt;
  return obj;
};

exports.updateMenuSettings = async (data) => {
  let settings = await MenuSetting.findOne();
  if (!settings) {
    settings = await MenuSetting.create(data);
  } else {
    Object.assign(settings, data);
    await settings.save();
  }
  const obj = settings.toObject();
  delete obj._id;
  delete obj.__v;
  delete obj.createdAt;
  delete obj.updatedAt;
  return obj;
};

exports.getPositionAccess = async () => {
  const docs = await PositionAccess.find();
  const result = {};
  for (const doc of docs) {
    result[doc.position] = doc.menus.toObject ? doc.menus.toObject() : doc.menus;
  }
  return result;
};

exports.updatePositionAccess = async (position, menus) => {
  let doc = await PositionAccess.findOne({ position });
  if (!doc) {
    doc = await PositionAccess.create({ position, menus });
  } else {
    doc.menus = menus;
    await doc.save();
  }
  return { position: doc.position, menus: doc.menus };
};

// Dynamic positions CRUD
exports.getPositions = async () => {
  const docs = await PositionAccess.find().sort({ position: 1 });
  return docs.map((d) => ({
    id: d._id.toString(),
    position: d.position,
    description: d.description || "",
    menus: d.menus.toObject ? d.menus.toObject() : d.menus,
  }));
};

exports.createPosition = async (position, description = "") => {
  const existing = await PositionAccess.findOne({ position: { $regex: new RegExp(`^${position}$`, "i") } });
  if (existing) {
    throw Object.assign(new Error("Jabatan sudah ada"), { statusCode: 400 });
  }
  const doc = await PositionAccess.create({ position, description });
  return {
    id: doc._id.toString(),
    position: doc.position,
    description: doc.description || "",
    menus: doc.menus.toObject ? doc.menus.toObject() : doc.menus,
  };
};

exports.deletePosition = async (id) => {
  const doc = await PositionAccess.findByIdAndDelete(id);
  if (!doc) throw Object.assign(new Error("Jabatan tidak ditemukan"), { statusCode: 404 });
  return { message: "Jabatan berhasil dihapus" };
};

// Notification Channels
exports.getNotificationChannels = async () => {
  let doc = await NotificationChannel.findOne();
  if (!doc) doc = await NotificationChannel.create({});
  return doc.toObject();
};

exports.updateNotificationChannels = async (data) => {
  let doc = await NotificationChannel.findOne();
  if (!doc) {
    doc = await NotificationChannel.create(data);
  } else {
    if (data.email) Object.assign(doc.email, data.email);
    if (data.whatsapp) Object.assign(doc.whatsapp, data.whatsapp);
    if (data.categories) {
      for (const [key, val] of Object.entries(data.categories)) {
        if (doc.categories[key]) Object.assign(doc.categories[key], val);
      }
    }
    await doc.save();
  }
  return doc.toObject();
};
